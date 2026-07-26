/**
 * Product Routes
 * Defines API endpoints for product management operations
 * All routes are protected and scoped to the authenticated manager's store
 */

import { Router } from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { createProduct, getProducts, getProduct, updateProduct, deactivateProduct, createMultipleProducts, getProductByBarcode } from "../controller/product.controller.js"

const router = Router();

/**
 * POST /api/products/:storeId/create
 * Create a new product with inventory for the manager's store
 * Access: Private (Manager only)
 */
router.post("/:storeId/create", protect, createProduct);

/**
 * POST /api/products/:storeId/createMultiple
 * Bulk create multiple products at once
 * All products must pass validation or entire operation fails
 * Access: Private (Manager only)
 */
router.post("/:storeId/createMultiple", protect, createMultipleProducts);

/**
 * GET /api/products/:storeId
 * Retrieve all products for a store with optional filters
 * Query params: search, category, isActive
 * Access: Private (Manager or Cashier)
 */
router.get("/:storeId", protect, authorize("MANAGER", "CASHIER"), getProducts);

/**
 * GET /api/products/:storeId/:id
 * Retrieve a specific product by ID
 * Access: Private (Manager only)
 */
router.get("/:storeId/:id", protect, getProduct);

/**
 * GET /api/products/:storeId/barcode/:barcode
 * Retrieve a product by its barcode for POS lookup
 * Access: Private (Manager or Cashier)
 */
router.get("/:storeId/barcode/:barcode", protect, getProductByBarcode);

/**
 * PATCH /api/products/:storeId/update/:id
 * Update product information (name, sku, category, price, barcode)
 * Access: Private (Manager only)
 */
router.patch("/:storeId/update/:id", protect, updateProduct);

/**
 * PATCH /api/products/:storeId/deactivate/:id
 * Deactivate a product (soft delete)
 * Access: Private (Manager only)
 */
router.patch("/:storeId/deactivate/:id", protect, authorize("MANAGER"), deactivateProduct);

export default router;