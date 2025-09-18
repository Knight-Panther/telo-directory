// server/server.js - Updated integration
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Environment Variables Validation
const validateEnvironment = () => {
    const requiredVars = [
        "MONGODB_URI",
        "JWT_ACCESS_SECRET",
        "JWT_REFRESH_SECRET",
        "ADMIN_USERNAME",
        "ADMIN_PASSWORD",
        "EMAIL_USER",
        "EMAIL_PASS",
    ];

    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
        console.error("❌ CRITICAL: Missing required environment variables:");
        missing.forEach((varName) => {
            console.error(`   - ${varName}`);
        });
        console.error(
            "\n💡 Please check your .env file and ensure all required variables are set."
        );
        process.exit(1);
    }

    console.log("✅ All required environment variables are present");
};

// Validate environment before proceeding
validateEnvironment();

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

// NEW: Import user cleanup service for delayed deletion
const userCleanupService = require("./services/userCleanupService");

// NEW: Import submission routes
const submissionRoutes = require("./routes/submissions");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB with enhanced error handling
const startServer = async () => {
    try {
        // Attempt database connection
        await connectDB();

        // Middleware
        app.use(cors({
            origin: process.env.FRONTEND_URL || "http://localhost:3001"
        }));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Serve uploaded images statically with cache headers
        app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
            maxAge: '1d', // Cache for 1 day
            etag: true,   // Enable ETags for 304 responses
            lastModified: true // Enable Last-Modified headers
        }));

        // Health check routes (should be first for monitoring)
        app.use("/api/health", healthRoutes);

        // Public routes
        app.use("/api/businesses", publicBusinessesRoutes);

        //user authentification
        app.use("/api/auth", authRoutes);

        // NEW: Public reports routes (for user submissions)
        app.use("/api/reports", reportsRoutes);

        // NEW: Business submission routes
        app.use("/api/submissions", submissionRoutes);

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
                    userCleanupService: true, // NEW: Indicate cleanup service is active
                },
                // NEW: Include cleanup service status
                userCleanup: {
                    delayDays: parseInt(process.env.USER_DELETION_DELAY_DAYS) || 5,
                    ...userCleanupService.getStatus()
                }
            });
        });

        // Global error handler
        app.use(errorHandler);

        // NEW: Start user cleanup background job
        const startUserCleanupJob = () => {
            // Run cleanup every 4-6 hours (using 5 hours as middle ground)
            const CLEANUP_INTERVAL = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
            
            console.log(`⏰ User cleanup job scheduled to run every ${CLEANUP_INTERVAL / (1000 * 60 * 60)} hours`);
            
            // Run initial cleanup after 10 minutes to avoid server startup interference
            setTimeout(async () => {
                console.log("🧹 Running initial user cleanup check...");
                try {
                    await userCleanupService.runCleanup();
                } catch (error) {
                    console.error("❌ Initial cleanup job failed:", error);
                }
            }, 10 * 60 * 1000); // 10 minutes
            
            // Schedule recurring cleanup
            setInterval(async () => {
                try {
                    await userCleanupService.runCleanup();
                } catch (error) {
                    console.error("❌ Scheduled cleanup job failed:", error);
                }
            }, CLEANUP_INTERVAL);
        };

        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(
                `🌍 Environment: ${process.env.NODE_ENV || "development"}`
            );
            console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
            
            // Start background cleanup job
            startUserCleanupJob();
            console.log(`🗑️ User cleanup service: Active (delay: ${process.env.USER_DELETION_DELAY_DAYS || 5} days)`);
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
