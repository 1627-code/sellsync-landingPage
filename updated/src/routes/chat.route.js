/**
 * Chat Routes
 * Defines API endpoints for AI chatbot functionality
 * All routes are protected and restricted to managers only
 */

import { Router } from "express"
import { protect, authorize } from "../middleware/auth.middleware.js"
import { chat, upload, transcribeAudio } from "../controller/chat.controller.js"

const router = Router()

/**
 * POST /api/chat/:storeId
 * AI-powered chat endpoint for store managers
 * Accepts natural language queries and returns AI responses
 * Access: Private (Manager only)
 */
router.post("/:storeId", protect, authorize("MANAGER"), chat)

/**
 * POST /api/chat/:storeId/transcribe
 * Transcribe voice messages to text
 * Accepts audio file and returns transcribed text
 * Access: Private (Manager only)
 */
router.post("/:storeId/transcribe", protect, authorize("MANAGER"), upload.single("audio"), transcribeAudio)

export default router