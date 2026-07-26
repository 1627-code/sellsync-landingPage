/**
 * Cashier Management Controller
 * Handles CRUD operations for cashier accounts within a manager's store
 * All operations are restricted to managers and scoped to their store
 */

import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { sendVerificationEmail } from "../services/email.service.js";
import crypto from "crypto";
import logAction from "../utils/auditLog.js"

/**
 * Create Cashier Controller
 * Registers a new cashier account under the authenticated manager's store
 * 
 * @desc    Create Cashier
 * @route   POST /api/cashiers/:storeId/create
 * @access  Role: "MANAGER"
 * 
 * @param {Object} req - Express request object containing name, email, and password in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with verification message or error
 */
const createCashier = async(req, res) => {
    try {
        // Extract cashier registration data from request body
        const { name, email, password } = req.body;

        // Validate that all required fields are provided
        if(!name || !email || !password) return res.status(404).json({
            message: "All fields required!"
        });

        // Validate email format using regex
        // Ensures email contains @ symbol and domain extension
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format",
            });
        }

        // Validate password strength
        // Minimum 8 characters required for security
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long",
            });
        }

        // Check if a user with this email already exists in the database
        const existing = await prisma.user.findUnique({
            where: { email },
        });

        // Prevent duplicate account creation
        if(existing) {
            return res.status(400).json({
                message: "User already exists!"
            });
        }

        // Retrieve the authenticated manager's store
        // Cashier will be associated with this store
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId,
                ownerId: req.user.id 
            }
        });

        // Ensure manager has a store before creating cashier
        if(!store) return res.status(404).json({ 
            message: "No store found!" 
        });

        // Generate random verification token (32 bytes converted to hex string)
        const token = crypto.randomBytes(32).toString("hex");
        
        // Set token expiration to 24 hours from now
        const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24);

        // Create new cashier user in the database
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: await bcrypt.hash(password, 10),  // Hash password with 10 salt rounds
                role: "CASHIER",                             // Assign cashier role
                storeId: store.id,                           // Link to manager's store
                createdById: req.user.id,                    // Track which manager created this cashier
                isVerified: false,                           // Cashier must verify email before login
                verificationToken: token,                    // Store token for verification
                tokenExpiresAt: expiry,                      // Token expires in 24 hours
            }
        });

        await logAction({ 
            userId: req.user.id, 
            action: "CREATE_CASHIER", 
            entity: "User", 
            entityId: user.id, 
            storeId: store.id 
        })

        // Construct verification URL with token
        const verifyUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;

        // Send verification email to cashier's email address
        await sendVerificationEmail(email, verifyUrl);

        // Return success message prompting cashier to check their email
        res.json({ message: "Check your email to verify your account." });

    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", error
        });
    }
};

/**
 * Get Cashiers Controller
 * Retrieves all cashier accounts associated with the authenticated manager's store
 * 
 * @desc    Get Cashiers
 * @route   GET /api/cashiers/:storeId
 * @access  Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with authenticated manager data
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of cashiers or error message
 */
const getCashiers = async(req, res) => {
    try {
        // Retrieve the authenticated manager's store
        const store = await prisma.store.findFirst({
            where: {
                id: req.params.storeId,
                ownerId: req.user.id
            }
        });

        if(!store) return res.status(404).json({ message: "Store not found" })

        // Get all cashiers registered under the manager's store
        // Only returns cashiers with CASHIER role for security
        const cashiers = await prisma.user.findMany({
            where: {
                storeId: store.id,
                role: "CASHIER"
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                storeId: true,
                createdAt: true,
                isActive: true,
                // password is NOT selected for security
            }
        });

        // Return list of cashiers
        res.status(200).json({
            success: true,
            cashiers
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", error
        });
    }
};

/**
 * Get Cashier By ID Controller
 * Retrieves a specific cashier's details by their ID
 * Ensures the cashier belongs to the authenticated manager's store
 * 
 * @desc    Get Cashier by Id
 * @route   GET /api/cashiers/:storeId/:id
 * @access  Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with cashier ID in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with cashier data or error message
 */
