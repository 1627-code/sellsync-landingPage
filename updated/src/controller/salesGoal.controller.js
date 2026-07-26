/**
 * Sales Goal Controller
 * Manages sales targets/goals for stores
 * Allows managers to set, retrieve, and update sales goals
 * 
 * Goals can be set for different periods: DAILY or WEEKLY
 */

import prisma from "../lib/prisma.js";
import logAction from "../utils/auditLog.js"

/**
 * Create Sales Goal Controller
 * Sets a new sales target for a store
 * 
 * @desc    Create a new sales goal
 * @route   POST /api/salesGoal/:storeId/create
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with period and targetAmount in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created sales goal or error message
 */
const createSalesGoal = async (req, res) => {
    try {
        const {period, targetAmount} = req.body

        if(!period || !targetAmount) return res.status(400).json({
            message: "All fields are required!"
        })

        const store = await prisma.store.findFirst({
        where: {
                id: req.params.storeId,
                ownerId: req.user.id
            }
        });

        if(!store) return res.status(404).json({ message: "Store not found" });

        const salesGoal = await prisma.salesGoal.create({
            data: {
                period,
                targetAmount,
                store: {
                    connect: { id: store.id }
                }
            }
        })

        await logAction({
                userId: req.user.id,
                action: "CREATE_SALES_GOAL",
                entity: "salesGoal",
                entityId: salesGoal.id,
                storeId: store.id
            })

        res.status(201).json({
            success: true,
            message: "Sales Goal created successfully!",
            salesGoal
        })
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error: error.message
        });
    }
}

/**
 * Get Current Sales Goal Controller
 * Retrieves the current sales goal for a store
 * 
 * @desc    Get current sales goal
 * @route   GET /api/salesGoal/:storeId
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with sales goal or error message
 */
const getCurrentSalesGoal = async (req, res) => {
    try {
        const store = await prisma.store.findFirst({
        where: {
                id: req.params.storeId,
                ownerId: req.user.id
            }
        });

        if(!store) return res.status(404).json({ message: "Store not found" });

        const salesGoal = await prisma.salesGoal.findFirst({
            where: {
                storeId: store.id
            }
        })

        if(!salesGoal) return res.status(404).json({
            message: "Sales Goal not found!"
        })

        res.status(200).json({
            success: true,
            salesGoal
        })
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", error
        });
    }
}

/**
 * Update Sales Goal Controller
 * Updates an existing sales goal's period and target amount
 * 
 * @desc    Update a sales goal
 * @route   PATCH /api/salesGoal/:storeId/update/:id
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with goal id in params and updated data in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated sales goal or error message
 */
const updateSalesGoal = async (req, res) => {
    try {
        const { period, targetAmount } = req.body

        if(!period || !targetAmount) return res.status(400).json({
            message: "All fields are required!"
        })

        const store = await prisma.store.findFirst({
        where: {
                id: req.params.storeId,
                ownerId: req.user.id
            }
        });

        if(!store) return res.status(404).json({ message: "Store not found" });

        const salesGoal = await prisma.salesGoal.findFirst({
            where: {
                id: req.params.id,
                storeId: store.id
            }
        })

        if(!salesGoal) return res.status(400).json({
            message: "Sales Goal not found"
        })

        const updatedSalesGoal = await prisma.salesGoal.update({
            where: {
                id: req.params.id
            },
            data: {
                period,
                targetAmount
            }
        })

        await logAction({
                userId: req.user.id,
                action: "UPDATE_SALES_GOAL",
                entity: "salesGoal",
                entityId: salesGoal.id,
                storeId: store.id
            })

        res.status(201).json({
            success: true,
            message: "Sales Goal updated successfully!",
            updatedSalesGoal
        })
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error: error.message
        });
    }
}

export {
    createSalesGoal,
    getCurrentSalesGoal,
    updateSalesGoal
}