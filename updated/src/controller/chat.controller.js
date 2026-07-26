/**
 * Chat/AI Assistant Controller
 * Provides an AI-powered chatbot for store managers
 * Uses Groq LLM for natural language responses and voice transcription
 */

import prisma from "../lib/prisma.js";
import { Groq } from 'groq-sdk';
import multer from "multer"

/**
 * Detect Intent (Helper Function)
 * Analyzes user message to determine the type of query
 * Maps natural language to specific data intents for targeted responses
 * 
 * @param {string} message - User's message text
 * @returns {Object} Object with detected intent
 */
const detectIntent = (message) => {
    const msg = message.toLowerCase()

    // Sales time-based intents first
    if(msg.includes("yesterday")) {
        return { intent: "SALES_YESTERDAY" }
    }

    if(msg.includes("this week") || msg.includes("week") || msg.includes("trend") || msg.includes("compare")) {
        return { intent: "SALES_WEEK" }
    }

    if(msg.includes("today") || msg.includes("today's") || msg.includes("transaction") || msg.includes("sale") || msg.includes("sold") || msg.includes("revenue") || msg.includes("profit") || msg.includes("income") || msg.includes("made")) {
        return { intent: "SALES_TODAY" }
    }

    if(msg.includes("cashier") || msg.includes("staff") || msg.includes("who processed") || msg.includes("who sold")) {
        return { intent: "CASHIER_PERFORMANCE" }
    }

    // Product intents
    if(msg.includes("top") || msg.includes("best") || msg.includes("selling")) {
        return { intent: "TOP_PRODUCTS" }
    }

    if(msg.includes("stock") || msg.includes("inventory") || msg.includes("running low") || msg.includes("restock") || msg.includes("reorder") || msg.includes("stockout")) {
        return { intent: "INVENTORY" }
    }

    // Other intents
    if(msg.includes("goal") || msg.includes("target")) {
        return { intent: "SALES_GOAL" }
    }

    if(msg.includes("insight") || msg.includes("analysis") || msg.includes("report") || msg.includes("summary")) {
        return { intent: "AI_INSIGHT" }
    }

    return { intent: "GENERAL" }
}

/**
 * Fetch Data For Intent (Helper Function)
 * Retrieves relevant store data based on detected intent
 * Queries database for specific analytics based on user query type
 * 
 * @param {string} intent - Detected intent from user's message
 * @param {string} storeId - Store ID to fetch data for
 * @returns {Object} Data relevant to the detected intent
 */
const fetchDataForIntent = async (intent, storeId) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const thisWeekStart = new Date()
    thisWeekStart.setDate(thisWeekStart.getDate() - 7)

    switch(intent) {
        case "SALES_TODAY": {
            const result = await prisma.transaction.aggregate({
                where: { storeId, createdAt: { gte: today } },
                _sum: { totalAmount: true },
                _count: true
            })
            return {
                totalAmount: result._sum.totalAmount ?? 0,
                transactionCount: result._count
            }
        }

        case "SALES_YESTERDAY": {
            const result = await prisma.transaction.aggregate({
                where: { storeId, createdAt: { gte: yesterday, lte: today } },
                _sum: { totalAmount: true },
                _count: true
            })
            return {
                totalAmount: result._sum.totalAmount ?? 0,
                transactionCount: result._count
            }
        }

        case "SALES_WEEK": {
            const result = await prisma.transaction.aggregate({
                where: { storeId, createdAt: { gte: thisWeekStart } },
                _sum: { totalAmount: true },
                _count: true
            })
            return {
                totalAmount: result._sum.totalAmount ?? 0,
                transactionCount: result._count
            }
        }

        case "TOP_PRODUCTS": {
            const items = await prisma.transactionItem.groupBy({
                by: ["productId"],
                where: { transaction: { storeId, createdAt: { gte: thisWeekStart } } },
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: "desc" } },
                take: 5
            })
            const productIds = items.map(i => i.productId)
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } }
            })
            return items.map(item => ({
                productName: products.find(p => p.id === item.productId)?.name,
                unitsSold: item._sum.quantity
            }))
        }

        case "INVENTORY": {
            const inventory = await prisma.inventory.findMany({
                where: { product: { storeId } },
                include: { product: true }
            })
            return inventory
                .filter(i => i.quantity <= i.lowThreshold)
                .map(i => ({
                    productName: i.product.name,
                    quantity: i.quantity,
                    lowThreshold: i.lowThreshold
                }))
        }

        case "SALES_GOAL": {
            return await prisma.salesGoal.findFirst({
                where: { storeId }
            })
        }

        case "CASHIER_PERFORMANCE": {
            const transactions = await prisma.transaction.findMany({
                where: { storeId, createdAt: { gte: thisWeekStart } },
                include: { cashier: { select: { name: true } } }
            })
            const performance = {}
            for(const tx of transactions) {
                const name = tx.cashier?.name || "Unknown"
                if(!performance[name]) performance[name] = { totalAmount: 0, transactionCount: 0 }
                performance[name].totalAmount += tx.totalAmount
                performance[name].transactionCount += 1
            }
            return performance
        }

        case "AI_INSIGHT": {
            return await prisma.insight.findFirst({
                where: { storeId, productId: null },
                orderBy: { createdAt: "desc" }
            })
        }

        default:
            return null
    }
}

