// server/routes/admin/submissions.js
const express = require("express");
const BusinessSubmission = require("../../models/BusinessSubmission");
const Business = require("../../models/Business");
const { verifyAdmin } = require("../../middleware/auth");
const duplicateDetectionService = require("../../services/duplicateDetectionService");
const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyAdmin);

/**
 * GET /api/admin/submissions
 * Get paginated submissions with filtering and sorting
 * Query params: page, limit, status, category, dateFrom, dateTo, search
 */
router.get("/", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 25,
            status = 'all',
            category = 'all',
            dateFrom,
            dateTo,
            search
        } = req.query;

        // Build filter query
        const filter = {};

        // Status filter
        if (status !== 'all') {
            filter.status = status;
        }

        // Category filter
        if (category !== 'all') {
            filter.categories = { $in: [category] };
        }

        // Date range filter
        if (dateFrom || dateTo) {
            filter.submittedAt = {};
            if (dateFrom) {
                filter.submittedAt.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                filter.submittedAt.$lte = new Date(dateTo);
            }
        }

        // Search filter (business name, submitter name, email)
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { businessName: searchRegex },
                { submitterName: searchRegex },
                { submitterEmail: searchRegex }
            ];
        }

        // Pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page
        const skip = (pageNum - 1) * limitNum;

        // Execute query with pagination
        const [submissions, totalCount] = await Promise.all([
            BusinessSubmission
                .find(filter)
                .sort({ submittedAt: -1 }) // Latest first
                .skip(skip)
                .limit(limitNum)
                .select('-submitterIp -__v') // Exclude sensitive/unnecessary fields
                .lean(),
            BusinessSubmission.countDocuments(filter)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limitNum);
        const hasMore = pageNum < totalPages;

        res.json({
            success: true,
            submissions,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: totalCount,
                itemsPerPage: limitNum,
                hasMore
            }
        });

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch submissions'
        });
    }
});

/**
 * GET /api/admin/submissions/stats
 * Get submission statistics for dashboard
 */
router.get("/stats", async (req, res) => {
    try {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalSubmissions,
            pendingSubmissions,
            approvedSubmissions,
            rejectedSubmissions,
            thisWeekSubmissions,
            thisMonthSubmissions
        ] = await Promise.all([
            BusinessSubmission.countDocuments(),
            BusinessSubmission.countDocuments({ status: 'pending' }),
            BusinessSubmission.countDocuments({ status: 'approved' }),
            BusinessSubmission.countDocuments({ status: 'rejected' }),
            BusinessSubmission.countDocuments({
                submittedAt: { $gte: startOfWeek }
            }),
            BusinessSubmission.countDocuments({
                submittedAt: { $gte: startOfMonth }
            })
        ]);

        res.json({
            success: true,
            stats: {
                total: totalSubmissions,
                pending: pendingSubmissions,
                approved: approvedSubmissions,
                rejected: rejectedSubmissions,
                thisWeek: thisWeekSubmissions,
                thisMonth: thisMonthSubmissions,
                approvalRate: totalSubmissions > 0
                    ? Math.round((approvedSubmissions / totalSubmissions) * 100)
                    : 0
            }
        });

    } catch (error) {
        console.error('Error fetching submission stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

/**
 * GET /api/admin/submissions/:id
 * Get individual submission details
 */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const submission = await BusinessSubmission.findById(id).lean();

        if (!submission) {
            return res.status(404).json({
                success: false,
                error: 'Submission not found'
            });
        }

        res.json({
            success: true,
            submission
        });

    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch submission details'
        });
    }
});

/**
 * PUT /api/admin/submissions/:id/status
 * Update submission status (approve/reject)
 */
router.put("/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        // Validate status
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: approved, rejected, or pending'
            });
        }

        // Validate rejection reason for rejected status
        if (status === 'rejected' && (!rejectionReason || !rejectionReason.trim())) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason is required when rejecting submission'
            });
        }

        const submission = await BusinessSubmission.findById(id);

        if (!submission) {
            return res.status(404).json({
                success: false,
                error: 'Submission not found'
            });
        }

        // Update submission
        submission.status = status;
        submission.reviewedAt = new Date();

        if (status === 'rejected') {
            submission.rejectionReason = rejectionReason.trim();
        } else {
            submission.rejectionReason = undefined;
        }

        await submission.save();

        res.json({
            success: true,
            message: `Submission ${status} successfully`,
            submission: {
                id: submission._id,
                submissionId: submission.submissionId,
                status: submission.status,
                reviewedAt: submission.reviewedAt,
                rejectionReason: submission.rejectionReason
            }
        });

    } catch (error) {
        console.error('Error updating submission status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update submission status'
        });
    }
});

/**
 * GET /api/admin/submissions/:id/duplicates
 * Check for duplicates of a specific submission
 */
router.get("/:id/duplicates", async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid submission ID format'
            });
        }

        const duplicateInfo = await duplicateDetectionService.findDuplicates(id);

        res.json({
            success: true,
            duplicateInfo
        });

    } catch (error) {
        console.error('Error checking duplicates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check for duplicates'
        });
    }
});

/**
 * POST /api/admin/submissions/batch-duplicates
 * Check for duplicates across multiple submissions
 */
router.post("/batch-duplicates", async (req, res) => {
    try {
        const { submissionIds } = req.body;

        // Validate input
        if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'submissionIds array is required'
            });
        }

        // Validate all IDs are valid MongoDB ObjectIds
        const isValidIds = submissionIds.every(id => /^[0-9a-fA-F]{24}$/.test(id));
        if (!isValidIds) {
            return res.status(400).json({
                success: false,
                error: 'Invalid submission ID format'
            });
        }

        // Limit batch size for performance
        if (submissionIds.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 50 submissions per batch'
            });
        }

        const duplicateResults = await duplicateDetectionService.batchCheckDuplicates(submissionIds);

        res.json({
            success: true,
            duplicateResults
        });

    } catch (error) {
        console.error('Error checking batch duplicates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check for duplicates'
        });
    }
});

/**
 * DELETE /api/admin/submissions
 * Bulk delete submissions
 */
router.delete("/", async (req, res) => {
    try {
        const { submissionIds } = req.body;

        // Validate input
        if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'submissionIds array is required'
            });
        }

        // Validate all IDs are valid MongoDB ObjectIds
        const isValidIds = submissionIds.every(id => /^[0-9a-fA-F]{24}$/.test(id));
        if (!isValidIds) {
            return res.status(400).json({
                success: false,
                error: 'Invalid submission ID format'
            });
        }

        // Delete submissions
        const deleteResult = await BusinessSubmission.deleteMany({
            _id: { $in: submissionIds }
        });

        res.json({
            success: true,
            message: `${deleteResult.deletedCount} submissions deleted successfully`,
            deletedCount: deleteResult.deletedCount
        });

    } catch (error) {
        console.error('Error bulk deleting submissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete submissions'
        });
    }
});

module.exports = router;