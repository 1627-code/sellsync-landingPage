/**
 * Sales/Transaction Management Controller
 * Handles creation and retrieval of sales transactions
 * Manages inventory updates and transaction tracking for stores
 */

import prisma from "../lib/prisma.js";

import logAction from "../utils/auditLog.js"
import PDFDocument from "pdfkit"
import { sendLowStockEmail } from "../services/email.service.js"
import { sendLowStockWhatsApp } from "../services/whatsapp.service.js"

/**
 * Create Sale Controller
 * Processes a new sale transaction with inventory management
 * Uses database transactions to ensure atomicity of sale and inventory updates
 * 
 * @desc    Create a new sale transaction
 * @route   POST /api/sales/create
 * @access  Private => Role: "CASHIER"
 * 
 * @param {Object} req - Express request object containing paymentMethod, items, and discount in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created transaction or error message
 */
const createSale = async(req, res) => {
    try {
        // Extract sale details from request body
        const { paymentMethod, items, discount } = req.body;

        // Validate that required fields are provided
        // Items array must have at least one item
        if(!paymentMethod || !items || !items.length) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Get cashier's assigned store from their account
        // Cashiers can only create sales for their assigned store
        const storeId = req.user.storeId;

        // Ensure cashier is assigned to a store
        if(!storeId) return res.status(404).json({ 
            message: "You are not assigned to a store!" 
        });

        const processedItems = [];
        let totalAmount = 0;

        // Validate all items and check inventory before creating transaction
        // This prevents partial transactions if any item is invalid
        for(const item of items) {
            // Find product by name within the cashier's store
            const product = await prisma.product.findFirst({
                where: { name: item.productName, storeId }
            });

            // Return error if product doesn't exist in this store
            if(!product) return res.status(404).json({
                message: `Product '${item.productName}' not found!`
            });

            // Get current inventory for this product
            const inventory = await prisma.inventory.findUnique({
                where: { productId: product.id }
            });

            // Return error if inventory record doesn't exist
            if(!inventory) return res.status(404).json({
                message: `Inventory not found for ${product.name}`
            });

            // Check if sufficient stock is available
            // Prevents overselling and negative inventory
            if(inventory.quantity < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.name}. Available: ${inventory.quantity}`
                });
            }

            // Calculate item subtotal and add to transaction total
            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            // Prepare item data for transaction creation
            processedItems.push({
                productId: product.id,
                quantity: item.quantity,
                price: product.price,
            });
        }

        // Apply discount to total amount
        // Discount reduces the final amount customer pays
        const discountAmount = discount || 0;
        totalAmount = totalAmount - discountAmount;

        // Create transaction and update inventory atomically
        // Database transaction ensures all-or-nothing operation
        const transaction = await prisma.$transaction(async (tx) => {
            // Create sale transaction with all items
            const newTransaction = await tx.transaction.create({
                data: {
                    storeId,
                    cashierId: req.user.id,  // Track which cashier processed the sale
                    totalAmount,
                    paymentMethod,
                    items: {
                        create: processedItems  // Create all transaction items
                    }
                },
                include: { items: true }  // Return transaction with items included
            });

            // Decrement inventory and check for low stock alerts
            // Updates happen in same transaction to maintain data consistency
            for(const item of processedItems) {
                // Get product details for notification
                const product = await tx.product.findUnique({
                    where: { id: item.productId }
                });

                // Decrement inventory for each sold product
                await tx.inventory.update({
                    where: { productId: item.productId },
                    data: { quantity: { decrement: item.quantity } }
                });

                // Check updated inventory level after sale
                const updatedInventory = await tx.inventory.findUnique({
                    where: { productId: item.productId }
                });

                // Create low stock notification if inventory falls below threshold
                // Alerts cashier to potential stockout situation
                if(updatedInventory.quantity <= updatedInventory.lowThreshold) {
                    const existingInsight = await tx.insight.findFirst({
                        where: {
                            storeId,
                            productId: item.productId,
                            type: "LOW_STOCK"
                        }
                    })
                    if(!existingInsight) {
                        await tx.insight.create({
                            data: {
                                storeId,
                                productId: item.productId,
                                type: "LOW_STOCK",
                                severity: updatedInventory.quantity === 0 ? "HIGH" : "MEDIUM",
                                title: "Low Stock Alert",
                                message: `${product.name} is running low. Only ${updatedInventory.quantity} left.`
                            }
                        })

                        // get all users in the store
                        const storeUsers = await tx.user.findMany({
                            where: { storeId }
                        })

                        // Get the store owner
                        const store = await tx.store.findUnique({
                            where: { id: storeId },
                            select: { ownerId: true }
                        })

                        // Combine both
                        const allUsers = [...storeUsers.map(u => u.id), store.ownerId]

                        await tx.notification.createMany({
                            data: allUsers.map(userId => ({
                                userId,
                                title: "Low Stock Alert",
                                message: `${product.name} is running low. Only ${updatedInventory.quantity} left.`
                            }))
                        })

                        // after notification.createMany
                        const owner = await tx.user.findUnique({
                            where: { id: store.ownerId },
                            select: { email: true }
                        })

                        try {
                            await sendLowStockEmail(owner.email, store.name, [{
                            productName: product.name,
                            quantity: updatedInventory.quantity,
                            lowThreshold: updatedInventory.lowThreshold
                        }])

                        const ownerWhatsApp = await tx.user.findUnique({
                            where: { id: store.ownerId },
                            select: { phone: true }
                        })

                        if(ownerWhatsApp.phone) {
                            await sendLowStockWhatsApp(
                                ownerWhatsApp.phone,
                                store.name,
                                [{ productName: product.name, quantity: updatedInventory.quantity }]
                            )
                        }
                        } catch (error) {
                            console.log("Message sending failed:", error.message)
                        }
                    }
                }
            }

            return newTransaction;
        });

        await logAction({
            userId: req.user.id,
            action: "CREATE_SALE",
            entity: "Transaction",
            entityId: transaction.id,
            storeId: storeId,
            details: JSON.stringify({ totalAmount, itemCount: items.length })
        })
        // Return success response with created transaction details
        res.status(201).json({
            success: true,
            message: "Sale created successfully!",
            transaction
        });

    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};

/**
 * Get All Transactions Controller
 * Retrieves all transactions for a specific store
 * Manager can view all sales across all cashiers in their store
 * 
 * @desc    Get all transactions for a store
 * @route   GET /api/transactions/:storeId
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of transactions or error message
 */
const getTransactions = async (req, res) => {
    try {
        let store;
        if (req.user.role === "CASHIER") {
            store = await prisma.store.findUnique({ where: { id: req.params.storeId } });
        } else {
            store = await prisma.store.findFirst({ where: { id: req.params.storeId, ownerId: req.user.id } });
        }
        if(!store) return res.status(404).json({ message: "Store not found" })

        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page - 1) * limit

        const total = await prisma.transaction.count({
            where: { storeId: store.id }
        })

        const transactions = await prisma.transaction.findMany({
            where: { storeId: store.id },
            include: { items: true },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit
        })

        res.status(200).json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            transactions
        })
    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error: error.message })
    }
}

/**
 * Get Transactions By Cashier Controller
 * Retrieves all transactions processed by a specific cashier
 * Useful for tracking individual cashier performance and accountability
 * 
 * @desc    Get all transactions by a specific cashier
 * @route   GET /api/transactions/:storeId/cashier/:id
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId and cashier id in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with cashier's transactions or error message
 */
const getTransactionsByCashier = async(req, res) => {
    try {
        // Retrieve the authenticated manager's store
        // Security: Ensure store belongs to requesting manager
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId,
                ownerId: req.user.id 
            }
        });

        // Ensure manager has a store
        if(!store) return res.status(404).json({ 
            message: "Store not found" 
        });

        // Find cashier by ID with security checks
        // Ensures cashier belongs to manager's store and has CASHIER role
        const cashier = await prisma.user.findUnique({
            where: { 
                id: req.params.id,
                storeId: store.id,  // Security: Prevent cross-store access
                role: "CASHIER"     // Security: Ensure user is actually a cashier
            }
        });

        // Return error if cashier not found or invalid
        if(!cashier) return res.status(404).json({ 
            message: "Cashier not found" 
        });
        
        // Get all transactions processed by this cashier in this store
        const transactions = await prisma.transaction.findMany({
            where: {
                storeId: store.id,
                cashierId: cashier.id,
            },
            include: { items: true }  // Include transaction items
        });

        // Return error if no transactions found for this cashier
        if(!transactions.length) return res.status(404).json({
            success: false,
            message: "No transactions found!"
        });

        // Return cashier's transactions
        res.status(200).json({ 
            success: true,
            transactions 
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};

/**
 * Get Transaction By ID Controller
 * Retrieves detailed information for a specific transaction
 * Includes all items and metadata for the sale
 * 
 * @desc    Get a single transaction by ID
 * @route   GET /api/transactions/:storeId/:id
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId and transaction id in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with transaction details or error message
 */
const getTransactionById = async(req, res) => {
    try {
        // Retrieve the authenticated manager's store
        // Security: Ensure store belongs to requesting manager
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId,
                ownerId: req.user.id 
            },
        });

        // Ensure manager has a store
        if(!store) return res.status(404).json({ 
            message: "Store not found" 
        });

        // Find specific transaction by ID within the store
        // Security: Ensures transaction belongs to manager's store
        const transaction = await prisma.transaction.findFirst({
            where: {
                storeId: store.id,
                id: req.params.id
            },
            include: { items: true }  // Include all transaction items
        });

        // Return error if transaction not found
        if(!transaction) return res.status(404).json({
            success: false,
            message: "Transaction not found!"
        });

        // Return transaction details
        res.status(200).json({
            success: true,
            transaction
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};

/**
 * Get Transactions By Date Range Controller
 * Retrieves all transactions within a specified date range
 * Useful for generating sales reports for specific periods
 * 
 * @desc    Get transactions within a date range
 * @route   GET /api/transactions/:storeId/date-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId in params and startDate/endDate in query
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with filtered transactions or error message
 */
const getTransactionsByDateRange = async(req, res) => {
    try {
        // Extract date range from query parameters
        const { startDate, endDate } = req.query;

        // Validate that both dates are provided
        if(!startDate || !endDate) return res.status(400).json({ 
            message: "startDate and endDate are required!" 
        });
        // Retrieve the authenticated manager's store
        // Security: Ensure store belongs to requesting manager
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId,
                ownerId: req.user.id 
            },
        });

        // Ensure manager has a store
        if(!store) return res.status(404).json({ 
            message: "Store not found" 
        });

        // Query transactions within the specified date range
        // startDate and endDate are provided as query parameters (e.g., ?startDate=2026-01-01&endDate=2026-01-31)
        const transactions = await prisma.transaction.findMany({
            where: {
                storeId: store.id,
                createdAt: {
                    gte: new Date(req.query.startDate),  // Greater than or equal to start date
                    lte: new Date(req.query.endDate)      // Less than or equal to end date
                }
            },
            include: { items: true } // Include transaction items for complete details
        });

        // Return error if no transactions found in date range
        if(!transactions.length) return res.status(404).json({
            success: false,
            message: "No transactions found!"
        });

        // Return filtered transactions
        res.status(200).json({
            success: true,
            transactions
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};

/**
 * Get Sales Summary Controller
 * Calculates aggregated sales data for a store within a date range
 * Provides total revenue and transaction count for reporting
 * 
 * @desc    Get sales summary (total revenue and transaction count)
 * @route   GET /api/transactions/:storeId/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId in params and date range in query
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with sales summary or error message
 */
const getSalesSummary = async(req, res) => {
    try {
        // Extract date range from query parameters
        const { startDate, endDate } = req.query;

        // Validate that both dates are provided
        if(!startDate || !endDate) return res.status(400).json({ 
            message: "startDate and endDate are required!" 
        });

        // Retrieve the authenticated manager's store
        // Security: Ensure store belongs to requesting manager
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId,
                ownerId: req.user.id 
            },
        });

        // Ensure manager has a store
        if(!store) return res.status(404).json({ 
            message: "Store not found" 
        });

        // Calculate aggregate sales data
        // _sum calculates total revenue, _count gives number of transactions
        const summary = await prisma.transaction.aggregate({
            where: { 
                storeId: store.id,
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            },
            _sum: { totalAmount: true },  // Total revenue for the period
            _count: { id: true }           // Total number of transactions
        });

        // Return sales summary
        res.status(200).json({
            success: true,
            summary: {
                totalRevenue: summary._sum.totalAmount || 0,
                transactionCount: summary._count.id || 0
            }
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};

const exportTransactionsPDF = async (req, res) => {
    try {
        const store = await prisma.store.findFirst({
            where: { id: req.params.storeId, ownerId: req.user.id }
        })
        if(!store) return res.status(404).json({ message: "Store not found" })

        const transactions = await prisma.transaction.findMany({
            where: { storeId: store.id },
            include: { 
                items: { include: { product: true } },
                cashier: { select: { name: true } }
            },
            orderBy: { createdAt: "desc" }
        })

        // Create PDF
        const doc = new PDFDocument({ margin: 50 })

        // Set response headers
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", `attachment; filename=${store.name}-transactions.pdf`)

        // Pipe PDF to response
        doc.pipe(res)

        // Header
        doc.fontSize(20).font("Helvetica-Bold").text(store.name, { align: "center" })
        doc.fontSize(12).font("Helvetica").text("Transaction Report", { align: "center" })
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: "center" })
        doc.moveDown(2)

        // Transactions
        let totalRevenue = 0

        for(const tx of transactions) {
            doc.fontSize(12).font("Helvetica-Bold")
                .text(`Transaction ID: ${tx.id}`)
            doc.fontSize(10).font("Helvetica")
                .text(`Date: ${new Date(tx.createdAt).toLocaleString()}`)
                .text(`Cashier: ${tx.cashier?.name || "Unknown"}`)
                .text(`Payment: ${tx.paymentMethod}`)
            
            doc.moveDown(0.5)
            doc.text("Items:")
            for(const item of tx.items) {
                doc.text(`  - ${item.product.name} x${item.quantity} @ N${item.price} = N${item.quantity * item.price}`)
            }

            doc.fontSize(11).font("Helvetica-Bold")
                .text(`Total: N${tx.totalAmount}`)
            
            totalRevenue += tx.totalAmount
            doc.moveDown(1)
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
            doc.moveDown(1)
        }

        // Summary
        doc.fontSize(14).font("Helvetica-Bold")
            .text(`Total Revenue: N${totalRevenue}`, { align: "right" })
            .text(`Total Transactions: ${transactions.length}`, { align: "right" })

        doc.end()

    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error: error.message })
    }
}
// Export all transaction controller functions for use in routes
export { createSale, getTransactions, getTransactionsByCashier, getTransactionById, getTransactionsByDateRange, getSalesSummary, exportTransactionsPDF };