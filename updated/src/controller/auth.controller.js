/**
 * Authentication Controller
 * Handles user registration, login, profile retrieval, and user updates
 */

import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { sendVerificationEmail, sendResetEmail } from "../services/email.service.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import logAction from "../utils/auditLog.js"


/**
 * Generate JWT Token
 * Creates a signed JWT token for user authentication
 * 
 * @param {string} id - User ID to encode in the token
 * @returns {string} Signed JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE  // Token expiration time from environment variables
  });
};

/**
 * Sign Up Controller
 * Registers a new user with email verification
 * 
 * @desc    Register new user
 * @route   POST /api/auth/signup
 * @access  Public (but should be only accessible to admin through the UI)
 * 
 * @param {Object} req - Express request object containing name, email, and password in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with verification message or error
 */
const signUp = async (req, res) => {
    try {
        // Extract user registration data from request body
        const { name, email, password, phone } = req.body;

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

        // Generate random verification token (32 bytes converted to hex string)
        const token = crypto.randomBytes(32).toString("hex");
        
        // Set token expiration to 24 hours from now
        const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24);

        // Create new user in the database
        await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password: await bcrypt.hash(password, 10),  // Hash password with 10 salt rounds
                role: "MANAGER",                             // Default role assignment
                isVerified: false,                           // User must verify email before login
                verificationToken: token,                    // Store token for verification
                tokenExpiresAt: expiry,                      // Token expires in 24 hours
            }
        });

        // Construct verification URL with token
        const verifyUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;

        // Send verification email (don't fail signup if email fails)
        try {
            await sendVerificationEmail(email, verifyUrl);
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
        }

        // Return success message prompting user to check their email
        res.status(200).json({ message: "Check your email to verify your account." });
        
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", error
        });
    }
};


/**
 * Login Controller
 * Authenticates existing users and generates JWT token
 * 
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 * 
 * @param {Object} req - Express request object containing email and password in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with JWT token and user details or error message
 */
const login = async(req, res) => {
    try {
        // Extract login credentials from request body
        const {email, password} = req.body;

        // Validate that both email and password are provided
        if(!email || !password) return res.status(400).json({
            message: "All fields are required!"
        });

        // Find user by email in the database
        const user = await prisma.user.findUnique({
            where: { email }
        });

        // Return generic error if user doesn't exist
        // Using "Invalid credentials" instead of "User not found" for security
        if(!user) return res.status(404).json({
            message: "Invalid credentials!"
        });

        // Verify the provided password against stored hashed password
        const passMatch = await bcrypt.compare(password, user.password);

        // Return error if password doesn't match
        if(!passMatch) return res.status(400).json({
            message: "invalid credentials!"
        });

        // Check if user has verified their email
        // Prevent login for unverified accounts
        if(!user.isVerified) return res.status(403).json({ 
            message: "Please verify your email first." 
        });

        // Check if user account is active
        // Deactivated accounts cannot log in
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Contact administrator.'
            });
        }

        // Generate JWT token for authenticated session
        const token = generateToken(user.id);

        await logAction({ 
            userId: user.id, 
            action: "LOGIN", 
            entity: "User", 
            entityId: user.id 
        })

        // Return success response with token and user data (excluding password)
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            token
        });

    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", error
        });
    }
};


/**
 * Get Current User Controller
 * Retrieves the authenticated user's profile information
 * 
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private (requires authentication)
 * 
 * @param {Object} req - Express request object with authenticated user data in req.user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with user profile data
 */
const getMe = async (req, res, next) => {
  try {
    // Retrieve user data from database using authenticated user's ID
    // Password is explicitly excluded from the response for security
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            storeId: true,
            createdAt: true,
            // password is NOT selected for security
        }
    });

    // Return user profile data
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
};

/**
 * Update User Controller
 * Updates user information (name and email)
 * 
 * @desc    Update User
 * @route   PATCH /api/auth/update/:id
 * @access  Public (should likely be Private and restricted to user or admin)
 * 
 * @param {Object} req - Express request object with user ID in params and updated data in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated user data or error message
 */
const updateUser = async (req, res) => {
    try {
        
        // Retrieve user data from database using authenticated user's ID
        const user = await prisma.user.findUnique({
            where: { 
                id: req.user.id,
            }
        });

        // Return error if user not found
        if(!user) return res.status(404).json({ 
            message: "user not found" 
        });

        // Update user with new name and email from request body
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone
            }
        });
  
        // Return success response with updated user data
        res.status(201).json({
            success: true,
            message: "User updated successfully!", 
            data: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
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

/**
 * Forgot Password Controller
 * Initiates the password reset process by sending a reset link to the user's email
 * Generates a secure token and sends it via email for password reset verification
 * 
 * @desc    Request password reset link
 * @route   POST /api/auth/forgotPassword
 * @access  Public
 * 
 * @param {Object} req - Express request object containing email in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming email sent or error message
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if(!email) return res.status(400).json({
            message: "Email field required!"
        });

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if(!user) return res.status(404).json({
            message: "Invalid Credentials!"
        });

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Contact administrator.'
            });
        }

        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiry = new Date(Date.now() + 1000 * 60 * 15);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: code,
                resetPasswordExpiry: expiry
            }
        });

        await sendResetEmail(email, code);

        res.status(200).json({ 
            message: "If that email exists, a reset code has been sent.",
            email: email
        });

    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
};

/**
 * Deactivate User Controller
 * Deactivates any user account (Manager or Cashier)
 * Prevents the user from logging in while preserving account data
 * 
 * @desc    Deactivate a user account
 * @route   PATCH /api/users/deactivate/:id
 * @access  Private (should likely be restricted to ADMIN or self-deactivation only)
 * 
 * @param {Object} req - Express request object with user ID in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming deactivation or error message
 */
const deactivateUser = async(req, res) => {
    try {
        // Find the user by ID in the database
        const user = await prisma.user.findUnique({
            where: { 
                id: req.user.id,
            }
        });

        // Return error if user not found
        if(!user) return res.status(404).json({ 
            message: "user not found" 
        });
        
        // Deactivate the user account (soft delete)
        // Sets isActive to false, preventing login but preserving data
        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                isActive: false 
            }
        });

        await logAction({ 
            userId: req.user.id, 
            action: "DEACTIVATE_ACCOUNT", 
            entity: "User", 
            entityId: user.id 
        })

        // Return success confirmation
        res.status(200).json({
            success: true,
            message: "Account deactivated successfully!"
        });
    } catch (error) {
        // Log and return server error with detailed error message
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
};

// Export all controller functions for use in routes
export { signUp, login, getMe, updateUser, forgotPassword, deactivateUser };