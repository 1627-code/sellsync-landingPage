/**
 * Reset Password Controller
 * Completes the password reset process by validating the token and updating the password
 * Works in conjunction with the forgot password flow
 */

import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";

/**
 * Reset Password Controller
 * Validates the reset token and updates user's password to a new value
 * Token is provided via email link from the forgot password process
 * 
 * @desc    Reset user password using token
 * @route   POST /api/auth/reset-Password?token=<reset_token>
 * @access  Public (token-based authentication)
 * 
 * @param {Object} req - Express request object with new password in body and token in query params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message and user data or error message
 */
const resetPassword = async(req, res) => {
    try {
        // Extract new password from request body
        const { password } = req.body;

        // Extract reset token from URL query parameters
        const { token } = req.query;

        // Find user by reset password token
        const user = await prisma.user.findUnique({
            where: {
                resetPasswordToken: token
            }
        });

        // Return error if token doesn't match any user
        // Token could be invalid, already used, or never existed
        if(!user) return res.status(400).json({
            message: "Invalid token"
        });

        // Check if token has expired (tokens are valid for 24 hours)
        // Compare token expiration date with current date/time
        if(user.resetPasswordExpiry && user.resetPasswordExpiry < new Date()) {
            return res.status(400).json({
                message: "Token expired!"
            });
        }

        // Update user's password and clear reset token fields
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: await bcrypt.hash(password, 10),  // Hash new password with 10 salt rounds
                passwordChangedAt: new Date(),
                resetPasswordToken: null,                    // Clear token to prevent reuse
                resetPasswordExpiry: null                    // Clear expiration date
            }
        });

        // Return success response with user details
        // User can now log in with their new password
        res.status(201).json({
            success: true,
            message: "Password changed successfully! You can now log in.",
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
};

// Export reset password controller function for use in routes
export { resetPassword };