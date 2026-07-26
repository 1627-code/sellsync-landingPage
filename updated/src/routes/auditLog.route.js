/**
 * Audit Log Routes
 * Defines API endpoints for audit trail retrieval
 * All routes are protected and restricted to managers only
 */

import { Router } from "express";

import {protect, authorize} from "../middleware/auth.middleware.js"

import {
    getAuditLogs,
    getAuditLogById
} from "../controller/auditLog.controller.js"

const router = Router();

/**
 * GET /api/auditLogs/:storeId
 * Get all audit logs for a store with pagination
 * Query params: page, limit
 * Access: Private (Manager only)
 */
router.get("/:storeId", protect, authorize("MANAGER"), getAuditLogs);

/**
 * GET /api/auditLogs/:storeId/:id
 * Get a specific audit log by ID
 * Access: Private (Manager only)
 */
router.get("/:storeId/:id", protect, authorize("MANAGER"), getAuditLogById);

export default router