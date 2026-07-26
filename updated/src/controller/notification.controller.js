/**
 * Notification Controller
 * Handles retrieval and management of user notifications
 * Notifications are created for events like low stock alerts
 */

import prisma from "../lib/prisma.js";

/**
 * Get Notifications Controller
 * Retrieves all notifications for the authenticated user
 * Returns notifications ordered by creation date (newest first)
 * 
 * @desc    Get all notifications for current user
 * @route   GET /api/notifications
 * @access  Private (authenticated users)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of notifications
 */
const getNotifications = async(req, res) => {
    try {
        const storeId = req.query.storeId;
        
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" }
        });

        let filtered = notifications;
        if (storeId) {
            filtered = notifications.filter(n => n.storeId === storeId || n.storeId === null);
        }

        res.status(200).json({ success: true, notifications: filtered });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Internal Server error!", error: error.message });
    }
}


/**
 * Mark Notification as Read Controller
 * Updates a notification's read status to true
 * Ensures user can only mark their own notifications
 * 
 * @desc    Mark a notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private (authenticated users)
 * 
 * @param {Object} req - Express request object with notification id in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated notification or error message
 */
const markAsRead = async(req, res) => {
    try {
        const notification = await prisma.notification.findUnique({
            where: { id: req.params.id }
        })

        if(!notification) return res.status(404).json({ message: "Notification not found" })
        
        if(notification.userId !== req.user.id) return res.status(403).json({ 
            message: "Unauthorized" 
        })

        const updated = await prisma.notification.update({
            where: { id: req.params.id },
            data: { read: true }
        })

        res.status(200).json({ success: true, notification: updated })
    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error })
    }
}

export {
    getNotifications,
    markAsRead
}
