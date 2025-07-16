// server/routes/reports.js
const express = require("express");
const mongoose = require("mongoose");
const BusinessReport = require("../models/BusinessReport");
const Business = require("../models/Business");
const {
    validateReport,
    validateRateLimit,
} = require("../middleware/validation");
const router = express.Router();

/**
 * Reports API Routes
 *
 * These routes follow your established patterns from public/businesses.js:
 * - Comprehensive error handling with specific error codes
 * - Proper HTTP status codes for different scenarios
 * - Development-friendly error details
 * - Consistent response formatting
 * - Security-first approach with validation and rate limiting
 */

/**
 * POST /api/reports
 * Submit a new business issue report
 *
 * This endpoint handles public report submissions with full validation,
 * rate limiting, and error handling following your existing API patterns.
 */
router.post("/", validateRateLimit, validateReport, async (req, res) => {
    try {
        const { businessId, issueTypes, description } = req.body;
        const reporterIp = req.reporterIp;

        // Verify the business exists before creating report
        // Following your pattern from GET /:id route in businesses.js
        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({
                error: "Invalid business ID format",
                code: "INVALID_BUSINESS_ID",
            });
        }

        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({
                error: "Business not found",
                code: "BUSINESS_NOT_FOUND",
            });
        }

        // Create the report following your model patterns
        const reportData = {
            businessId: businessId,
            issueTypes: issueTypes,
            description: description ? description.trim() : "",
            reporterIp: reporterIp,
            status: "pending", // Default status
        };

        const report = new BusinessReport(reportData);
        await report.save();

        // Log successful submission for monitoring (development pattern)
        if (process.env.NODE_ENV === "development") {
            console.log("📝 New report submitted:", {
                reportId: report._id,
                businessName: business.businessName,
                issueTypes: issueTypes,
                reporterIp: reporterIp,
                timestamp: new Date().toISOString(),
            });
        }

        // Return success response with minimal data (security consideration)
        res.status(201).json({
            success: true,
            message: "Report submitted successfully",
            reportId: report._id,
        });
    } catch (error) {
        console.error("Error submitting report:", error);

        // Handle different error types following your error handling patterns
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({
                error: "Report validation failed",
                details: errors,
            });
        }

        // Handle duplicate submission attempts (if we add unique constraints later)
        if (error.code === 11000) {
            return res.status(409).json({
                error: "Duplicate report detected",
                code: "DUPLICATE_REPORT",
            });
        }

        // Generic server error with environment-appropriate details
        res.status(500).json({
            error: "Failed to submit report",
            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

/**
 * GET /api/reports/stats
 * Get report statistics for monitoring
 *
 * Public endpoint for basic statistics (used for system health monitoring)
 * No sensitive data exposed, following your public API patterns
 */
router.get("/stats", async (req, res) => {
    try {
        const stats = await BusinessReport.getReportStats();

        // Return only non-sensitive aggregated data
        res.json({
            totalReports: stats.total,
            pendingReports: stats.pending,
            recentActivity: {
                last24h: stats.recent.last24h,
                last7days: stats.recent.last7days,
            },
            systemHealth: stats.pending < 100 ? "healthy" : "needs_attention",
        });
    } catch (error) {
        console.error("Error fetching report stats:", error);
        res.status(500).json({
            error: "Failed to fetch statistics",
            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

module.exports = router;
