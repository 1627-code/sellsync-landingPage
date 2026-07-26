/**
 * Audit Log Utility
 * Records user actions and system events for audit trail purposes
 * Used throughout the application to track user activities
 * 
 * Each log entry captures:
 * - User who performed the action
 * - Type of action (e.g., CREATE_PRODUCT, LOGIN, UPDATE_STORE)
 * - Entity type (e.g., Product, User, Transaction)
 * - Entity ID (specific record affected)
 * - Store ID (if applicable)
 * - Additional details as JSON string
 */

import prisma from "../lib/prisma.js"

/**
 * Log User Action
 * Creates an audit log entry for tracking user activities
 * 
 * @param {Object} data - Audit log data
 * @param {string} data.userId - ID of user who performed the action
 * @param {string} data.action - Type of action (e.g., "CREATE_PRODUCT")
 * @param {string} data.entity - Entity type (e.g., "Product", "User")
 * @param {string} data.entityId - ID of affected record
 * @param {string} data.storeId - ID of store (if applicable)
 * @param {string} data.details - Additional details as JSON string
 * @returns {Promise<void>}
 */
const logAction = async (data) => {
    const { userId, action, entity, entityId, storeId, details } = data;

    await prisma.auditLog.create({
        data: {
            userId, 
            action, 
            entity, 
            entityId, 
            storeId, 
            details
        }
    })
}
export default logAction