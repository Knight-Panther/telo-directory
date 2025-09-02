// server/server.js - Updated integration
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { connectDB } = require("./config/database");
const errorHandler = require("./middleware/errorHandler");

// Import routes
const publicBusinessesRoutes = require("./routes/public/businesses");
const adminBusinessesRoutes = require("./routes/admin/businesses");
const adminAuthRoutes = require("./routes/admin/auth");
const adminCategoriesRoutes = require("./routes/admin/categories");
const adminDashboardRoutes = require("./routes/admin/dashboard");
const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
// Add this line with your other route imports
const emailVerificationRoutes = require("./routes/emailVerification");

// NEW: Import report routes
const reportsRoutes = require("./routes/reports");
const adminReportsRoutes = require("./routes/admin/reports");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB with enhanced error handling
const startServer = async () => {
    try {
        // Attempt database connection
        await connectDB();

        // Middleware
        app.use(cors());
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Serve uploaded images statically
        app.use("/uploads", express.static(path.join(__dirname, "uploads")));

        // Health check routes (should be first for monitoring)
        app.use("/api/health", healthRoutes);

        // Public routes
        app.use("/api/businesses", publicBusinessesRoutes);

        //user authentification
        app.use("/api/auth", authRoutes);

        // NEW: Public reports routes (for user submissions)
        app.use("/api/reports", reportsRoutes);
        // Add this line with your other route registrations
        app.use("/api/auth", emailVerificationRoutes);

        // Admin routes
        app.use("/api/admin/auth", adminAuthRoutes);
        app.use("/api/admin/businesses", adminBusinessesRoutes);
        app.use("/api/admin/categories", adminCategoriesRoutes);
        app.use("/api/admin/dashboard", adminDashboardRoutes);

        // NEW: Admin reports routes (for report management)
        app.use("/api/admin/reports", adminReportsRoutes);

        // Test route
        app.get("/api/test", (req, res) => {
            res.json({
                message: "Server running successfully!",
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || "development",
                features: {
                    businessDirectory: true,
                    adminDashboard: true,
                    reportSystem: true, // NEW: Indicate report system is active
                },
            });
        });

        // Global error handler
        app.use(errorHandler);

        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(
                `🌍 Environment: ${process.env.NODE_ENV || "development"}`
            );
            console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error.message);

        if (process.env.NODE_ENV === "production") {
            // In production, you might want to retry or alert
            console.log("🔄 Retrying server startup in 10 seconds...");
            setTimeout(startServer, 10000);
        } else {
            // In development, exit and let nodemon restart
            process.exit(1);
        }
    }
};

// Start the server
startServer();
