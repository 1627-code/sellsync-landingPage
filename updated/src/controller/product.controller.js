/**
 * Product Management Controller
 * Handles CRUD operations for products and inventory within a store
 * Products are associated with stores and have inventory tracking
 */

import prisma from "../lib/prisma.js"
import logAction from "../utils/auditLog.js"

/**
 * Helper function to find a store by ID and owner
 * Ensures store belongs to the authenticated manager
 * 
 * @param {string} storeId - The store ID to find
 * @param {string} ownerId - The authenticated manager's user ID
 * @returns {Object|null} Store object if found, null otherwise
 */
const findStore = async (storeId, ownerId) => {
    return await prisma.store.findFirst({
        where: { id: storeId, ownerId }
    })
}

const findStoreForUser = async (storeId, user) => {
    if (user.role === "CASHIER") {
        return await prisma.store.findUnique({ where: { id: storeId } })
    }
    return await prisma.store.findFirst({ where: { id: storeId, ownerId: user.id } })
}


/**
 * Create Product Controller
 * Creates a new product with initial inventory for a store
 * 
 * @desc    Create a new product
 * @route   POST /api/products/:storeId/create
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object containing product data in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created product or error message
 */
const createProduct = async (req, res) => {
    try {
        const { name, sku, category, price, quantity, lowThreshold, barcode } = req.body

        if(!name || !sku || !category || !price || !quantity || !lowThreshold) return res.status(400).json({ message: "All fields are required!" })

        const store = await findStore(req.params.storeId, req.user.id)
        if(!store) return res.status(404).json({ message: "Store not found!" })

        const product = await prisma.product.create({
            data: {
                name,
                sku,
                category,
                price,
                barcode,
                storeId: store.id,
                inventory: {
                    create: {
                        quantity: quantity,
                        lowThreshold: lowThreshold
                    }
                }
            }
        })

        await logAction({ 
            userId: req.user.id, 
            action: "CREATE_PRODUCT", 
            entity: "Product", 
            entityId: product.id, 
            storeId: store.id 
        })

        res.status(201).json({
            success: true,
            message: "Product created successfully!",
            product
        })
    } catch (error) {
         // Log and return server error with detailed error message
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
}

/**
 * Create Multiple Products Controller
 * Bulk creates multiple products in a single transaction
 * If any product fails validation, all are rolled back
 * 
 * @desc    Create multiple products at once
 * @route   POST /api/products/:storeId/createMultiple
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with array of products in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created products or error message
 */
const createMultipleProducts = async (req, res) => {
    try {
        const products = req.body

        // validate request body
        if(!products || !products.length) return res.status(400).json({ message: "No products provided" })

        const store = await findStore(req.params.storeId, req.user.id)
        if(!store) return res.status(404).json({ message: "Store not found!" })

        // validate each product has required fields
        for(const product of products) {
            const { name, sku, category, price, quantity, lowThreshold, barcode } = product
            if(!name || !sku || !category || !price || !quantity || !lowThreshold || !barcode) {
                return res.status(400).json({ 
                    message: `Missing required fields for product: ${product.name || "unknown"}` 
                })
            }
        }

        // create all products and their inventory in a transaction
        // if any fails, all fail — keeps data consistent
        const createdProducts = await prisma.$transaction(
            products.map(({ quantity, lowThreshold, ...productData }) =>
                prisma.product.create({
                    data: {
                        ...productData,
                        storeId: store.id,
                        inventory: {
                            create: {
                                quantity,
                                lowThreshold
                            }
                        }
                    }
                })
            )
        )

        // Log audit for each created product
        for (const product of createdProducts) {
            await logAction({ 
                userId: req.user.id, 
                action: "CREATE_PRODUCT", 
                entity: "Product", 
                entityId: product.id, 
                storeId: store.id,
                details: JSON.stringify({ bulk: true, totalCreated: createdProducts.length })
            })
        }
        

        res.status(201).json({
            success: true,
            message: `${createdProducts.length} products created successfully!`,
            products: createdProducts
        })

    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        })
    }
}

/**
 * Get Products Controller
 * Retrieves all products for a store with optional filtering
 * Supports search by name, category filter, and active status filter
 * 
 * @desc    Get all products for a store
 * @route   GET /api/products/:storeId
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with optional query params (search, category, isActive)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of products or error message
 */
