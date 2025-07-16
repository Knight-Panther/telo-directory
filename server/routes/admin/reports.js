// server/routes/admin/reports.js
const express = require("express");
const mongoose = require("mongoose");
const BusinessReport = require("../../models/BusinessReport");
const Business = require("../../models/Business");
const { verifyAdmin } = require("../../middleware/auth");
const { validateReportStatusUpdate } = require("../../middleware/validation");
const router = express.Router();

/**
 * Admin Reports Management Routes
 *
 * These routes follow your established admin patterns from admin/businesses.js and admin/categories.js:
 * - All routes protected with verifyAdmin middleware
 * - Comprehensive pagination and filtering
 * - Detailed error handling with development-friendly debugging
 * - Integration with existing business management
 * - Consistent response formatting and status codes
 */

// Apply admin authentication to all routes
router.use(verifyAdmin);

/**
 * GET /api/admin/reports
 * Get all reports with pagination and filtering for admin dashboard
 *
 * Follows your pagination pattern from admin/businesses.js with enhanced filtering
 */
router.get("/", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status = "",
            issueType = "",
            businessId = "",
            search = "",
            dateFrom = "",
            dateTo = "",
        } = req.query;

        // Build query object following your filtering patterns
        const query = {};

        // Status filtering
        if (status && ["pending", "resolved", "dismissed"].includes(status)) {
            query.status = status;
        }

        // Issue type filtering
        if (issueType) {
            query.issueTypes = { $in: [issueType] };
        }

        // Business ID filtering for business-specific reports
        if (businessId && mongoose.Types.ObjectId.isValid(businessId)) {
            query.businessId = businessId;
        }

        // Date range filtering
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) {
                query.createdAt.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                query.createdAt.$lte = new Date(dateTo);
            }
        }

        // Search functionality (searches in business name via population)
        let searchQuery = {};
        if (search) {
            // We'll handle search after population since it involves business data
            searchQuery = {
                $or: [
                    {
                        "businessId.businessName": {
                            $regex: search,
                            $options: "i",
                        },
                    },
                    {
                        "businessId.businessId": {
                            $regex: search,
                            $options: "i",
                        },
                    },
                    { description: { $regex: search, $options: "i" } },
                ],
            };
        }

        const skip = (page - 1) * limit;

        // Get reports with business information populated
        // Following your population pattern from existing admin routes
        let reportsQuery = BusinessReport.find(query)
            .populate(
                "businessId",
                "businessName businessId category city profileImage"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const reports = await reportsQuery;

        // Apply search filter after population if needed
        let filteredReports = reports;
        if (search) {
            filteredReports = reports.filter((report) => {
                if (!report.businessId) return false;

                const businessMatch =
                    report.businessId.businessName
                        ?.toLowerCase()
                        .includes(search.toLowerCase()) ||
                    report.businessId.businessId
                        ?.toLowerCase()
                        .includes(search.toLowerCase());

                const descriptionMatch = report.description
                    ?.toLowerCase()
                    .includes(search.toLowerCase());

                return businessMatch || descriptionMatch;
            });
        }

        // Get total count for pagination (accounting for search)
        const totalQuery = search
            ? BusinessReport.find(query).populate(
                  "businessId",
                  "businessName businessId"
              )
            : BusinessReport.countDocuments(query);

        const total = search
            ? (await totalQuery).filter((report) => {
                  if (!report.businessId) return false;
                  return (
                      report.businessId.businessName
                          ?.toLowerCase()
                          .includes(search.toLowerCase()) ||
                      report.businessId.businessId
                          ?.toLowerCase()
                          .includes(search.toLowerCase()) ||
                      report.description
                          ?.toLowerCase()
                          .includes(search.toLowerCase())
                  );
              }).length
            : await totalQuery;

        const totalPages = Math.ceil(total / limit);
        const currentPage = parseInt(page);

        // Response following your pagination pattern
        res.json({
            reports: filteredReports,
            pagination: {
                currentPage: currentPage,
                totalPages: totalPages,
                totalReports: total,
                hasNext: currentPage < totalPages,
                hasPrev: currentPage > 1,
            },
            filters: {
                status,
                issueType,
                businessId,
                search,
                dateFrom,
                dateTo,
            },
        });
    } catch (error) {
        console.error("Error fetching admin reports:", error);
        res.status(500).json({
            error: "Failed to fetch reports",
            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

/**
 * GET /api/admin/reports/stats
 * Get comprehensive report statistics for admin dashboard
 *
 * Enhanced version of public stats with admin-specific details
 */
router.get("/stats", async (req, res) => {
    try {
        const stats = await BusinessReport.getReportStats();

        // Get additional admin-specific statistics
        const recentReports = await BusinessReport.find()
            .populate("businessId", "businessName")
            .sort({ createdAt: -1 })
            .limit(5);

        // Issue type breakdown
        const issueTypeStats = await BusinessReport.aggregate([
            {
                $unwind: "$issueTypes",
            },
            {
                $group: {
                    _id: "$issueTypes",
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
        ]);

        res.json({
            ...stats,
            issueTypeBreakdown: issueTypeStats,
            recentReports: recentReports.map((report) => ({
                _id: report._id,
                businessName:
                    report.businessId?.businessName || "Unknown Business",
                issueTypes: report.issueTypes,
                status: report.status,
                createdAt: report.createdAt,
            })),
        });
    } catch (error) {
        console.error("Error fetching admin report stats:", error);
        res.status(500).json({
            error: "Failed to fetch report statistics",
            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

/**
 * GET /api/admin/reports/:id
 * Get single report details for investigation
 *
 * Following your single item pattern from admin/businesses.js
 */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid report ID format",
                code: "INVALID_REPORT_ID",
            });
        }

        const report = await BusinessReport.findById(id).populate("businessId");

        if (!report) {
            return res.status(404).json({
                error: "Report not found",
                code: "REPORT_NOT_FOUND",
            });
        }

        res.json(report);
    } catch (error) {
        console.error("Error fetching report details:", error);
        res.status(500).json({
            error: "Failed to fetch report details",
            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

/**
 * PATCH /api/admin/reports/:id/status
 * Update report status (resolve, dismiss, reopen)
 *
 * Following your update pattern with validation middleware
 */
router.patch("/:id/status", validateReportStatusUpdate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid report ID format",
                code: "INVALID_REPORT_ID",
            });
        }

        const report = await BusinessReport.findById(id);
        if (!report) {
            return res.status(404).json({
                error: "Report not found",
                code: "REPORT_NOT_FOUND",
            });
        }

        // Update report using model methods when available
        const adminUser = req.user?.username || req.user?.email || "admin";

        try {
            if (status === "resolved") {
                await report.resolveReport(adminUser, adminNotes);
            } else if (status === "dismissed") {
                await report.dismissReport(adminUser, adminNotes);
            } else {
                // For pending status or direct updates
                report.status = status;
                if (adminNotes) {
                    report.adminNotes = adminNotes;
                }
                await report.save();
            }

            // Log admin action for auditing
            console.log(
                `📊 Admin action: Report ${id} status changed to ${status} by ${adminUser}`
            );

            res.json({
                success: true,
                message: `Report ${status} successfully`,
                report: await BusinessReport.findById(id).populate(
                    "businessId"
                ),
            });
        } catch (modelError) {
            return res.status(400).json({
                error: modelError.message,
                code: "INVALID_STATUS_CHANGE",
            });
        }
    } catch (error) {
        console.error("Error updating report status:", error);
        res.status(500).json({
            error: "Failed to update report status",
            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

/**
 * DELETE /api/admin/reports/:id
 * Permanently delete a report
 *
 * Following your delete pattern with proper authorization
 */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid report ID format",
                code: "INVALID_REPORT_ID",
            });
        }

        const report = await BusinessReport.findById(id);
        if (!report) {
            return res.status(404).json({
                error: "Report not found",
                code: "REPORT_NOT_FOUND",
            });
        }

        await BusinessReport.findByIdAndDelete(id);

        // Log deletion for auditing
        const adminUser = req.user?.username || req.user?.email || "admin";
        console.log(`🗑️ Admin action: Report ${id} deleted by ${adminUser}`);

        res.json({
            success: true,
            message: "Report deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting report:", error);
        res.status(500).json({
            error: "Failed to delete report",
            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

/**
 * GET /api/admin/reports/business/:businessId
 * Get all reports for a specific business
 *
 * Useful for business investigation and pattern detection
 */
router.get("/business/:businessId", async (req, res) => {
    try {
        const { businessId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(400).json({
                error: "Invalid business ID format",
                code: "INVALID_BUSINESS_ID",
            });
        }

        // Verify business exists
        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({
                error: "Business not found",
                code: "BUSINESS_NOT_FOUND",
            });
        }

        // Get all reports for this business
        const reports = await BusinessReport.find({ businessId }).sort({
            createdAt: -1,
        });

        // Get summary statistics
        const stats = {
            total: reports.length,
            pending: reports.filter((r) => r.status === "pending").length,
            resolved: reports.filter((r) => r.status === "resolved").length,
            dismissed: reports.filter((r) => r.status === "dismissed").length,
        };

        res.json({
            business: {
                _id: business._id,
                businessName: business.businessName,
                businessId: business.businessId,
                category: business.category,
                city: business.city,
            },
            reports,
            stats,
        });
    } catch (error) {
        console.error("Error fetching business reports:", error);
        res.status(500).json({
            error: "Failed to fetch business reports",
            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

module.exports = router;
