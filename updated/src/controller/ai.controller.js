/**
 * AI Insight Controller
 * Handles retrieval of AI-generated insights and analytics
 * Provides managers with AI-powered business intelligence
 */

import { generateAIInsight } from "../services/ai.service.js";
import prisma from "../lib/prisma.js"

import logAction from "../utils/auditLog.js"

/**
 * Get AI Insight Controller
 * Retrieves the most recent AI-generated insight for a store
 * Insights are generated daily by scheduled analytics job
 * 
 * @desc    Get AI-generated insight for a store
 * @route   GET /api/ai/:storeId/insight
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with AI insight data or error message
 */
const getAIInsight = async (req, res) => {
  try {
    // Retrieve the authenticated manager's store
    const store = await prisma.store.findFirst({
        where: {
            id: req.params.storeId,
            ownerId: req.user.id
        }
    });

    if(!store) return res.status(404).json({ message: "Store not found" });

    const insight = await prisma.insight.findFirst({
        where: { storeId: store.id,
            productId: null 
         },
        orderBy: { createdAt: 'desc' }
    }) 

    if(!insight) return res.status(404).json({ 
        message: "No insights generated yet, please check back later" 
    })

    await logAction({
        userId: req.user.id,
        action: "VIEW_AI_INSIGHT",
        entity: "Insight",
        entityId: insight.id,
        storeId: store.id
    })

    res.status(200).json({
        success: true,
        title: insight.title,
        summary: insight.summary,
        insights: JSON.parse(insight.message)
    })
        
  } catch (error) {
        // Log and return server error
    res.status(500).json({
        message: "Internal Server error!", error
    });
  }
}

export {getAIInsight}