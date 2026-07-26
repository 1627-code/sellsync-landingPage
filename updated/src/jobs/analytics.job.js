/**
 * Analytics Job
 * Scheduled job that runs daily to generate AI insights and send reports
 * Uses node-cron to run at midnight every day (0 0 * * *)
 * 
 * Operations performed:
 * 1. Generate AI insights for each active store
 * 2. Create insight records in database
 * 3. Send in-app notifications to store users
 * 4. Send email and WhatsApp alerts to store owners
 * 5. Send daily sales reports
 */

import cron from "node-cron"
import prisma from "../lib/prisma.js"
import { generateAIInsight } from "../services/ai.service.js"

import { sendAIInsightEmail, sendDailyReportEmail } from "../services/email.service.js"
import { getSalesComparison } from "../services/analytics.service.js"
import { sendAIInsightWhatsApp } from "../services/whatsapp.service.js"

/**
 * Run Daily Analytics
 * Main function that executes daily analytics tasks for all active stores
 * Skips stores that already have insights generated in the last 24 hours
 */
const runDailyAnalytics = async () => {
    try {
        // Retrieve all stores owned by the authenticated manager
        const stores = await prisma.store.findMany({
            where: { 
                isActive:true 
            }
        });

        // Check if manager has any stores
        // findMany returns empty array [] if nothing found, so check length
        if(!stores.length) {console.log("Store not found!")}

        for (const store of stores) {
            try {
                const insight = await generateAIInsight(store.id);
                
                console.log("Generated insight:", insight)
                // const recentInsight = await prisma.insight.findFirst({
                //     where: {
                //         storeId: store.id,
                //         productId: null,
                //         createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                //     }
                // })

                // if(recentInsight) {
                //     console.log(`Skipping store ${store.id} — insight already generated in last 24 hours`)
                //     continue
                // }
                await prisma.insight.create({
                    data: {
                        storeId: store.id,
                        type: insight.type,
                        severity: insight.severity,
                        title: insight.title,      // short title
                        summary: insight.summary,  // full summary
                        message: JSON.stringify(insight.insights)
                    }
                })


                // get all users in the store
                const storeUsers = await prisma.user.findMany({
                    where: { storeId : store.id }
                })

                // Get the store owner
                const storeInfo = await prisma.store.findUnique({
                    where: { id: store.id },
                    select: { ownerId: true }
                })

                // Combine both
                const allUsers = [...storeUsers.map(u => u.id), storeInfo.ownerId]

                await prisma.notification.createMany({
                    data: allUsers.map(userId => ({
                        userId,
                        storeId: store.id,
                        title: insight.title,
                        message: insight.summary
                    }))
                })

                // Get store owner email
                const owner = await prisma.user.findUnique({
                    where: { id: store.ownerId },
                    select: { email: true }
                })

                // Send AI insight email
                try {
                    await sendAIInsightEmail(
                        owner.email,
                        store.name,
                        insight.title,
                        insight.summary,
                        insight.insights
                    )
                    await new Promise(resolve => setTimeout(resolve, 10000))
                    const salesData = await getSalesComparison(store.id)
                    await sendDailyReportEmail(owner.email, store.name, salesData)

                    const ownerPhone = await prisma.user.findUnique({
                        where: { id: store.ownerId },
                        select: { phone: true }
                    })

                    if(ownerPhone.phone) {
                        await sendAIInsightWhatsApp(
                            ownerPhone.phone,
                            store.name,
                            insight.title,
                            insight.summary
                        )
                    }
                } catch (error) {
                    console.log("Message sending failed:", error.message)
                }
                await new Promise(resolve => setTimeout(resolve, 10000))
            } catch (error) {
                console.error("Error generating AI insight for store ", store.id, ": ", error)
            }
        }

    } catch (error) {
       console.error("Internal Server error: ", error)
    }
}
cron.schedule("0 0 * * *", runDailyAnalytics)
export { runDailyAnalytics }