/**
 * AI Routes
 * Defines API endpoints for AI-powered insights
 * All routes are protected and restricted to managers only
 */

import { Router } from "express";
import { getAIInsight } from "../controller/ai.controller.js";
import { protect, authorize} from "../middleware/auth.middleware.js"

const router = Router();

/**
 * GET /api/ai/:storeId/insight
 * Get the most recent AI-generated insight for a store
 * Insights include sales trends, inventory alerts, and recommendations
 * Access: Private (Manager only)
 */
router.get("/:storeId/insight", protect, authorize("MANAGER"), getAIInsight);

export default router