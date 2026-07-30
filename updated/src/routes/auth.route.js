/**
 * Authentication Routes
 * Defines all API endpoints related to user authentication and account management
 * Includes registration, login, email verification, password reset, and profile operations
 */

import { Router } from "express";
import { signUp, login, getMe, updateUser, forgotPassword, deactivateUser } from "../controller/auth.controller.js";
import { verifyEmail } from "../controller/verifyEmail.controller.js";
import { resetPassword } from "../controller/resetPassword.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

// Create a new router instance for authentication-related routes
const router = Router();

/**
 * POST /api/auth/signUp
 * Register a new user account (Manager role)
 * Sends verification email after successful registration
 * Access: Public
 */
router.post("/signUp", signUp);

/**
 * GET /api/auth/verify-email?token=<verification_token>
 * Verify user's email address using token from registration email
 * Activates the user account upon successful verification
 * Access: Public (token-based)
 */
router.get("/verify-email", verifyEmail);

/**
 * POST /api/auth/forgotPassword
 * Request password reset link
 * Sends reset email with token to user's registered email address
 * Access: Public
 */
router.post("/forgotPassword", forgotPassword);

/**
 * POST /api/auth/reset-Password
 * Reset user password using token from forgot password email
 * Updates password and clears reset token
 * Access: Public (token-based)
 */
router.post("/reset-password", resetPassword);

/**
 * POST /api/auth/login
 * Authenticate user and receive JWT token
 * Requires verified email and active account status
 * Access: Public
 */
router.post("/login", login);

/**
 * PATCH /api/auth/update/:id
 * Update user information (name and email)
 * Access: Private (requires authentication)
 */
router.patch("/update", protect, updateUser);

/**
 * GET /api/auth/me
 * Get authenticated user's profile information
 * Returns current user data based on JWT token
 * Access: Private (requires authentication)
 */
router.get('/me', protect, getMe);

/**
 * PATCH /api/users/deactivate/:id
 * Deactivate manager's own account
 * Allows managers to deactivate themselves (self-deactivation)
 * Sets isActive to false, preventing login while preserving account data
 * Access: Private (authenticated users can deactivate their own account)
 */
router.patch("/deactivate/", protect, authorize("MANAGER"),deactivateUser);

// Export the router to be mounted in the main application at /api/auth
export default router;