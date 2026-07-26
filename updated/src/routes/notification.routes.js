/**
 * Notification Routes
 * Defines API endpoints for user notification management
 * All routes are protected and scoped to the authenticated user
 */

import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
    getNotifications,
    markAsRead
} from "../controller/notification.controller.js"

const router = Router();

/**
 * GET /api/notifications
 * Retrieve all notifications for the authenticated user
 * Returns notifications ordered by newest first
 * Access: Private (authenticated users)
 */
router.get("/", protect, getNotifications);

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 * Users can only mark their own notifications
 * Access: Private (authenticated users)
 */
router.patch("/:id/read", protect, markAsRead);

export default router;