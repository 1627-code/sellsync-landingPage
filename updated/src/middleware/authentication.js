/**
 * Authentication and Authorization Middleware
 * Provides token-based authentication and role-based access control
 * Used to protect routes and restrict access based on user roles
 */

import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";

/**
 * Authorization Middleware (Role-Based Access Control)
 * Restricts route access to users with specific roles
 * Must be used after the protect middleware to ensure req.user is populated
 * 
 * @param {...string} roles - One or more allowed roles (e.g., "MANAGER", "CASHIER")
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Only allow managers to access this route
 * router.post("/stores", protect, authorize("MANAGER"), createStore);
 * 
 * @example
 * // Allow both managers and cashiers
 * router.get("/products", protect, authorize("MANAGER", "CASHIER"), getProducts);
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        // Check if user's role is included in the allowed roles list
        if(!roles.includes(req.user.role)){
            return res.status(403).json({
                message: `User role '${req.user.role}' is not authorized`
            });
        }
        // User has required role, proceed to next middleware/route handler
        next();
    };
};

/**
 * Authentication Middleware (Token Protection)
 * Validates JWT token and attaches authenticated user to request object
 * Verifies token signature and retrieves user data from database
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON error response if authentication fails, otherwise calls next()
 * 
 * @example
 * // Protect a route - requires valid JWT token
 * router.get("/profile", protect, getProfile);
 * 
 * @example
 * // Combine with authorization for role-specific access
 * router.post("/cashiers", protect, authorize("MANAGER"), createCashier);
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    // Expected format: "Bearer <token>"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Return error if no token is provided
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized!'
      });
    }


    // Verify token signature and expiration using JWT_SECRET
    // Throws error if token is invalid, expired, or tampered with
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Retrieve user data from database using ID from decoded token
    // This ensures we have the most current user information
    req.user = await prisma.user.findUnique({
        where: {
            id: decoded.id,
        }
    });

    // Return error if user no longer exists in database
    // Handles cases where user was deleted after token was issued
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    // check if password was changed after token was issued
    if(req.user.passwordChangedAt) {
        const tokenIssuedAt = new Date(decoded.iat * 1000) // jwt iat is in seconds
        if(req.user.passwordChangedAt > tokenIssuedAt) {
            return res.status(401).json({ message: "Password recently changed. Please log in again." })
        }
    }

    // Authentication successful, attach user to request and proceed
    // req.user is now available in subsequent middleware and route handlers
    next();
  } catch (error) {
    // Handle any token verification errors (invalid signature, expired, malformed)
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }
};

// Export middleware functions for use in route protection
export { authorize, protect };