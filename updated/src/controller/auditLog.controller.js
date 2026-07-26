/**
 * Audit Log Controller
 * Handles retrieval of audit trail data
 * Provides visibility into user actions and system events
 */

import prisma from "../lib/prisma.js";

/**
 * Get Audit Logs Controller
 * Retrieves all audit logs for a store with pagination
 * Returns logs ordered by creation date (newest first)
 * 
 * @desc    Get all audit logs for a store
 * @route   GET /api/auditLogs/:storeId
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with optional pagination query params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with paginated audit logs or error message
 */
const getAuditLogs = async(req, res) => {
    try {


        const store = await prisma.store.findFirst({
        where: {
                id: req.params.storeId,
                ownerId: req.user.id
            }
        });


        if(!store) return res.status(404).json({ message: "Store not found" });

        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page - 1) * limit

        const total = await prisma.auditLog.count({
            where: { storeId: store.id }
        })

        const auditLogs = await prisma.auditLog.findMany({
            where: {
                storeId: store.id
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: limit
        })

        if(!auditLogs.length) return res.status(404).json({
            message: "No auditLog found!"
        });

        res.status(200).json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            auditLogs
        })
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", error: error.message
        });
    }
}

/**
 * Get Audit Log By ID Controller
 * Retrieves a specific audit log entry by its ID
 * 
 * @desc    Get a single audit log by ID
 * @route   GET /api/auditLogs/:storeId/:id
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with audit log id in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with audit log data or error message
 */
const getAuditLogById = async(req, res) => {
    try {
       const store = await prisma.store.findFirst({
        where: {
                id: req.params.storeId,
                ownerId: req.user.id
            }
        });

        if(!store) return res.status(404).json({ message: "Store not found" });

        const auditLog = await prisma.auditLog.findUnique({
            where: {
                id: req.params.id,
            }
        })

        if(!auditLog) return res.status(404).json({
            message: "AuditLog not found!"
        });

        res.status(200).json({
            success: true,
            auditLog
        })
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", error
        });
    }
}

export {
    getAuditLogs,
    getAuditLogById
}