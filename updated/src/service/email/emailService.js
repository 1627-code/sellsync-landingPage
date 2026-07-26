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
const transporter = nodemailer.createTransport({
    // Production Configuration (Gmail)
    // Uncomment these lines for production use with Gmail
    // Requires Gmail app password (not regular password) for security
//   service: 'gmail', // or 'smtp.gmail.com'
//   auth: {
//     user: process.env.EMAIL_USER, // Your Gmail address
//     pass: process.env.EMAIL_PASSWORD // Your Gmail app password (16-character code)
//   }

  // Development Configuration (Mailtrap)
  // Mailtrap catches emails for testing without delivering to real inboxes
  // Sign up at https://mailtrap.io for free testing credentials
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_USER,      // Mailtrap username from environment variables
    pass: process.env.MAILTRAP_PASSWORD,  // Mailtrap password from environment variables
  },
});

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
            <p>Click the link below to verify your account:</p>
            <a href="${url}">Verify Email</a>
            <p>This link expires in 24 hours.</p>
        `,  // HTML email body with verification link and expiration notice
    });
};

export const sendResetEmail = async (email, url) => {
    // Send email using configured transporter
    await transporter.sendMail({
        from: '"Sellsync" <noreply@Sellsync.com>',  // Sender display name and email
        to: email,                                   // Recipient's email address
        subject: "Reset email link",                // Email subject line
        html: `
            <p>Click the link below to reset your password:</p>
            <a href="${url}">Reset password</a>
            <p>This link expires in 24 hours.</p>
        `,  // HTML email body with reset link and expiration notice
    });
}