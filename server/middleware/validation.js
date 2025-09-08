// server/middleware/validation.js (this replaces express-validator.checks http request before mongoose schema)

// Import disposable email detection service
const { isDisposableEmail } = require('../services/disposableEmailService');

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

// ===== NEW USER VALIDATION FUNCTIONS (ADD THESE) =====

/**
 * User Registration Validation Middleware
 *
 * This validation follows your established patterns from validateBusiness and validateReport:
 * - Input sanitization to prevent XSS attacks
 * - Comprehensive field validation with clear error messages
 * - Password strength requirements for security
 * - Consistent error response format matching your existing API
 */
const validateUserRegistration = (req, res, next) => {
    const { email, password, name, phone } = req.body;
    const errors = [];

    // Email validation
    if (!email?.trim()) {
        errors.push("Email address is required");
    } else {
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email.trim())) {
            errors.push("Please enter a valid email address");
        } else {
            // NEW: Check for disposable email addresses
            const disposableCheck = isDisposableEmail(email.trim());
            if (disposableCheck.isDisposable) {
                errors.push(
                    `Disposable email addresses from ${disposableCheck.domain} are not allowed. Please use a permanent email address.`
                );
            }
        }
    }

    // Password strength validation
    if (!password) {
        errors.push("Password is required");
    } else {
        // Minimum length check
        if (password.length < 8) {
            errors.push("Password must be at least 8 characters long");
        }

        // Character variety requirements
        const hasLowercase = /(?=.*[a-z])/.test(password);
        const hasUppercase = /(?=.*[A-Z])/.test(password);
        const hasNumber = /(?=.*\d)/.test(password);
        const hasSpecialChar = /(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password);

        if (!hasLowercase) {
            errors.push("Password must contain at least one lowercase letter");
        }
        if (!hasUppercase) {
            errors.push("Password must contain at least one uppercase letter");
        }
        if (!hasNumber) {
            errors.push("Password must contain at least one number");
        }
        if (!hasSpecialChar) {
            errors.push(
                "Password must contain at least one special character (!@#$%^&*...)"
            );
        }

        // Check for common weak passwords
        const commonPasswords = [
            "password",
            "password123",
            "123456789",
            "qwerty123",
            "admin123",
            "welcome123",
            "letmein123",
        ];
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push(
                "Password is too common. Please choose a more unique password"
            );
        }
    }

    // Name validation
    if (!name?.trim()) {
        errors.push("Full name is required");
    } else {
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            errors.push("Name must be at least 2 characters long");
        }
        if (trimmedName.length > 50) {
            errors.push("Name cannot exceed 50 characters");
        }

        // Check for potentially malicious content
        if (/<[^>]*>/.test(trimmedName)) {
            errors.push("Name cannot contain HTML tags");
        }
    }

    // Phone validation (optional field)
    if (phone && phone.trim()) {
        const phoneRegex = /^[+]?[0-9\s\-()]{9,15}$/;
        if (!phoneRegex.test(phone.trim())) {
            errors.push(
                "Please enter a valid phone number (9-15 digits, may include +, spaces, dashes, parentheses)"
            );
        }
    }

    // Return validation errors if any exist
    if (errors.length > 0) {
        return res.status(400).json({
            error: "Registration validation failed",
            code: "VALIDATION_ERROR",
            details: errors,
        });
    }

    // Sanitize inputs before proceeding
    req.body.email = email.trim().toLowerCase();
    req.body.name = name.trim();
    req.body.phone = phone ? phone.trim() : undefined;

    next();
};

/**
 * User Login Validation Middleware
 *
 * Simpler validation for login since we only need email and password.
 * Follows the same error response format as registration validation.
 */
const validateUserLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    // Email validation (basic check - detailed validation was done at registration)
    if (!email?.trim()) {
        errors.push("Email address is required");
    } else {
        // Basic format check
        if (!email.includes("@") || !email.includes(".")) {
            errors.push("Please enter a valid email address");
        }
    }

    // Password validation (just check presence - strength was validated at registration)
    if (!password) {
        errors.push("Password is required");
    }

    // Return validation errors if any exist
    if (errors.length > 0) {
        return res.status(400).json({
            error: "Login validation failed",
            code: "VALIDATION_ERROR",
            details: errors,
        });
    }

    // Sanitize email input
    req.body.email = email.trim().toLowerCase();

    next();
};

/**
 * Password Change Validation Middleware
 *
 * For future password change functionality.
 * Validates both current password and new password requirements.
 */
