/**
 * Analytics Controller
 * Handles retrieval of sales analytics and reporting data
 * Provides charts and trends for dashboard visualization
 */

import prisma from "../lib/prisma.js"

/**
 * Get Sales Trend Controller
 * Calculates daily sales revenue for the last 7 days
 * Used for line/area charts in the analytics dashboard
 * 
 * @desc    Get daily sales trend for last 7 days
 * @route   GET /api/analytics/:storeId/sales-trend
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of daily sales data
 */
const getSalesTrend = async (req, res) => {
    try {
        const store = await prisma.store.findFirst({
            where: { id: req.params.storeId, ownerId: req.user.id }
        })
        if(!store) return res.status(404).json({ message: "Store not found" })

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)

        const transactions = await prisma.transaction.findMany({
            where: { storeId: store.id, createdAt: { gte: startDate } },
            orderBy: { createdAt: "asc" }
        })

        const trend = {}
        for(const tx of transactions) {
            const date = tx.createdAt.toISOString().split("T")[0]
            if(!trend[date]) trend[date] = 0
            trend[date] += tx.totalAmount
        }

        const dailySales = Object.entries(trend).map(([date, revenue]) => ({ date, revenue }))

        res.status(200).json({ success: true, dailySales })

    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error: error.message })
    }
}

/**
 * Get Top Products Chart Controller
 * Retrieves the top 5 best-selling products by quantity sold in the last 7 days
 * Used for bar charts in the analytics dashboard
 * 
 * @desc    Get top 5 selling products
 * @route   GET /api/analytics/:storeId/top-products
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of top products
 */
const getTopProductsChart = async (req, res) => {
    try {
        const store = await prisma.store.findFirst({
            where: { id: req.params.storeId, ownerId: req.user.id }
        })
        if(!store) return res.status(404).json({ message: "Store not found" })

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)

        const items = await prisma.transactionItem.groupBy({
            by: ["productId"],
            where: { transaction: { storeId: store.id, createdAt: { gte: startDate } } },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: "desc" } },
            take: 5
        })

        const productIds = items.map(i => i.productId)
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } }
        })

        const topProducts = items.map(item => ({
            productName: products.find(p => p.id === item.productId)?.name,
            unitsSold: item._sum.quantity
        }))

        res.status(200).json({ success: true, topProducts })

    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error: error.message })
    }
}

/**
 * Get Sales By Category Controller
 * Calculates total revenue grouped by product category for the last 7 days
 * Used for pie/doughnut charts in the analytics dashboard
 * 
 * @desc    Get sales breakdown by category
 * @route   GET /api/analytics/:storeId/sales-by-category
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of category sales data
 */
const getSalesByCategory = async (req, res) => {
    try {
        const store = await prisma.store.findFirst({
            where: { id: req.params.storeId, ownerId: req.user.id }
        })
        if(!store) return res.status(404).json({ message: "Store not found" })

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)

        const items = await prisma.transactionItem.findMany({
            where: { transaction: { storeId: store.id, createdAt: { gte: startDate } } },
            include: { product: { select: { category: true } } }
        })

        const categoryMap = {}
        for(const item of items) {
            const category = item.product.category
            if(!categoryMap[category]) categoryMap[category] = 0
            categoryMap[category] += item.quantity * item.price
        }

        const salesByCategory = Object.entries(categoryMap).map(([category, revenue]) => ({
            category,
            revenue
        }))

        res.status(200).json({ success: true, salesByCategory })

    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error: error.message })
    }
}

/**
 * Get Hourly Sales Controller
 * Calculates total revenue grouped by hour of day for the last 7 days
 * Used to identify peak sales hours for staffing and inventory planning
 * 
 * @desc    Get sales breakdown by hour of day
 * @route   GET /api/analytics/:storeId/hourly-sales
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of hourly sales data
 */
const getHourlySales = async (req, res) => {
    try {
        const store = await prisma.store.findFirst({
            where: { id: req.params.storeId, ownerId: req.user.id }
        })
        if(!store) return res.status(404).json({ message: "Store not found" })

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)

        const transactions = await prisma.transaction.findMany({
            where: { storeId: store.id, createdAt: { gte: startDate } }
        })

        const hourlyMap = {}
        for(let i = 0; i < 24; i++) hourlyMap[i] = 0

        for(const tx of transactions) {
            const hour = new Date(tx.createdAt).getHours()
            hourlyMap[hour] += tx.totalAmount
        }

        const hourlySales = Object.entries(hourlyMap).map(([hour, revenue]) => ({
            hour: `${hour}:00`,
            revenue
        }))

        res.status(200).json({ success: true, hourlySales })

    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error: error.message })
    }
}

export { getSalesTrend, getTopProductsChart, getSalesByCategory, getHourlySales }