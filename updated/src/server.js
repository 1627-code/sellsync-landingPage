/**
 * Server Entry Point
 * Initializes the Express application, connects to the database, and starts the HTTP server
 * Also imports the analytics job to register scheduled tasks
 */

import dotenv from "dotenv"
import prisma from "./lib/prisma.js"
import app from "../src/app.js";
import "./jobs/analytics.job.js"

// Load environment variables from .env file
dotenv.config({
    path: "./.env"
})

/**
 * Start Server Function
 * Async function that:
 * 1. Establishes database connection
 * 2. Verifies connection with test query
 * 3. Starts HTTP server on specified port
 */
const startServer = async () => {
    try {
        // Connect to PostgreSQL database using Prisma client
        await prisma.$connect();
        // Test query to verify database connection is working
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connected successfully');

        // Handle Express app errors
        app.on("error", (error) => {
            console.log("error: ", error);
            throw error
        })

        // Get port from environment variables or use default 6000
        const PORT = process.env.PORT || 6000;

        // Start listening for incoming HTTP requests
        app.listen( PORT,  () => {
            console.log(`Server is running on port: ${process.env.PORT}`)
        })


    } catch (error) {
        console.log("Connection failed: ", error)
    }
}

// Initialize and start the server
startServer();