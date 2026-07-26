/**
 * Analytics Routes
 * Defines API endpoints for sales analytics and reporting
 * All routes are protected and restricted to managers only
 */

import { Router } from "express"
import { protect, authorize } from "../middleware/auth.middleware.js"
import { getSalesTrend, getTopProductsChart, getSalesByCategory, getHourlySales } from "../controller/analytics.controller.js"

const router = Router()

/**
 * GET /api/analytics/:storeId/sales-trend
 * Get daily sales revenue for the last 7 days
 * Returns array of { date, revenue } objects
 * Access: Private (Manager only)
 */
router.get("/:storeId/sales-trend", protect, authorize("MANAGER"), getSalesTrend)

/**
 * GET /api/analytics/:storeId/top-products
 * Get top 5 best-selling products by quantity
 * Returns array of { productName, unitsSold } objects
 * Access: Private (Manager only)
 */
router.get("/:storeId/top-products", protect, authorize("MANAGER"), getTopProductsChart)

/**
 * GET /api/analytics/:storeId/sales-by-category
 * Get sales breakdown by product category
 * Returns array of { category, revenue } objects
 * Access: Private (Manager only)
 */
router.get("/:storeId/sales-by-category", protect, authorize("MANAGER"), getSalesByCategory)

/**
 * GET /api/analytics/:storeId/hourly-sales
 * Get sales breakdown by hour of day
 * Returns array of { hour, revenue } objects
 * Access: Private (Manager only)
 */
router.get("/:storeId/hourly-sales", protect, authorize("MANAGER"), getHourlySales)

export default router