const getProducts = async (req, res) => {
    try {
        const store = await findStoreForUser(req.params.storeId, req.user)

        if(!store) return res.status(404).json({ message: "Store not found!" })

        const { search, category, isActive } = req.query
        
        const products = await prisma.product.findMany({
            where: {
                storeId: store.id,
                ...(search && { name: { contains: search, mode: "insensitive" } }),
                ...(category && { category }),
                ...(isActive !== undefined && { isActive: isActive === "true" })
            }, include: {
                inventory: true
            },
        })

        if(!products.length) return res.status(404).json({ message: "Product not found!" })

        res.status(200).json({
            success: true,
            products
        })
    } catch (error) {
         // Log and return server error with detailed error message
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
}


/**
 * Get Product By ID Controller
 * Retrieves a specific product by its ID for a store
 * 
 * @desc    Get a single product by ID
 * @route   GET /api/products/:storeId/:id
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId and product id in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with product data or error message
 */
const getProduct = async (req, res) => {
    try {
        const store = await findStore(req.params.storeId, req.user.id)

        if(!store) return res.status(404).json({ message: "Store not found!" })

        const product = await prisma.product.findUnique({
            where: {
                id: req.params.id,
                storeId: store.id,
            }
        })

        if(!product) return res.status(404).json({ message: "Product not found!"});

        res.status(200).json({
            success: true,
            product
        })
    } catch (error) {
         // Log and return server error with detailed error message
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
}
/**
 * Update Product Controller
 * Updates product information (name, sku, category, price, barcode)
 * Does not update inventory - use separate endpoints for inventory management
 * 
 * @desc    Update product details
 * @route   PATCH /api/products/:storeId/update/:id
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with updated product data in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated product or error message
 */
const updateProduct = async (req, res) => {
    try {
        const { name, sku, category, price, barcode } = req.body

        const store = await findStore(req.params.storeId, req.user.id)
        if(!store) return res.status(404).json({ message: "Store not found!" })

        const product = await prisma.product.findUnique({
            where: {
                id: req.params.id,
                storeId: store.id,
            }
        })

        if(!product) return res.status(404).json({
            message: "Product not found!"
        });

        const updatedProduct = await prisma.product.update({
            where: {id: product.id},
            data: {
                name, sku, category, price, barcode
            }
        })

        await logAction({ 
            userId: req.user.id, 
            action: "UPDATE_PRODUCT", 
            entity: "Product", 
            entityId: product.id, 
            storeId: store.id, 
            details: JSON.stringify(req.body) })

        res.status(201).json({
            success: true,
            message: "Product updated successfully!",
            updatedProduct
        })
    } catch (error) {
         // Log and return server error with detailed error message
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
}

/**
 * Deactivate Product Controller
 * Soft deletes a product by setting isActive to false
 * Preserves product data for historical transaction records
 * 
 * @desc    Deactivate a product (soft delete)
 * @route   PATCH /api/products/:storeId/deactivate/:id
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId and product id in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming deactivation or error message
 */
const deactivateProduct = async (req, res) => {
    try {
        // Retrieve the authenticated manager's store
        const store = await findStore(req.params.storeId, req.user.id)

        if(!store) return res.status(404).json({ message: "Store not found!" })

        const product = await prisma.product.findUnique({
            where: {
                id: req.params.id,
                storeId: store.id,
            }
        })

        if(!product) return res.status(404).json({
            message: "Product not found!"
        })

        const updatedProduct = await prisma.product.update({
            where: {id: product.id},
            data: {
                isActive: false
            }
        })

        await logAction({ 
            userId: req.user.id,
            action: "DEACTIVATE_PRODUCT",
            entity: "Product", 
            entityId: product.id, 
            storeId: store.id })

        res.status(201).json({
            success: true,
            message: "Product deactivated successfully!",
            updatedProduct
        })
    } catch (error) {
         // Log and return server error with detailed error message
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
}

/**
 * Get Product By Barcode Controller
 * Retrieves a product using its barcode for quick POS lookup
 * Used by cashiers to quickly find products during sales
 * 
 * @desc    Get product by barcode
 * @route   GET /api/products/:storeId/barcode/:barcode
 * @access  Private => Role: "MANAGER" or "CASHIER"
 * 
 * @param {Object} req - Express request object with storeId and barcode in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with product data including inventory or error message
 */
const getProductByBarcode = async (req, res) => {
    try {
        const { storeId, barcode } = req.params;

        const store = await findStoreForUser(storeId, req.user)

        if(!store) return res.status(404).json({ message: "Store not found!" })

        const product = await prisma.product.findUnique({
            where: {
                barcode: barcode,
                storeId: store.id,
            },
            include: {
                inventory: true
            }
        })

        if(!product) return res.status(404).json({
            message: "Product not found!"
        })
        
        res.status(200).json({
            success: true,
            product
        })
    } catch (error) {
        // Log and return server error with detailed error message
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
}

export { createProduct, createMultipleProducts, getProducts, getProduct, updateProduct, deactivateProduct, getProductByBarcode }