/**
 * Analytics Service
 * Provides data aggregation and calculation functions for sales analytics
 * Used by AI insights and scheduled reporting jobs
 */

import prisma from "../lib/prisma.js";

/**
 * Get Sales Summary
 * Calculates total revenue and transaction count for a store in the last 7 days
 * 
 * @param {string} id - Store ID
 * @returns {Object} Summary with _sum.totalAmount and _count.id
 */
const getSummary = async (id) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Set startDate to 7 days ago

    const summary = await prisma.transaction.aggregate({
        where: { 
            storeId: id,
            createdAt: {
                gte: new Date(startDate),
                lte: new Date()     // Current date
            }
        },
        _sum: { totalAmount: true },  // Total revenue for the period
        _count: { id: true }           // Total number of transactions
    });
    return summary;
}


/**
 * Get Top Products
 * Retrieves the top 5 best-selling products by total quantity sold
 * Includes product names for display purposes
 * 
 * @param {string} id - Store ID
 * @returns {Array} Array of top products with productId, quantity, productName
 */
const getTopProducts = async(id) => {
    const highestSellingProducts = await prisma.transactionItem.groupBy({
            by: ['productId'],
            where: {
                transaction:{
                    storeId: id
                }  
            },
            _sum: {
                quantity: true, // Sum the quantity for each product
            },
            orderBy: {
                _sum: {
                    quantity: 'desc', // Order by highest quantity
                },
            },
            take: 5, // Take the top 5 products
        });

        // Now, to include the product names, you can fetch the product details separately
        const productIds = highestSellingProducts.map(item => item.productId);
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
            },
        });

        // Combine the results
        const topProductsWithNames = highestSellingProducts.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
                productId: item.productId,
                quantity: item._sum.quantity,
                productName: product ? product.name : null, // Include product name
            };
        });
        return topProductsWithNames;
} 

/**
 * Get Low Stock Products
 * Retrieves all products where current quantity is at or below the low threshold
 * Used for inventory alerts and AI insights
 * 
 * @param {string} id - Store ID
 * @returns {Array} Array of low stock products with productId, quantity, productName
 */
const getLowStockProducts = async(id) => {
    const lowStockItems = await prisma.inventory.findMany({
        where: {
            product:{
                storeId: id
            }
        }
    })

    const filteredItems = lowStockItems.filter(item => item.quantity <= item.lowThreshold)

            // Now, to include the product names, you can fetch the product details separately
    const productIds = filteredItems.map(item => item.productId);
    const products = await prisma.product.findMany({
        where: {
            id: { in: productIds },
        },
    });

    // Combine the results
    const lowStockProductWithNames = filteredItems.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
            productId: item.productId,
            quantity: item.quantity,
            productName: product ? product.name : null, // Include product name
        };
    });

    return lowStockProductWithNames;
}

/**
 * Get Daily Sales Trend
 * Calculates daily revenue for the last 7 days
 * Returns data formatted for trend charts
 * 
 * @param {string} storeId - Store ID
 * @returns {Array} Array of { date, totalAmount } objects
 */
const getDailySalesTrend = async (storeId) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const transactions = await prisma.transaction.findMany({
        where: {
            storeId: storeId,
            createdAt: {
                gte: startDate,
                lte: new Date(),
            },
        },
        select: {
            createdAt: true,
            totalAmount: true,
        }
    });

    const grouped = transactions.reduce((acc, transaction) => {
        const date = transaction.createdAt.toISOString().split('T')[0];
        if (acc[date]) {
            acc[date] += transaction.totalAmount;
        } else {
            acc[date] = transaction.totalAmount;
        }
        return acc;
    }, {});

    return Object.entries(grouped).map(([date, totalAmount]) => ({
        date,
        totalAmount,
    }));
}

/**
 * Get Transaction Count
 * Counts total number of transactions in the last 7 days
 * 
 * @param {string} id - Store ID
 * @returns {number} Total transaction count
 */
const getCount = async (id) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Set startDate to 7 days ago

    const count = await prisma.transaction.count({
        where: { 
            storeId: id,
            createdAt: {
                gte: new Date(startDate),
                lte: new Date()     // Current date
            }
        },
    });
    return count;
}

/**
 * Get Stock Out Prediction
 * Predicts which products will run out of stock within 14 days
 * Based on average daily sales over the last 7 days
 * 
 * @param {string} id - Store ID
 * @returns {Array} Array of products with daysUntilStockOut prediction
 */
