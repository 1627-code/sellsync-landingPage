/**
 * AI Service
 * Generates AI-powered insights using Groq LLM
 * Analyzes store analytics data to provide actionable business intelligence
 */

import { fetchAnalyticsData } from "./analytics.service.js";

import { Groq } from 'groq-sdk';
import dotenv from "dotenv"
dotenv.config()

/**
 * Format Analytics Data (Helper Function)
 * Converts raw analytics data into a prompt for the AI model
 * Includes sales data, inventory status, trends, and predictions
 * 
 * @param {Object} data - Raw analytics data from analytics service
 * @returns {string} Formatted prompt for AI model
 */
const formatAnalyticsData = (data) => {
    const {
        summary,
        topProducts,
        lowStockProducts,
        dailySalesTrend,
        transactionCount,
        prediction,
        salesComparison
    } = data

    const prompt = `
        ROLE:
        You are an experienced retail sales analyst specializing in small retail stores using POS systems.

        AUDIENCE:
        The insights will be shown directly to the store owner inside a dashboard.

        GOAL:
        Help the store owner increase revenue, prevent stockouts, and identify operational problems.

        INSTRUCTIONS:
        Analyze the store data carefully and identify the most important business insights.
        Focus on: unusual sales activity, products at risk of running out, sales trends, and operational issues.
        If data is limited, infer possible causes and recommend specific actions.
        Never say "data is missing" or "no data available" — always provide actionable recommendations.
        Each insight must mention specific product names and numbers from the data where available.

        RULES:
        - Return ONLY valid JSON, no markdown, no code blocks, no extra text
        - The insights array must have 3-5 items, each highlighting a DIFFERENT issue
        - The title should be short and direct 
        - Good example: "Low Stock Alert" and "No Sales Recorded"
        - Bad example: "Store revenue reached $82250 in 1 transaction with top products Indomie Chicken Flavour, Coca Cola 50cl, and Peak Milk 160g." and "The store shows no sales activity in the last 7 days."
        - Each message must be 1-2 sentences max 40 words
        - Include specific numbers and product names in every message
        - Bad example: "15 units remaining, high sales risk."
        - Good example: "Coca Cola 50cl has only 15 units left but sold 85 units this week. Restock immediately to avoid stockout."
        - Keep entire response under 250 words

        FORMAT:
        {
            "summary": "one sentence overview of the store current situation",
            "title": "max 5 words, very short notification title",
            "type": "one of: LOW_STOCK, STOCKOUT_RISK, SALES_SPIKE, SLOW_MOVING, TREND_CHANGE",
            "severity": "one of: LOW, MEDIUM, HIGH",
            "insights": [
                {
                    "title": "short title max 8 words",
                    "message": "specific actionable recommendation with numbers and product names"
                }
            ]
        }

        STORE DATA:

        Revenue (last 7 days): $${summary._sum.totalAmount ?? 0}

        Total Transactions: ${transactionCount}

        Top Products:
        ${topProducts.map((item, index) => `${index + 1}. ${item.productName} - ${item.quantity} units`).join('\n')}

        Low Stock Items:
        ${lowStockProducts.map(item => `- ${item.productName}: ${item.quantity} remaining`).join('\n')}

        Daily Sales Trend:
        ${dailySalesTrend.map(item => `${item.date}: $${item.totalAmount}`).join('\n')}

        Stockout Predictions (products at risk in next 14 days):
        ${prediction.map(item => `- ${item.productName}: ${item.currentStock} units left, selling ${item.salesPerDay.toFixed(1)} units/day, stockout in ${item.daysUntilStockOut.toFixed(1)} days`).join('\n')}

        Sales Comparison:
        Today: $${salesComparison.todayAmount} | Yesterday: $${salesComparison.yesterdayAmount} | Daily Change: ${salesComparison.dailyChange !== null ? salesComparison.dailyChange.toFixed(1) + '%' : 'N/A'}
        This Week: $${salesComparison.thisWeekAmount} | Last Week: $${salesComparison.lastWeekAmount} | Weekly Change: ${salesComparison.weeklyChange !== null ? salesComparison.weeklyChange.toFixed(1) + '%' : 'N/A'}
`
    return prompt
}

/**
 * Generate AI Insight
 * Main function to generate AI-powered business insights
 * Fetches analytics data, formats it into a prompt, and uses Groq LLM to generate insights
 * 
 * @param {string} storeId - Store ID to generate insights for
 * @returns {Object} Parsed JSON insight with summary, title, type, severity, and insights array
 */
export const generateAIInsight = async(storeId) => {
    const data = await fetchAnalyticsData(storeId)
    const prompt = formatAnalyticsData(data)

    const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
    });

    const response = await groq.chat.completions.create({
          "messages": [
            {
            "role": "user",
            "content": prompt
            }
        ],
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "temperature": 1,
        "max_completion_tokens": 1024,
        "top_p": 1,
        "stream": false,
        "stop": null
    })

    const text = response.choices[0].message.content
    const cleaned = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleaned)
    return parsed
}

