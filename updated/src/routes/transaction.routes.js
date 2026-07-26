/**
 * Transaction/Sales Routes
 * Defines API endpoints for transaction and sales operations
 * Cashiers create sales, Managers view and analyze sales data
 */

import { Router } from "express";
import { createSale, getTransactions, getTransactionsByCashier, getTransactionById, getTransactionsByDateRange, getSalesSummary, exportTransactionsPDF } from "../controller/transaction.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * POST /api/transactions/create
 * Create a new sale transaction with inventory management
 * Decrements inventory and creates low stock alerts
 * Access: Private (Cashier only)
 */
router.post("/create", protect, authorize("CASHIER"), createSale);

/**
 * GET /api/transactions/:storeId
 * Retrieve all transactions for a store with pagination
 * Query params: page, limit
 * Access: Private (Manager only)
 */
router.get("/:storeId", protect, authorize("MANAGER", "CASHIER"), getTransactions);

/**
 * GET /api/transactions/:storeId/cashier/:id
 * Retrieve all transactions processed by a specific cashier
 * Access: Private (Manager only)
 */
router.get("/:storeId/cashier/:id", protect, authorize("MANAGER"), getTransactionsByCashier);

/**
 * GET /api/transactions/:storeId/date-range
 * Retrieve transactions within a date range
 * Query params: startDate, endDate (YYYY-MM-DD)
 * Access: Private (Manager only)
 */
router.get("/:storeId/date-range", protect, authorize("MANAGER"), getTransactionsByDateRange);

/**
 * GET /api/transactions/:storeId/summary
 * Get sales summary (total revenue and transaction count)
 * Query params: startDate, endDate (YYYY-MM-DD)
 * Access: Private (Manager only)
 */
router.get("/:storeId/summary", protect, authorize("MANAGER"), getSalesSummary);

/**
 * GET /api/transactions/:storeId/:id
 * Retrieve a specific transaction by ID
 * Access: Private (Manager only)
 */
router.get("/:storeId/:id", protect, authorize("MANAGER"), getTransactionById);

/**
 * GET /api/transactions/:storeId/export/pdf
 * Export all transactions as a PDF report
 * Access: Private (Manager only)
 */
router.get("/:storeId/export/pdf", protect, authorize("MANAGER"), exportTransactionsPDF)

export default router