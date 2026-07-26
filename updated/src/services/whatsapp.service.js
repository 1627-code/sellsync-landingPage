/**
 * WhatsApp Notification Service
 * Handles sending WhatsApp messages using Termii API
 * Provides alerts for low stock and AI insights
 */

import dotenv from "dotenv"
dotenv.config()

/**
 * Send WhatsApp Message (Internal Helper)
 * Sends a WhatsApp message via Termii API
 * 
 * @param {string} phone - Recipient's phone number
 * @param {string} message - Message content to send
 * @returns {Promise<Object>} API response data
 */
const sendWhatsAppMessage = async (phone, message) => {
    const response = await fetch("https://v3.api.termii.com/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            to: phone,
            from: process.env.TERMII_SENDER_ID,
            sms: message,
            type: "plain",
            channel: "whatsapp",
            api_key: process.env.TERMII_API_KEY
        })
    })

    const data = await response.json()
    return data
}

/**
 * Send Low Stock WhatsApp Alert
 * Notifies store owners via WhatsApp when products are running low
 * 
 * @param {string} phone - Recipient's phone number
 * @param {string} storeName - Name of the store
 * @param {Array} products - Array of products with low stock (productName, quantity)
 * @returns {Promise<Object>} API response from Termii
 */
export const sendLowStockWhatsApp = async (phone, storeName, products) => {
    const productList = products.map(p => `• ${p.productName}: ${p.quantity} units left`).join('\n')
    const message = `⚠️ SellSync Low Stock Alert\n\nStore: ${storeName}\n\nProducts running low:\n${productList}\n\nPlease restock immediately.`
    return await sendWhatsAppMessage(phone, message)
}

/**
 * Send AI Insight WhatsApp Notification
 * Sends daily AI insights summary via WhatsApp
 * 
 * @param {string} phone - Recipient's phone number
 * @param {string} storeName - Name of the store
 * @param {string} title - Title of the insight
 * @param {string} summary - Summary of insights
 * @returns {Promise<Object>} API response from Termii
 */
export const sendAIInsightWhatsApp = async (phone, storeName, title, summary) => {
    const message = `📊 SellSync Daily Insight\n\nStore: ${storeName}\n\n${title}\n\n${summary}\n\nLogin to SellSync for full analytics.`
    return await sendWhatsAppMessage(phone, message)
}