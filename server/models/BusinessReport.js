// server/models/BusinessReport.js
const mongoose = require("mongoose");

/**
 * BusinessReport Schema
 *
 * This model follows your established patterns from Business.js and Category.js:
 * - Clean schema structure with proper validation
 * - Strategic use of enums for controlled values
 * - Timestamps enabled for audit trails
 * - Foreign key relationships with proper referencing
 * - Default values for operational fields
 *
 * The schema design maintains separation of concerns by storing reports
 * independently while linking to existing business records through ObjectId references.
 */
const businessReportSchema = new mongoose.Schema(
    {
        // Foreign key reference to the business being reported
        // Using ObjectId reference pattern consistent with your existing relationships
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            index: true, // Index for fast lookups by business
        },

        // Issue types stored as array to handle multiple selections
        // Following your pattern of using descriptive strings rather than codes
        issueTypes: {
            type: [String],
            required: true,
            validate: {
                validator: function (types) {
                    // Ensure at least one issue type is selected
                    if (!types || types.length === 0) {
                        return false;
                    }

                    // Validate each type against allowed values
                    const allowedTypes = [
                        "Broken Image",
                        "Business No Longer Exists",
                        "Other Issue",
                    ];

                    return types.every((type) => allowedTypes.includes(type));
                },
                message: "Invalid issue type provided",
            },
        },

        // Optional custom description for "Other Issue" reports
        // Matches your pattern of optional text fields with reasonable limits
        description: {
            type: String,
            maxlength: 50,
            trim: true,
            default: "",
        },

        // Reporter IP for spam prevention and rate limiting
        // Following your security-conscious approach seen in validation middleware
        reporterIp: {
            type: String,
            required: true,
            index: true, // Index for rate limiting queries
        },

        // Report status for administrative workflow
        // Using enum pattern consistent with your businessType field in Business model
        status: {
            type: String,
            enum: ["pending", "resolved", "dismissed"],
            default: "pending",
            index: true, // Index for admin dashboard filtering
        },

        // Administrative notes for internal tracking
        // Optional field following your pattern for admin-only data
        adminNotes: {
            type: String,
            maxlength: 500,
            trim: true,
            default: "",
        },

        // Track which admin user resolved the report (if applicable)
        // Prepared for future admin user system integration
        resolvedBy: {
            type: String, // Will store admin username or ID
            default: "",
        },

        // Resolution timestamp for reporting and analytics
        resolvedAt: {
            type: Date,
            default: null,
        },
    },
    {
        // Enable automatic timestamps following your existing model patterns
        timestamps: true,
    }
);

/**
 * Indexes for Performance Optimization
 *
 * These indexes support the primary query patterns for the report system:
 * - Admin dashboard filtering by status and date
 * - Rate limiting by IP address
 * - Business-specific report lookups
 * - Analytics and reporting queries
 */

// Compound index for admin dashboard - most common query pattern
businessReportSchema.index(
    {
        status: 1,
        createdAt: -1,
    },
    {
        name: "admin_dashboard_reports",
    }
);

// Index for rate limiting - critical for spam prevention
businessReportSchema.index(
    {
        reporterIp: 1,
        createdAt: -1,
    },
    {
        name: "rate_limiting_index",
    }
);

// Index for business-specific report lookups
businessReportSchema.index(
    {
        businessId: 1,
        createdAt: -1,
    },
    {
        name: "business_reports_lookup",
    }
);

/**
 * Instance Methods
 *
 * Following your pattern of keeping business logic in models where appropriate.
 * These methods handle common operations while maintaining data consistency.
 */

// Check if report can be resolved (business rules)
businessReportSchema.methods.canBeResolved = function () {
    return this.status === "pending";
};

// Resolve report with admin tracking
businessReportSchema.methods.resolveReport = function (adminUser, notes = "") {
    if (!this.canBeResolved()) {
        throw new Error("Report cannot be resolved - invalid status");
    }

    this.status = "resolved";
    this.resolvedBy = adminUser;
    this.resolvedAt = new Date();
    if (notes) {
        this.adminNotes = notes;
    }

    return this.save();
};

// Dismiss report with admin tracking
businessReportSchema.methods.dismissReport = function (adminUser, notes = "") {
    if (!this.canBeResolved()) {
        throw new Error("Report cannot be dismissed - invalid status");
    }

    this.status = "dismissed";
    this.resolvedBy = adminUser;
    this.resolvedAt = new Date();
    if (notes) {
        this.adminNotes = notes;
    }

    return this.save();
};

/**
 * Static Methods
 *
 * Following your pattern of using static methods for model-level operations.
 * These methods handle common queries and business logic.
 */

// Get recent reports for rate limiting
businessReportSchema.statics.getRecentReportsByIp = function (
    ip,
    timeWindow = 1
) {
    const timeAgo = new Date();
    timeAgo.setHours(timeAgo.getHours() - timeWindow);

    return this.find({
        reporterIp: ip,
        createdAt: { $gte: timeAgo },
    }).sort({ createdAt: -1 });
};

// Get reports for admin dashboard with filtering
businessReportSchema.statics.getAdminReports = function (filters = {}) {
    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.issueType) {
        query.issueTypes = { $in: [filters.issueType] };
    }

    if (filters.businessId) {
        query.businessId = filters.businessId;
    }

    if (filters.dateFrom) {
        query.createdAt = {
            ...query.createdAt,
            $gte: new Date(filters.dateFrom),
        };
    }

    if (filters.dateTo) {
        query.createdAt = {
            ...query.createdAt,
            $lte: new Date(filters.dateTo),
        };
    }

    return this.find(query)
        .populate("businessId", "businessName businessId category city")
        .sort({ createdAt: -1 });
};

// Get statistics for admin dashboard
businessReportSchema.statics.getReportStats = function () {
    return Promise.all([
        this.countDocuments({ status: "pending" }),
        this.countDocuments({ status: "resolved" }),
        this.countDocuments({ status: "dismissed" }),
        this.countDocuments({
            createdAt: {
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
        }),
        this.countDocuments({
            createdAt: {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
        }),
    ]).then(([pending, resolved, dismissed, last24h, last7days]) => ({
        pending,
        resolved,
        dismissed,
        total: pending + resolved + dismissed,
        recent: {
            last24h,
            last7days,
        },
    }));
};

module.exports = mongoose.model("BusinessReport", businessReportSchema);
