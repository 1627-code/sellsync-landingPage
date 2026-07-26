/**
 * Store Management Controller
 * Handles operations for creating and managing stores
 * Stores are owned by managers and contain cashier accounts
 */

import prisma from "../lib/prisma.js";

/**
 * Create Store Controller
 * Creates a new store and assigns the authenticated manager as the owner
 * Each manager can own a store which will contain their cashier accounts
 * 
 * @desc    Create a new store
 * @route   POST /api/stores/create
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object containing name, location, email, and phone in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created store data or error message
 */
const createStore = async(req, res) => {
    try {
        // Extract store information from request body
        const { name, location, email, phone } = req.body;

        // Validate that all required fields are provided
        if (!name || !email || !phone || !location) {
            return res.status(400).json({ 
                message: "All fields required" 
            });
        }

        // Create new store in the database
        // Links store to the authenticated manager via ownerId
        const store = await prisma.store.create({
            data: {
                name,
                email,
                phone,
                location,
                ownerId: req.user.id  // Authenticated manager becomes the store owner
            }
        });

        // Return success response with created store details
        res.status(201).json({
            success: true,
            message: "Store created successfully!", 
            store
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};


/**
 * Update Store Controller
 * Updates store information for the authenticated manager's store
 * Allows modification of store name, email, phone, and location
 * 
 * @desc    Update store details
 * @route   PATCH /api/stores/update
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with updated store data in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated store data or error message
 */
const updateStore = async(req, res) => {
    try {
        // Retrieve the authenticated manager's store
        // Each manager can only update their own store
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId, 
                ownerId: req.user.id 
            }
        });

        // Ensure manager has a store to update
        if(!store) return res.status(404).json({ 
            message: "Store not found" 
        });
        
        // Update store with new information from request body
        // Updates name, email, phone, and location fields
        const updatedStore =  await prisma.store.update({
            where: { id: store.id },
            data: {
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                location: req.body.location,
            }
        });

        // Return success response with updated store details
        res.status(201).json({
            success: true,
            message: "Store updated successfully!",
            data: {
                updatedStore
            }
        });

    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};


/**
 * Get Store Controller
 * Retrieves a specific store by ID for the authenticated manager
 * Ensures the store belongs to the requesting manager
 * 
 * @desc    Get a single store by ID
 * @route   GET /api/stores/:storeId
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with store data or error message
 */
const getStore = async(req, res) => {
    try {
        // Retrieve the specific store by ID
        // Security: Ensure store belongs to authenticated manager via ownerId check
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId, 
                ownerId: req.user.id 
            }
        });

        // Return error if store not found or doesn't belong to this manager
        if(!store) return res.status(404).json({ 
            message: "Store not found" 
        });

        // Return store details
        res.status(200).json({
            success: true,
            data: {
                store
            }
        });        
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};


/**
 * Get All Stores Controller
 * Retrieves all stores owned by the authenticated manager
 * Supports multi-store management for managers with multiple locations
 * 
 * @desc    Get all stores owned by manager
 * @route   GET /api/stores
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of stores or error message
 */