const validatePasswordChange = (req, res, next) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const errors = [];

    // Current password validation
    if (!currentPassword) {
        errors.push("Current password is required");
    }

    // New password validation (same rules as registration)
    if (!newPassword) {
        errors.push("New password is required");
    } else {
        if (newPassword.length < 8) {
            errors.push("New password must be at least 8 characters long");
        }

        const hasLowercase = /(?=.*[a-z])/.test(newPassword);
        const hasUppercase = /(?=.*[A-Z])/.test(newPassword);
        const hasNumber = /(?=.*\d)/.test(newPassword);
        const hasSpecialChar = /(?=.*[!@#$%^&*(),.?":{}|<>])/.test(newPassword);

        if (!hasLowercase)
            errors.push(
                "New password must contain at least one lowercase letter"
            );
        if (!hasUppercase)
            errors.push(
                "New password must contain at least one uppercase letter"
            );
        if (!hasNumber)
            errors.push("New password must contain at least one number");
        if (!hasSpecialChar)
            errors.push(
                "New password must contain at least one special character"
            );

        // Ensure new password is different from current
        if (currentPassword === newPassword) {
            errors.push("New password must be different from current password");
        }
    }

    // Confirm password validation
    if (!confirmPassword) {
        errors.push("Password confirmation is required");
    } else if (newPassword !== confirmPassword) {
        errors.push("New password and confirmation do not match");
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: "Password change validation failed",
            code: "VALIDATION_ERROR",
            details: errors,
        });
    }

    next();
};

/**
 * Forgot Password Validation Middleware
 * 
 * Validates email for password reset request.
 * Follows security best practices by not revealing if email exists.
 */
const validateForgotPassword = (req, res, next) => {
    const { email } = req.body;
    const errors = [];

    // Email validation
    if (!email?.trim()) {
        errors.push("Email address is required");
    } else {
        // Basic format check
        if (!email.includes("@") || !email.includes(".")) {
            errors.push("Please enter a valid email address");
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            details: errors,
        });
    }

    // Sanitize email input
    req.body.email = email.trim().toLowerCase();

    next();
};

/**
 * Reset Password Validation Middleware
 * 
 * Validates new password and confirmation for password reset.
 * Uses same password strength requirements as registration.
 */
const validateResetPassword = (req, res, next) => {
    const { newPassword, confirmPassword } = req.body;
    const errors = [];

    // New password validation (same rules as registration)
    if (!newPassword) {
        errors.push("New password is required");
    } else {
        if (newPassword.length < 8) {
            errors.push("Password must be at least 8 characters long");
        }

        const hasLowercase = /(?=.*[a-z])/.test(newPassword);
        const hasUppercase = /(?=.*[A-Z])/.test(newPassword);
        const hasNumber = /(?=.*\d)/.test(newPassword);
        const hasSpecialChar = /(?=.*[!@#$%^&*(),.?":{}|<>])/.test(newPassword);

        if (!hasLowercase)
            errors.push("Password must contain at least one lowercase letter");
        if (!hasUppercase)
            errors.push("Password must contain at least one uppercase letter");
        if (!hasNumber)
            errors.push("Password must contain at least one number");
        if (!hasSpecialChar)
            errors.push("Password must contain at least one special character");

        // Check for common weak passwords
        const commonPasswords = [
            "password",
            "password123",
            "123456789",
            "qwerty123",
            "admin123",
            "welcome123",
            "letmein123",
        ];
        if (commonPasswords.includes(newPassword.toLowerCase())) {
            errors.push("Password is too common. Please choose a more unique password");
        }
    }

    // Confirm password validation
    if (!confirmPassword) {
        errors.push("Password confirmation is required");
    } else if (newPassword !== confirmPassword) {
        errors.push("Password and confirmation do not match");
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: "Password reset validation failed",
            code: "VALIDATION_ERROR",
            details: errors,
        });
    }

    next();
};

/**
 * Email Change Validation Middleware
 * 
 * Validates new email address for email change requests.
 */
const validateEmailChange = (req, res, next) => {
    const { newEmail } = req.body;
    const errors = [];

    // Email validation
    if (!newEmail?.trim()) {
        errors.push("New email address is required");
    } else {
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(newEmail.trim())) {
            errors.push("Please enter a valid email address");
        } else {
            // Check for disposable email addresses
            const disposableCheck = isDisposableEmail(newEmail.trim());
            if (disposableCheck.isDisposable) {
                errors.push(
                    `Disposable email addresses from ${disposableCheck.domain} are not allowed. Please use a permanent email address.`
                );
            }
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: "Email change validation failed",
            code: "VALIDATION_ERROR",
            details: errors,
        });
    }

    // Sanitize email input
    req.body.newEmail = newEmail.trim().toLowerCase();

    next();
};

// Update the existing module.exports to include new validation functions
module.exports = {
    validateBusiness,
    validateCategory,
    validateReport,
    validateReportStatusUpdate,
    validateRateLimit,
    // USER VALIDATION FUNCTIONS
    validateUserRegistration,
    validateUserLogin,
    validatePasswordChange,
    // PASSWORD RESET VALIDATION FUNCTIONS
    validateForgotPassword,
    validateResetPassword,
    // EMAIL CHANGE VALIDATION FUNCTIONS
    validateEmailChange,
};
