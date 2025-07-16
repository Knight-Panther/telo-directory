// server/routes/health.js
const express = require("express");
const { getHealthStatus, isHealthy } = require("../config/database");
const router = express.Router();

// Public health check endpoint (for load balancers, monitoring tools)
router.get("/", async (req, res) => {
    try {
        const healthData = await getHealthStatus();

        const httpStatus = healthData.status === "healthy" ? 200 : 503;

        res.status(httpStatus).json({
            status: healthData.status,
            timestamp: healthData.timestamp,
            environment: healthData.environment,
            database: {
                connected: healthData.database.connected,
                readyState: healthData.database.readyStateText,
            },
            uptime: Math.floor(healthData.stats.uptime / 60), // minutes
        });
    } catch (error) {
        res.status(503).json({
            status: "error",
            message: "Health check failed",
            timestamp: new Date().toISOString(),
        });
    }
});

// Detailed health check (for admin dashboard)
router.get("/detailed", async (req, res) => {
    try {
        const healthData = await getHealthStatus();
        res.json(healthData);
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Simple alive check
router.get("/ping", (req, res) => {
    res.json({
        status: "alive",
        timestamp: new Date().toISOString(),
        database: isHealthy() ? "connected" : "disconnected",
    });
});

module.exports = router;
