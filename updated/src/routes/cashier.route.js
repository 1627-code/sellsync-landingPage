/**
 * Cashier Routes
 * Defines API endpoints for cashier management within a store
 * All routes are protected and restricted to managers only
 */

import { Router } from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { createCashier, getCashiers, getCashier, deactivateCashier, reactivateCashier } from "../controller/cashier.controller.js";

// Create a new router instance for cashier-related routes
const router = Router();

/**
 * POST /api/cashiers/:storeId/create
 * Create a new cashier account under the manager's store
 * Sends verification email to cashier after registration
 * Access: Private (Manager only)
 */
router.post("/:storeId/create", protect, authorize("MANAGER"), createCashier);

/**
 * GET /api/cashiers/:storeId
 * Retrieve all cashiers associated with the manager's store
 * Returns list of cashiers with their details (excluding passwords)
 * Access: Private (Manager only)
 */
router.get("/:storeId", protect, authorize("MANAGER"), getCashiers);

/**
 * GET /api/cashiers/:storeId/:id
 * Retrieve a specific cashier's details by their ID
 * Ensures cashier belongs to the manager's store
 * Access: Private (Manager only)
 */
router.get("/:storeId/:id", protect, authorize("MANAGER"), getCashier);

/**
 * PATCH /api/cashiers/:storeId/deactivate/:id
 * Deactivate a cashier account (soft delete)
 * Sets isActive to false, preventing login but preserving account data
 * Access: Private (Manager only)
 */
router.patch("/:storeId/deactivate/:id", protect, authorize("MANAGER"), deactivateCashier);

router.patch("/:storeId/reactivate/:id", protect, authorize("MANAGER"), reactivateCashier);


// Export the router to be mounted in the main application at /api/cashiers
export default router;