/**
 * Sales Goal Routes
 * Defines API endpoints for sales goal management
 * All routes are protected and restricted to managers only
 */

import { Router } from "express";

import {
    createSalesGoal,
    getCurrentSalesGoal,
    updateSalesGoal
} from "../controller/salesGoal.controller.js"

import { protect, authorize} from "../middleware/auth.middleware.js"

const router = Router();

/**
 * POST /api/salesGoal/:storeId/create
 * Create a new sales goal for a store
 * Access: Private (Manager only)
 */
router.post("/:storeId/create", protect, authorize("MANAGER"), createSalesGoal);

/**
 * GET /api/salesGoal/:storeId
 * Get the current sales goal for a store
 * Access: Private (Manager only)
 */
router.get("/:storeId", protect, authorize("MANAGER"), getCurrentSalesGoal);

/**
 * PATCH /api/salesGoal/:storeId/update/:id
 * Update an existing sales goal
 * Access: Private (Manager only)
 */
router.patch("/:storeId/update/:id", protect, authorize("MANAGER"), updateSalesGoal);

export default router