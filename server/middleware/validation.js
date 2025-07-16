// server/middleware/validation.js (this replaces express-validator.checks http request before mongoose schema)

/**
 * Sanitize input by removing HTML tags and dangerous characters
 */
const sanitizeInput = (input) => {
    if (typeof input !== "string") return input;

    return (
        input
            // Remove HTML tags
            .replace(/<[^>]*>/g, "")
            // Remove script content
            .replace(/javascript:/gi, "")
            // Remove event handlers
            .replace(/on\w+\s*=/gi, "")
            // Remove data URIs
            .replace(/data:\s*text\/html/gi, "")
            // Trim whitespace
            .trim()
    );
};

const validateBusiness = (req, res, next) => {
    const { businessName, category, businessType, city, mobile } = req.body;

    const errors = [];

    if (!businessName?.trim()) errors.push("Business name is required");
    if (!category?.trim()) errors.push("Category is required");
    if (!businessType) errors.push("Business type is required");
    if (!city?.trim()) errors.push("City is required");
    if (!mobile?.trim()) errors.push("Mobile is required");

    if (!["individual", "company"].includes(businessType)) {
        errors.push("Business type must be individual or company");
    }

    // Mobile validation (basic Georgian format)
    if (mobile && !/^[+]?[0-9\s\-()]{9,15}$/.test(mobile.trim())) {
        errors.push("Invalid mobile number format");
    }

    if (errors.length > 0) {
        return res
            .status(400)
            .json({ error: "Validation failed", details: errors });
    }

    next();
};

const validateCategory = (req, res, next) => {
    const { name } = req.body;

    if (!name?.trim()) {
        return res.status(400).json({ error: "Category name is required" });
    }

    next();
};

/**
 * Report Validation Middleware
 *
 * This validation follows your established patterns from validateBusiness and validateCategory:
 * - Client-side validation replication for security
 * - Clear error message collection
 * - Early return on validation failures
 * - Consistent error response format
 * - NEW: HTML sanitization for security
 *
 * The validation ensures data integrity before reaching the database layer
 * and provides user-friendly error messages that match your frontend expectations.
 */
const validateReport = (req, res, next) => {
    const { businessId, issueTypes, description, honeypot } = req.body;
    const errors = [];

    // Business ID validation - must be valid MongoDB ObjectId
    if (!businessId?.trim()) {
        errors.push("Business ID is required");
    } else {
        // Basic ObjectId format validation
        const mongoose = require("mongoose");
        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            errors.push("Invalid business ID format");
        }
    }

    // Issue types validation - must be array with valid values
    if (!issueTypes || !Array.isArray(issueTypes) || issueTypes.length === 0) {
        errors.push("At least one issue type must be selected");
    } else {
        const allowedTypes = [
            "Broken Image",
            "Business No Longer Exists",
            "Other Issue",
        ];

        const invalidTypes = issueTypes.filter(
            (type) => !allowedTypes.includes(type)
        );
        if (invalidTypes.length > 0) {
            errors.push(`Invalid issue types: ${invalidTypes.join(", ")}`);
        }
    }

    // ENHANCED: Description validation with HTML sanitization
    if (description && typeof description !== "string") {
        errors.push("Description must be text");
    } else if (description && description.length > 50) {
        errors.push("Description cannot exceed 50 characters");
    } else if (
        description &&
        description.trim() &&
        !issueTypes?.includes("Other Issue")
    ) {
        errors.push(
            "Description can only be provided when 'Other Issue' is selected"
        );
    }

    // NEW: Sanitize description and detect malicious content
    if (description) {
        const originalDescription = description;
        const sanitizedDescription = sanitizeInput(description);

        // If content was removed during sanitization, it contained dangerous code
        if (originalDescription !== sanitizedDescription) {
            errors.push("Description contains invalid characters or HTML tags");
        }

        // Update request body with sanitized content
        req.body.description = sanitizedDescription;
    }

    // Honeypot validation - should be empty for legitimate users
    if (honeypot && honeypot.trim() !== "") {
        // Don't reveal honeypot in error message for security
        return res.status(400).json({
            error: "Invalid request format",
        });
    }

    // Return validation errors if any exist
    if (errors.length > 0) {
        return res.status(400).json({
            error: "Validation failed",
            details: errors,
        });
    }

    next();
};

/**
 * Report Status Update Validation
 *
 * Validates admin actions for updating report status.
 * Follows your pattern of separate validation functions for different operations.
 */
const validateReportStatusUpdate = (req, res, next) => {
    const { status, adminNotes } = req.body;
    const errors = [];

    // Status validation
    if (!status?.trim()) {
        errors.push("Status is required");
    } else {
        const allowedStatuses = ["pending", "resolved", "dismissed"];
        if (!allowedStatuses.includes(status)) {
            errors.push(
                "Invalid status. Must be: pending, resolved, or dismissed"
            );
        }
    }

    // Admin notes validation (optional) with sanitization
    if (adminNotes && typeof adminNotes !== "string") {
        errors.push("Admin notes must be text");
    } else if (adminNotes && adminNotes.length > 500) {
        errors.push("Admin notes cannot exceed 500 characters");
    }

    // NEW: Sanitize admin notes
    if (adminNotes) {
        const originalNotes = adminNotes;
        const sanitizedNotes = sanitizeInput(adminNotes);

        if (originalNotes !== sanitizedNotes) {
            errors.push("Admin notes contain invalid characters or HTML tags");
        }

        req.body.adminNotes = sanitizedNotes;
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: "Validation failed",
            details: errors,
        });
    }

    next();
};

/**
 * Rate Limiting Validation
 *
 * Implements IP-based rate limiting following your security-conscious approach.
 * This middleware checks recent reports from the same IP address.
 */
const validateRateLimit = async (req, res, next) => {
    try {
        const BusinessReport = require("../models/BusinessReport");
        const clientIp =
            req.ip ||
            req.connection.remoteAddress ||
            req.headers["x-forwarded-for"]?.split(",")[0];

        // Get recent reports from this IP (last hour)
        const recentReports = await BusinessReport.getRecentReportsByIp(
            clientIp,
            1
        );

        // Allow maximum 5 reports per hour per IP (changed from 20 for production)
        const maxReportsPerHour = 5;

        if (recentReports.length >= maxReportsPerHour) {
            return res.status(429).json({
                error: "Too many reports submitted. Please wait before submitting another report.",
                details: `Maximum ${maxReportsPerHour} reports allowed per hour`,
                retryAfter: 3600, // Seconds until next allowed request
            });
        }

        // Store the IP in request for later use
        req.reporterIp = clientIp;
        next();
    } catch (error) {
        console.error("Rate limiting check failed:", error);
        // Don't block request if rate limiting check fails
        // But log the issue for monitoring
        req.reporterIp = req.ip || "unknown";
        next();
    }
};

// Update the existing module.exports to include new validation functions
module.exports = {
    validateBusiness,
    validateCategory,
    validateReport,
    validateReportStatusUpdate,
    validateRateLimit,
};