const getStores = async(req, res) => {
    try {
        // Retrieve all stores owned by the authenticated manager
        const stores = await prisma.store.findMany({
            where: { 
                ownerId: req.user.id 
            }
        });

        // Check if manager has any stores
        // findMany returns empty array [] if nothing found, so check length
        if(!stores.length) return res.status(404).json({ 
            message: "No stores found" 
        });

        // Return array of all manager's stores
        res.status(200).json({
            success: true,
            data: {
                stores
            }
        }); 
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};

/**
 * Deactivate Store Controller
 * Deactivates a specific store and all its associated cashiers
 * Implements cascading deactivation for data consistency
 * 
 * @desc    Deactivate a single store by ID
 * @route   PATCH /api/stores/deactivate/:storeId
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object with storeId in params
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming deactivation or error message
 */
const deactivateStore = async (req, res) => {
    try {
        // Retrieve the specific store by ID
        // Security: Ensure store belongs to authenticated manager via ownerId check
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId, 
                ownerId: req.user.id 
            }
        });

        // Return error if store not found or doesn't belong to this manager
        if(!store) return res.status(404).json({ 
            message: "Store not found" 
        });

        // Deactivate the store (soft delete)
        // Sets isActive to false, preserving store data for historical records
        await prisma.store.update({
            where: { id: store.id },
            data: { isActive: false }
        });

        // Automatically deactivate all cashiers under this store
        // Cascading deactivation ensures cashiers can't access deactivated store
        await prisma.user.updateMany({
            where: { 
                storeId: store.id, 
                role: "CASHIER"
            },
            data: { isActive: false }
        });

        // Return success confirmation
        res.status(200).json({
            success: true,
            message: "Store deactivated successfully!",
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};

/**
 * Deactivate All Stores Controller
 * Deactivates all stores owned by the authenticated manager
 * Also deactivates all cashiers across all these stores
 * Useful for temporarily suspending all business operations
 * 
 * @desc    Deactivate all stores owned by manager
 * @route   PATCH /api/stores/deactivate-all
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming bulk deactivation or error message
 */
const deactivateAllStores = async (req, res) => {
    try {
        // Retrieve all stores owned by the authenticated manager
        const stores = await prisma.store.findMany({
            where: { 
                ownerId: req.user.id 
            }
        });

        // Return error if manager has no stores
        if(!stores.length) return res.status(404).json({ 
            message: "No Store found!" 
        });

        // Extract all store IDs for batch operations
        // Used to perform bulk updates efficiently
        const storeIds = stores.map(store => store.id);

        // Deactivate all stores owned by this manager
        // Uses 'in' operator for bulk update operation
        await prisma.store.updateMany({
            where: { id: { in: storeIds } },
            data: { isActive: false }
        });

        // Deactivate all cashiers across all stores
        // Cascading deactivation ensures no orphaned active cashiers
        await prisma.user.updateMany({
            where: { 
                storeId: { in: storeIds }, 
                role: "CASHIER" 
            },
            data: { isActive: false }
        });

        // Return success confirmation
        res.status(200).json({
            success: true,
            message: "Stores deactivated successfully!",
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};

const reactivateStore = async (req, res) => {
    try {
        // Retrieve the specific store by ID
        // Security: Ensure store belongs to authenticated manager via ownerId check
        const store = await prisma.store.findFirst({
            where: { 
                id: req.params.storeId, 
                ownerId: req.user.id 
            }
        });

        // Return error if store not found or doesn't belong to this manager
        if(!store) return res.status(404).json({ 
            message: "Store not found" 
        });

        // Deactivate the store (soft delete)
        // Sets isActive to false, preserving store data for historical records
        await prisma.store.update({
            where: { id: store.id },
            data: { isActive: true }
        });

        // Automatically deactivate all cashiers under this store
        // Cascading deactivation ensures cashiers can't access deactivated store
        await prisma.user.updateMany({
            where: { 
                storeId: store.id, 
                role: "CASHIER"
            },
            data: { isActive: true }
        });

        // Return success confirmation
        res.status(200).json({
            success: true,
            message: "Store reactivated successfully!",
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};

/**
 * Deactivate All Stores Controller
 * Deactivates all stores owned by the authenticated manager
 * Also deactivates all cashiers across all these stores
 * Useful for temporarily suspending all business operations
 * 
 * @desc    Deactivate all stores owned by manager
 * @route   PATCH /api/stores/deactivate-all
 * @access  Private => Role: "MANAGER"
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming bulk deactivation or error message
 */
const reactivateAllStores = async (req, res) => {
    try {
        // Retrieve all stores owned by the authenticated manager
        const stores = await prisma.store.findMany({
            where: { 
                ownerId: req.user.id 
            }
        });

        // Return error if manager has no stores
        if(!stores.length) return res.status(404).json({ 
            message: "No Store found!" 
        });

        // Extract all store IDs for batch operations
        // Used to perform bulk updates efficiently
        const storeIds = stores.map(store => store.id);

        // Deactivate all stores owned by this manager
        // Uses 'in' operator for bulk update operation
        await prisma.store.updateMany({
            where: { id: { in: storeIds } },
            data: { isActive: true }
        });

        // Deactivate all cashiers across all stores
        // Cascading deactivation ensures no orphaned active cashiers
        await prisma.user.updateMany({
            where: { 
                storeId: { in: storeIds }, 
                role: "CASHIER" 
            },
            data: { isActive: true }
        });

        // Return success confirmation
        res.status(200).json({
            success: true,
            message: "Stores reactivated successfully!",
        });
    } catch (error) {
        // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", 
            error
        });
    }
};


// Export store controller functions for use in routes
export { createStore, updateStore, getStores, getStore, deactivateStore, deactivateAllStores, reactivateStore, reactivateAllStores };