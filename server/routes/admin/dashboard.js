// server/routes/admin/dashboard.js - Enhanced system monitoring
const express = require("express");
const Business = require("../../models/Business");
const Category = require("../../models/Category");
const User = require("../../models/User"); // NEW: Import User model
const { verifyAdmin } = require("../../middleware/auth");
const { getHealthStatus } = require("../../config/database"); // Import health status
const userCleanupService = require("../../services/userCleanupService"); // NEW: Import cleanup service
const fs = require("fs");
const path = require("path");
const router = express.Router();

// Apply auth middleware
router.use(verifyAdmin);

// Basic stats
router.get("/stats", async (req, res) => {
    try {
        const totalBusinesses = await Business.countDocuments();
        const verifiedCount = await Business.countDocuments({ verified: true });
        const unverifiedCount = totalBusinesses - verifiedCount;
        const totalCategories = await Category.countDocuments();

        // NEW: User statistics
        const totalUsers = await User.countDocuments();
        const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
        const pendingDeletions = await User.countPendingDeletions();

        // New businesses this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const newThisMonth = await Business.countDocuments({
            createdAt: { $gte: startOfMonth },
        });

        // NEW: New users this month
        const newUsersThisMonth = await User.countDocuments({
            createdAt: { $gte: startOfMonth },
        });

        res.json({
            totalBusinesses,
            verifiedCount,
            unverifiedCount,
            totalCategories,
            newThisMonth,
            // NEW: User stats
            totalUsers,
            verifiedUsers,
            unverifiedUsers: totalUsers - verifiedUsers,
            pendingDeletions,
            newUsersThisMonth,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Recent businesses
router.get("/recent", async (req, res) => {
    try {
        const recentBusinesses = await Business.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select("businessName category city verified createdAt");

        res.json(recentBusinesses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Chart data
router.get("/charts", async (req, res) => {
    try {
        // Businesses by category
        const categoryStats = await Business.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Businesses by city
        const cityStats = await Business.aggregate([
            { $group: { _id: "$city", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Monthly growth (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyGrowth = await Business.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]);

        res.json({
            categoryStats,
            cityStats,
            monthlyGrowth,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enhanced system status with database health
router.get("/system", async (req, res) => {
    try {
        // Get enhanced database health status
        const dbHealth = await getHealthStatus();

        // Calculate storage used
        let storageUsed = 0;
        const uploadsPath = path.join(__dirname, "../../uploads/businesses");

        if (fs.existsSync(uploadsPath)) {
            const files = fs.readdirSync(uploadsPath);
            files.forEach((file) => {
                const filePath = path.join(uploadsPath, file);
                if (fs.statSync(filePath).isFile()) {
                    storageUsed += fs.statSync(filePath).size;
                }
            });
        }

        // Convert to MB
        const storageMB = (storageUsed / (1024 * 1024)).toFixed(2);

        // System health
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();

        res.json({
            // Enhanced database information
            database: {
                status: dbHealth.status,
                connected: dbHealth.database.connected,
                readyState: dbHealth.database.readyStateText,
                host: dbHealth.database.host,
                port: dbHealth.database.port,
                name: dbHealth.database.name,
                connectionAttempts: dbHealth.stats.connectionAttempts,
                maxRetries: dbHealth.stats.maxRetries,
                lastHealthCheck: dbHealth.timestamp,
            },
            storage: {
                usedMB: parseFloat(storageMB),
                totalFiles: fs.existsSync(uploadsPath)
                    ? fs.readdirSync(uploadsPath).length
                    : 0,
            },
            system: {
                uptime: Math.floor(uptime / 60), // minutes
                memoryMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                memoryTotal: Math.round(memoryUsage.rss / 1024 / 1024),
                environment: process.env.NODE_ENV || "development",
                nodeVersion: process.version,
                platform: process.platform,
            },
            // Overall health status
            overallHealth:
                dbHealth.status === "healthy" ? "healthy" : "degraded",
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            overallHealth: "error",
            timestamp: new Date().toISOString(),
        });
    }
});

// NEW: User management endpoints

/**
 * GET /api/admin/dashboard/users/pending-deletions
 * Get list of users with pending deletions
 */
router.get("/users/pending-deletions", async (req, res) => {
    try {
        const pendingUsers = await User.findPendingDeletions();
        
        // Add calculated remaining days to each user
        const usersWithRemainingDays = pendingUsers.map(user => ({
            id: user._id,
            email: user.email,
            name: user.name,
            scheduledAt: user.deletionScheduledAt,
            scheduledFor: user.deletionScheduledFor,
            createdAt: user.createdAt,
            remainingDays: Math.ceil((new Date(user.deletionScheduledFor) - new Date()) / (1000 * 60 * 60 * 24)),
            accountAge: Math.ceil((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))
        }));

        res.json({
            success: true,
            count: usersWithRemainingDays.length,
            users: usersWithRemainingDays
        });
    } catch (error) {
        console.error("Error fetching pending deletions:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/dashboard/users/stats
 * Get detailed user statistics
 */
router.get("/users/stats", async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
        const pendingDeletions = await User.countPendingDeletions();
        
        // Users created in different time periods
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const newToday = await User.countDocuments({ createdAt: { $gte: startOfDay } });
        const newThisWeek = await User.countDocuments({ createdAt: { $gte: startOfWeek } });
        const newThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });

        res.json({
            total: totalUsers,
            verified: verifiedUsers,
            unverified: totalUsers - verifiedUsers,
            pendingDeletions: pendingDeletions,
            newUsers: {
                today: newToday,
                thisWeek: newThisWeek,
                thisMonth: newThisMonth
            },
            verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : 0
        });
    } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/dashboard/cleanup-service/status
 * Get user cleanup service status and statistics
 */
router.get("/cleanup-service/status", async (req, res) => {
    try {
        const status = userCleanupService.getStatus();
        const stats = userCleanupService.getStats();
        
        res.json({
            success: true,
            service: {
                ...status,
                delayDays: parseInt(process.env.USER_DELETION_DELAY_DAYS) || 5
            },
            statistics: stats
        });
    } catch (error) {
        console.error("Error fetching cleanup service status:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/dashboard/cleanup-service/manual-run
 * Manually trigger cleanup service (for admin testing)
 */
router.post("/cleanup-service/manual-run", async (req, res) => {
    try {
        console.log("🔧 Admin triggered manual cleanup");
        const result = await userCleanupService.manualCleanup();
        
        res.json({
            success: true,
            message: "Manual cleanup completed",
            result: result
        });
    } catch (error) {
        console.error("Error during manual cleanup:", error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

module.exports = router;
