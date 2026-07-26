/**
 * Email Verification Controller
 * Handles email verification for newly registered users
 * Validates verification tokens and activates user accounts
 */

import prisma from "../lib/prisma.js";

/**
 * Verify Email Controller
 * Validates the email verification token and activates the user account
 * Token is sent to user's email during registration
 * 
 * @desc    Verify user email address
 * @route   GET /api/auth/verify-email?token=<verification_token>
 * @access  Public (token-based authentication)
 * 
 * @param {Object} req - Express request object with verification token in query params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with verification status and user data or error message
 */
const verifyEmail = async (req, res) => {
    try {
        // Extract verification token from URL query parameters
        const { token } = req.query;

        // Find user by verification token
        const user = await prisma.user.findUnique({
            where: {
                verificationToken: token
            }
        });

        const landingUrl = process.env.LANDING_URL || "https://sellsync-frontend.vercel.app";

        // Return error if token doesn't match any user
        if(!user) return res.redirect(`${landingUrl}/verify-failed?reason=invalid`);

        // Check if token has expired (tokens are valid for 24 hours)
        if(user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
            return res.redirect(`${landingUrl}/verify-failed?reason=expired`);
        }

        // Update user account to verified status
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationToken: null,
                tokenExpiresAt: null,
            },
        });

        res.redirect(`${landingUrl}/verify-success`);
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};

// Export email verification controller function for use in routes
export { verifyEmail };