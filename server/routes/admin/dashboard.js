// server/routes/admin/dashboard.js - Enhanced system monitoring
const express = require("express");
const Business = require("../../models/Business");
const Category = require("../../models/Category");
const { verifyAdmin } = require("../../middleware/auth");
const { getHealthStatus } = require("../../config/database"); // Import health status
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

        // New businesses this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const newThisMonth = await Business.countDocuments({
            createdAt: { $gte: startOfMonth },
        });

        res.json({
            totalBusinesses,
            verifiedCount,
            unverifiedCount,
            totalCategories,
            newThisMonth,
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

module.exports = router;