const getStockOutPrediction = async (id) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Set startDate to 7
    //  days ago

    const predictions = []

    const productItems = await prisma.inventory.findMany({
        where: {
            product:{
                storeId: id
            }
        },
    })
    
    const quantitySold = await prisma.transactionItem.groupBy({
            by: ['productId'],
            where: {
                transaction:{
                    storeId: id,
                    createdAt: { gte: startDate }
                }  
            },
            _sum: {
                quantity: true, // Sum the quantity for each product
            },
            orderBy: {
                _sum: {
                    quantity: 'desc', // Order by highest quantity
                },
            },
        });

        // Now, to include the product names, you can fetch the product details separately
        const productIds = productItems.map(item => item.productId);
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
            },
        });
    

    for (const product of productItems) {
        const productInfo = products.find(p => p.id === product.productId);

        const soldData = quantitySold.find(q => q.productId === product.productId)

        const unitsSold = soldData ? soldData._sum.quantity : 0
        const salesPerDay = unitsSold / 7
        if(salesPerDay === 0) {continue}
        const daysUntilStockOut = product.quantity / salesPerDay
        
        if(daysUntilStockOut <= 14) {
            predictions.push({
                productId: product.productId,
                productName: productInfo.name || null,
                currentStock: product.quantity,
                salesPerDay,
                daysUntilStockOut
            })
        }
    }
    return predictions
}

/**
 * Get Sales Comparison
 * Compares today's and this week's sales with yesterday and last week
 * Calculates percentage changes for performance tracking
 * 
 * @param {string} id - Store ID
 * @returns {Object} Comparison data with amounts and percentage changes
 */
const getSalesComparison = async(id) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // start of today

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0) // start of yesterday

    const thisWeekStart = new Date()
    thisWeekStart.setDate(thisWeekStart.getDate() - 7)

    const lastWeekStart = new Date()
    lastWeekStart.setDate(lastWeekStart.getDate() - 14)

    const salesToday = await prisma.transaction.aggregate({
        where: {
            storeId: id,
            createdAt: { gte: today}
        },
        _sum: { totalAmount: true}
    })

    const salesYesterday = await prisma.transaction.aggregate({
        where: {
            storeId: id,
            createdAt: { gte: yesterday, lte: today}
        },
        _sum: { totalAmount: true}
    })

    const salesThisWeek = await prisma.transaction.aggregate({
        where: {
            storeId: id,
            createdAt: { gte: thisWeekStart}
        },
        _sum: { totalAmount: true}
    })

    const salesLastWeek = await prisma.transaction.aggregate({
        where: {
            storeId: id,
            createdAt: { gte: lastWeekStart,
                lte: thisWeekStart
            },

        },
        _sum: { totalAmount: true}
    })

    const todayAmount = salesToday._sum.totalAmount ?? 0
    const yesterdayAmount = salesYesterday._sum.totalAmount ?? 0
    const thisWeekAmount = salesThisWeek._sum.totalAmount ?? 0
    const lastWeekAmount = salesLastWeek._sum.totalAmount ?? 0

    const dailyChange = yesterdayAmount === 0 ? null : ((todayAmount - yesterdayAmount) / yesterdayAmount) * 100
    const weeklyChange = lastWeekAmount === 0 ? null : ((thisWeekAmount - lastWeekAmount) / lastWeekAmount) * 100

    return {
        todayAmount,
        yesterdayAmount,
        thisWeekAmount,
        lastWeekAmount,
        dailyChange,
        weeklyChange
    }

}



/**
 * Fetch All Analytics Data
 * Aggregates all analytics data for a store in a single function call
 * Used by AI service to generate comprehensive insights
 * 
 * @param {string} storeId - Store ID
 * @returns {Object} Complete analytics data including summary, top products, low stock, trends, predictions, and comparisons
 */
const fetchAnalyticsData = async(storeId) => {
    const summary = await getSummary(storeId);
    const topProducts = await getTopProducts(storeId);
    const lowStockProducts = await getLowStockProducts(storeId);
    const dailySalesTrend = await getDailySalesTrend(storeId);
    const transactionCount = await getCount(storeId);
    const prediction = await getStockOutPrediction(storeId)
    const salesComparison = await getSalesComparison(storeId)

    return {
        summary,
        topProducts,
        lowStockProducts,
        dailySalesTrend,
        transactionCount,
        prediction,
        salesComparison
    };
} 

export { fetchAnalyticsData, getSalesComparison };