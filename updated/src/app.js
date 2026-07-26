/**
 * Express Application Setup
 * Main Express server configuration and route mounting
 * Initializes middleware, imports all route modules, and sets up API endpoints
 */

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { runDailyAnalytics } from "./jobs/analytics.job.js"

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV !== "production";
const frontendDistPath = path.join(__dirname, "../../frontend/dist");
const landingPath = path.join(__dirname, "../../landing");

// Import all route modules
// Each route module handles a specific domain (auth, stores, products, etc.)
import authRoutes from "../src/routes/auth.route.js"
import storeRoutes from "../src/routes/store.route.js"
import cashierRoutes from "../src/routes/cashier.route.js"
import productRoutes from "../src/routes/product.route.js"
import transactionRoutes from "../src/routes/transaction.routes.js"
import notificationRoutes from "../src/routes/notification.routes.js"
import aiRoutes from "../src/routes/ai.route.js"
import salesGoalRoutes from "../src/routes/salesGoal.route.js"
import auditLogRoutes from "../src/routes/auditLog.route.js"
import chatRoutes from "../src/routes/chat.route.js"
import analyticsRoutes from "../src/routes/analytics.route.js"
import posTerminalRoutes from "../src/routes/posTerminal.route.js"
import landingRoutes from "../src/routes/landing.route.js"

// Middleware
// CORS - Enables Cross-Origin Resource Sharing for frontend access
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];

app.use(cors({
  origin: '*',
  credentials: true
}));
// Express JSON - Parses incoming JSON request bodies
app.use(express.json());

// Serve static files from frontend dist and landing pages only in PRODUCTION
if (!isDev) {
  // Serve static files from landing pages (for assets, css, js)
  app.use(express.static(landingPath));

  // Serve static files from frontend dist (dashboard app)
  app.use(express.static(frontendDistPath));

  // SPA fallback - serve React app only for known frontend routes in production
  const frontendRoutes = ['/dashboard', '/pos', '/inventory', '/products', '/transactions', '/reports', '/forecasts', '/insights', '/notifications', '/settings', '/staff'];
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.includes('.')) {
      return next();
    }
    if (frontendRoutes.includes(req.path) || req.path.startsWith('/dashboard') || req.path.startsWith('/pos') || req.path.startsWith('/inventory') || req.path.startsWith('/products') || req.path.startsWith('/transactions') || req.path.startsWith('/reports') || req.path.startsWith('/forecasts') || req.path.startsWith('/insights') || req.path.startsWith('/notifications') || req.path.startsWith('/settings') || req.path.startsWith('/staff')) {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    } else {
      next();
    }
  });
} else {
  // In development: return 404 for non-API routes to avoid conflicts with Vite
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    // Allow static assets (images, fonts, etc.)
    if (req.path.includes('.') && !req.path.startsWith('/api')) {
      return next();
    }
    // Return 404 for any non-API routes in development
    res.status(404).json({ error: "Not Found", message: "API only. Use frontend at port 5173" });
  });
}

/**
 * Test endpoint to manually trigger daily analytics job
 * Useful for testing AI insights and notifications without waiting for cron schedule
 * Access: Public (should be restricted in production)
 */
app.get("/api/test/run-analytics", async (req, res) => {
    await runDailyAnalytics()
    res.json({ success: true, message: "Analytics ran successfully" })
})

// Mount all route modules under /api prefix
// Each domain gets its own base path
app.use("/api/auth", authRoutes);          // User authentication (login, register, password reset)
app.use("/api/stores", storeRoutes);       // Store management
app.use("/api/cashiers", cashierRoutes);    // Cashier account management
app.use("/api/products", productRoutes);   // Product and inventory management
app.use("/api/transactions", transactionRoutes); // Sales and transaction operations
app.use("/api/notifications", notificationRoutes); // User notifications
app.use("/api/ai", aiRoutes);              // AI-powered insights
app.use("/api/salesGoal", salesGoalRoutes); // Sales target/goals
app.use("/api/auditLogs", auditLogRoutes); // Audit trail retrieval
app.use("/api/chat", chatRoutes);           // AI chatbot functionality
app.use("/api/analytics", analyticsRoutes) // Sales analytics and reporting
app.use("/api/terminals", posTerminalRoutes)
app.use("/api", landingRoutes)

export default app;