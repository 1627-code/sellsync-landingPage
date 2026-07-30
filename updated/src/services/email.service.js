/**
 * Email Service
 * Handles sending transactional emails using Nodemailer
 * Configured for development (Mailtrap) and production (Gmail) environments
 */

import nodemailer from 'nodemailer';

/**
 * Email Transporter Configuration
 * Creates a reusable transporter instance for sending emails
 * 
 * DEVELOPMENT: Uses Mailtrap for testing emails without sending to real addresses
 * PRODUCTION: Uses Gmail SMTP for sending real emails (commented out)
 */
const isProduction = process.env.NODE_ENV === "production";

const transporter = nodemailer.createTransport(isProduction ? {
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    }
} : {
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASSWORD,
    },
});


const LOGO = `
<div style="text-align:center; background-color:#2980B9; padding:20px;">
    <img src="https://github.com/1627-code/Sellsync/blob/new-project/logo.png" width="120" style="display:block; margin:0 auto;" />
</div>`

/**
 * Send Verification Email
 * Sends an email with a verification link to newly registered users
 * Link contains a unique token that expires in 24 hours
 * 
 * @param {string} email - Recipient's email address
 * @param {string} url - Verification URL with embedded token (e.g., https://yourapp.com/verify?token=abc123)
 * @returns {Promise<void>} Resolves when email is sent successfully
 * @throws {Error} If email sending fails
 * 
 * @example
 * const verifyUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;
 * await sendVerificationEmail(user.email, verifyUrl);
 */
export const sendVerificationEmail = async (email, url) => {
    // Send email using configured transporter
    await transporter.sendMail({
        from: '"Sellsync" <noreply@Sellsync.com>',  // Sender display name and email
        to: email,                                   // Recipient's email address
        subject: "Verify your email",                // Email subject line
        html: `
            ${LOGO}
            <p>Click the link below to verify your account:</p>
            <a href="${url}">Verify Email</a>
            <p>This link expires in 24 hours.</p>
        `,  // HTML email body with verification link and expiration notice
    });
};

/**
 * Send Password Reset Email
 * Sends an email with a password reset link to users who requested it
 * Link contains a unique token that expires in 24 hours
 * 
 * @param {string} email - Recipient's email address
 * @param {string} url - Password reset URL with embedded token
 * @returns {Promise<void>} Resolves when email is sent successfully
 */
export const sendResetEmail = async (email, code) => {
    await transporter.sendMail({
        from: '"Sellsync" <noreply@Sellsync.com>',
        to: email,
        subject: "Your Password Reset Code",
        html: `
            ${LOGO}
            <p>Your password reset code is:</p>
            <div style="text-align:center;margin:24px 0;">
              <span style="display:inline-block;font-size:32px;font-weight:bold;letter-spacing:8px;background:#f0f4ff;padding:16px 32px;border-radius:12px;color:#2979FF;">${code}</span>
            </div>
            <p>This code expires in 15 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        `,
    });
}

/**
 * Send Low Stock Alert Email
 * Notifies store owners when product inventory falls below threshold
 * Includes list of affected products with current stock levels
 * 
 * @param {string} email - Recipient's email address (store owner)
 * @param {string} storeName - Name of the store with low stock
 * @param {Array} products - Array of products with low stock (productName, quantity, lowThreshold)
 * @returns {Promise<void>} Resolves when email is sent successfully
 */
export const sendLowStockEmail = async (email, storeName, products) => {
    await transporter.sendMail({
        from: '"SellSync" <noreply@sellsync.com>',
        to: email,
        subject: `⚠️ Low Stock Alert — ${storeName}`,
        html: `
            ${LOGO}
            <h2>Low Stock Alert</h2>
            <p>The following products in <strong>${storeName}</strong> are running low:</p>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr>
                    <th>Product</th>
                    <th>Remaining</th>
                    <th>Threshold</th>
                </tr>
                ${products.map(p => `
                    <tr>
                        <td>${p.productName}</td>
                        <td>${p.quantity}</td>
                        <td>${p.lowThreshold}</td>
                    </tr>
                `).join('')}
            </table>
            <p>Please restock immediately to avoid stockouts.</p>
        `
    })
}

/**
 * Send AI Insight Email
 * Sends daily AI-generated insights and analytics to store owners
 * Includes key insights and recommendations for business improvement
 * 
 * @param {string} email - Recipient's email address (store owner)
 * @param {string} storeName - Name of the store
 * @param {string} title - Title of the insight report
 * @param {string} summary - Summary of the insights
 * @param {Array} insights - Array of insight objects (title, message)
 * @returns {Promise<void>} Resolves when email is sent successfully
 */
export const sendAIInsightEmail = async (email, storeName, title, summary, insights) => {
    await transporter.sendMail({
        from: '"SellSync" <noreply@sellsync.com>',
        to: email,
        subject: `📊 Daily Insight — ${storeName}`,
        html: `
            ${LOGO}
            <h2>${title}</h2>
            <p>${summary}</p>
            <h3>Key Insights</h3>
            <ul>
                ${insights.map(i => `
                    <li>
                        <strong>${i.title}</strong><br/>
                        ${i.message}
                    </li>
                `).join('')}
            </ul>
            <p>Login to SellSync to view full analytics.</p>
        `
    })
}

/**
 * Send Daily Sales Report Email
 * Sends a daily summary of sales performance to store owners
 * Includes today's revenue, comparison with yesterday/week, and percentage changes
 * 
 * @param {string} email - Recipient's email address (store owner)
 * @param {string} storeName - Name of the store
 * @param {Object} data - Sales data object (todayAmount, yesterdayAmount, thisWeekAmount, lastWeekAmount, dailyChange, weeklyChange)
 * @returns {Promise<void>} Resolves when email is sent successfully
 */
export const sendDailyReportEmail = async (email, storeName, data) => {
    await transporter.sendMail({
        from: '"SellSync" <noreply@sellsync.com>',
        to: email,
        subject: `📈 Daily Report — ${storeName}`,
        html: `
            ${LOGO}
            <h2>Daily Report — ${storeName}</h2>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr><td><strong>Today's Revenue</strong></td><td>₦${data.todayAmount}</td></tr>
                <tr><td><strong>Yesterday's Revenue</strong></td><td>₦${data.yesterdayAmount}</td></tr>
                <tr><td><strong>This Week</strong></td><td>₦${data.thisWeekAmount}</td></tr>
                <tr><td><strong>Last Week</strong></td><td>₦${data.lastWeekAmount}</td></tr>
                <tr><td><strong>Daily Change</strong></td><td>${data.dailyChange !== null ? data.dailyChange.toFixed(1) + '%' : 'N/A'}</td></tr>
                <tr><td><strong>Weekly Change</strong></td><td>${data.weeklyChange !== null ? data.weeklyChange.toFixed(1) + '%' : 'N/A'}</td></tr>
            </table>
            <p>Login to SellSync for full analytics and AI insights.</p>
        `
    })
}