const getCashier = async(req, res) => {
    try {
        // Retrieve the authenticated manager's store
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId,
                ownerId: req.user.id 
            }
        });

        // Ensure manager has a store
        if(!store) return res.status(404).json({ 
            message: "Store not found" 
        });

        // Find cashier by ID with security checks
        // Ensures cashier belongs to manager's store and has CASHIER role
        const cashier = await prisma.user.findUnique({
            where: { 
                id: req.params.id,
                storeId: store.id,  // Security: Prevent cross-store access
                role: "CASHIER"     // Security: Ensure user is actually a cashier
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                storeId: true,
                createdAt: true,
                isActive: true,
            }
        });

        // Return error if cashier not found or doesn't belong to this store
        if(!cashier) return res.status(404).json({ 
            message: "Cashier not found" 
        });

        // Return cashier details
        res.status(200).json({ 
            success: true, 
            data: cashier 
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", error
        });
    }
};


/**
 * Deactivate Cashier Controller
 * Disables a cashier account, preventing them from logging in
 * Does not delete the account, allowing for potential reactivation
 * 
 * @desc    Deactivate Cashier
 * @route   PATCH /api/cashiers/:storeId/deactivate/:id
 * @access  Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with cashier ID in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming deactivation or error message
 */
const deactivateCashier = async (req, res) => {
    try {
        // Retrieve the authenticated manager's store
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId,
                ownerId: req.user.id 
            }
        });

        // Ensure manager has a store
        if(!store) return res.status(404).json({ 
            message: "Store not found" 
        });

        // Find cashier by ID with security checks
        // Ensures cashier belongs to manager's store and has CASHIER role
        const cashier = await prisma.user.findUnique({
            where: { 
                id: req.params.id,
                storeId: store.id,  // Security: Prevent cross-store access
                role: "CASHIER"     // Security: Ensure user is actually a cashier
            }
        });

        // Return error if cashier not found or doesn't belong to this store
        if(!cashier) return res.status(404).json({ 
            message: "Cashier not found" 
        });

        // Set isActive flag to false
        // Cashier will be unable to log in but account data is preserved
        const deactivated = await prisma.user.update({
            where: { id: req.params.id },
            data: { isActive: false }
        });

        await logAction({ 
            userId: req.user.id, 
            action: "DEACTIVATE_CASHIER", 
            entity: "User", 
            entityId: cashier.id, 
            storeId: store.id 
        })

        // Return success confirmation
        res.status(200).json({
            message: "Cashier deactivated successfully!", 
            data: deactivated
        });
    } catch (error) {
        // Log and return server error with detailed error message
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
};

const reactivateCashier = async (req, res) => {
    try {
        // Retrieve the authenticated manager's store
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId,
                ownerId: req.user.id 
            }
        });

        // Ensure manager has a store
        if(!store) return res.status(404).json({ 
            message: "Store not found" 
        });

        // Find cashier by ID with security checks
        // Ensures cashier belongs to manager's store and has CASHIER role
        const cashier = await prisma.user.findUnique({
            where: { 
                id: req.params.id,
                storeId: store.id,  // Security: Prevent cross-store access
                role: "CASHIER"     // Security: Ensure user is actually a cashier
            }
        });

        // Return error if cashier not found or doesn't belong to this store
        if(!cashier) return res.status(404).json({ 
            message: "Cashier not found" 
        });

        // Set isActive flag to false
        // Cashier will be unable to log in but account data is preserved
        const deactivated = await prisma.user.update({
            where: { id: req.params.id },
            data: { isActive: true }
        });

        await logAction({ 
            userId: req.user.id, 
            action: "REACTIVATE_CASHIER", 
            entity: "User", 
            entityId: cashier.id, 
            storeId: store.id 
        })

        // Return success confirmation
        res.status(200).json({
            message: "Cashier reactivated successfully!", 
            data: deactivated
        });
    } catch (error) {
        // Log and return server error with detailed error message
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
};

// Export all cashier management controller functions for use in routes
export { createCashier, getCashiers, getCashier, deactivateCashier, reactivateCashier };