/**
 * Generate Chat Response (Helper Function)
 * Uses Groq LLM to generate natural language responses
 * Combines store data with AI to answer manager queries
 * 
 * @param {string} message - Original user message
 * @param {string} intent - Detected intent
 * @param {Object} data - Fetched store data
 * @param {string} storeName - Name of the store
 * @returns {string} AI-generated response text
 */
const generateChatResponse = async (message, intent, data, storeName) => {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const systemPrompt = `
You are a helpful business assistant for ${storeName}, a retail store using a POS system in Nigeria, using west-African time-zone.
You answer questions from the store manager in a friendly, concise, and professional tone.
You have access to real store data and should use it to give specific, accurate answers.
Keep responses short — 2-4 sentences maximum.
Always mention specific numbers from the data in your response.
Do not make up data. Only use what is provided.
The store uses Nigerian Naira (₦) as currency.
`

    const userPrompt = `
Manager's question: "${message}"
Detected intent: ${intent}
Store data: ${JSON.stringify(data)}

Answer the manager's question using the store data provided.
`

    const response = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        stream: false
    })

    console.log(response.choices[0].message.content)

    return response.choices[0].message.content.replace(/^"|"$/g, "").trim()
}

/**
 * Chat Controller
 * Main AI chatbot endpoint for store managers
 * Processes natural language queries and returns AI-generated responses
 * 
 * @desc    AI-powered chat for store managers
 * @route   POST /api/chat/:storeId
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with message in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with AI-generated reply
 */
const chat = async (req, res) => {
    try {
        const {message} = req.body;

        if (!message) return res.status(400).json({
            message: "All fields are required!"
        })

        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId,
                ownerId: req.user.id
            }
        });

        // Ensure manager has a store before creating cashier
        if(!store) return res.status(404).json({ 
            message: "No store found!" 
        });

        const {intent} = detectIntent(message);
        const data = await fetchDataForIntent(intent, store.id)
        const reply = await generateChatResponse(message, intent, data, store.name)

        res.status(200).json({
            success: true,
            reply
        })

    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", error: error.message
        });
    }
}

// Multer middleware for handling audio file uploads
const upload = multer({ storage: multer.memoryStorage() })

/**
 * Transcribe Audio Controller
 * Transcribes voice messages using Groq's Whisper model
 * Allows managers to ask questions via voice input
 * 
 * @desc    Transcribe audio to text
 * @route   POST /api/chat/:storeId/transcribe
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with audio file
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with transcribed text
 */
const transcribeAudio = async (req, res) => {
    try {
        if(!req.file) return res.status(400).json({ message: "Audio file is required" })

        const store = await prisma.store.findFirst({
            where: {
                id: req.params.storeId,
                ownerId: req.user.id
            }
        })

        if(!store) return res.status(404).json({ message: "Store not found" })

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

        const transcription = await groq.audio.transcriptions.create({
            file: new File([req.file.buffer], req.file.originalname, { type: req.file.mimetype }),
            model: "whisper-large-v3",
            language: "en"
        })

        res.status(200).json({
            success: true,
            text: transcription.text
        })

    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error: error.message })
    }
}
export { chat, transcribeAudio, upload }