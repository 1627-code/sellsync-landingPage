/**
 * Store Routes
 * Defines API endpoints for store management operations
 * All routes are protected and restricted to managers only
 */

import { Router } from "express";
import { createStore, updateStore, getStores, getStore, deactivateStore, deactivateAllStores, reactivateStore, reactivateAllStores } from "../controller/store.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";

// Create a new router instance for store-related routes
const router = Router();

/**
 * POST /api/stores/create
 * Create a new store for the authenticated manager
 * Manager becomes the store owner upon creation
 * Access: Private (Manager only)
 */
router.post("/create", protect, authorize("MANAGER"), createStore);

/**
 * PATCH /api/stores/update
 * Update the authenticated manager's store information
 * Allows modification of name, email, phone, and location
 * Access: Private (Manager only)
 */
router.patch("/update/:storeId", protect, authorize("MANAGER"), updateStore);

/**
 * GET /api/stores/my-store
 * Get the store assigned to the current user (for cashiers)
 * Access: Private (Cashier or Manager)
 * MUST come before /:storeId to avoid being matched as parameter
 */
router.get("/my-store", protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { store: true, ownedStores: true }
    });
    
    const stores = user?.store ? [user.store] : (user?.ownedStores || []);
    
    if (!stores.length) {
      return res.status(404).json({ message: "No store assigned to this user" });
    }
    
    const store = stores[0];
    res.status(200).json({
      success: true,
      data: { stores: [store] }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * GET /api/stores/:storeId
 * Retrieve a specific store by ID
 * Ensures store belongs to the authenticated manager
 * Access: Private (Manager only)
 */
router.get("/:storeId", protect, authorize("MANAGER"), getStore);

/**
 * GET /api/stores/my-store
 * Get the store assigned to the current user (for cashiers)
 * Access: Private (Cashier or Manager)
 */
router.get("/my-store", protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { store: true, ownedStores: true }
    });
    
    const stores = user?.store ? [user.store] : (user?.ownedStores || []);
    
    if (!stores.length) {
      return res.status(404).json({ message: "No store assigned to this user" });
    }
    
    const store = stores[0];
    res.status(200).json({
      success: true,
      data: { stores: [store] }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * GET /api/stores
 * Retrieve all stores owned by the authenticated manager
 * Supports multi-store management
 * Access: Private (Manager only)
 */
router.get("/", protect, authorize("MANAGER"), getStores);

/**
 * PATCH /api/stores/deactivate/:storeId
 * Deactivate a specific store and all its cashiers
 * Implements cascading deactivation for data consistency
 * Access: Private (Manager only)
 */
router.patch("/deactivate/:storeId", protect, authorize("MANAGER"), deactivateStore);

/**
 * PATCH /api/stores/deactivate-all
 * Deactivate all stores owned by the manager
 * Also deactivates all cashiers across all stores
 * Access: Private (Manager only)
 */
router.patch("/deactivate-all", protect, authorize("MANAGER"), deactivateAllStores);

router.patch("/reactivate/:storeId", protect, authorize("MANAGER"), reactivateStore);

/**
 * PATCH /api/stores/deactivate-all
 * Deactivate all stores owned by the manager
 * Also deactivates all cashiers across all stores
 * Access: Private (Manager only)
 */
router.patch("/reactivate-all", protect, authorize("MANAGER"), reactivateAllStores);

// Export the router to be mounted n the main application at /api/stores
export default router;