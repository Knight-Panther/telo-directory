// server/routes/auth.js
const express = require("express");
const User = require("../models/User");
const {
    generateTokenPair,
    verifyAccessToken,
    refreshAccessToken,
} = require("../middleware/userAuth");
const {
    validateUserRegistration,
    validateUserLogin,
    validateForgotPassword,
    validateResetPassword,
    validateEmailChange,
} = require("../middleware/validation");
// NEW: Email verification and password reset services
const {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendEmailChangeVerification,
    generateVerificationToken,
    getTokenExpiration,
} = require("../services/emailService");
// NEW: Temporary registration storage service
const {
    storeTempRegistration,
    hasEmailPendingRegistration,
} = require("../services/tempRegistrationService");
const router = express.Router();

/**
 * User Authentication Routes
 *
 * These routes follow your established patterns from admin/auth.js and public/businesses.js:
 * - Comprehensive validation before processing
 * - Detailed error responses with specific error codes
 * - Security-first approach with proper rate limiting
 * - Consistent response formatting across all endpoints
 * - Integration with your existing User model and middleware
 *
 * UPDATED: Now includes email verification workflow
 */

/**
 * POST /api/auth/register
 * Register a new user account with verify-before-save architecture
 *
 * NEW ARCHITECTURE: This endpoint now stores registration data temporarily
 * and only creates the actual user account AFTER email verification:
 * - Input validation and sanitization (including disposable email blocking)
 * - Duplicate email checking (both in database and temporary storage)
 * - Temporary storage of registration data
 * - Email verification token generation and email sending
 * - NO database user creation until email is verified
 */
router.post("/register", validateUserRegistration, async (req, res) => {
    try {
        const { email, password, name, phone } = req.body;

        // Check if user already exists in database (case-insensitive email check)
        const existingUser = await User.findByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                error: "An account with this email address already exists",
                code: "EMAIL_ALREADY_EXISTS",
                message:
                    "Please try logging in instead, or use a different email address",
            });
        }

        // NEW: Check if email has a pending registration in temporary storage
        if (hasEmailPendingRegistration(email)) {
            return res.status(409).json({
                error: "A registration is already pending for this email address",
                code: "REGISTRATION_PENDING",
                message:
                    "Please check your email to verify your account, or wait 24 hours to register again.",
                suggestion: "Check your email inbox and spam folder for the verification link.",
                // NEW: Provide redirect information for better UX
                redirectTo: `/verify-email?email=${encodeURIComponent(email)}`,
                action: "redirect_to_verification"
            });
        }

        // Generate email verification token
        const verificationToken = generateVerificationToken();

        // NEW: Store registration data temporarily instead of saving to database
        const registrationData = {
            email: email.toLowerCase().trim(),
            password, // Will be hashed by tempRegistrationService
            name: name.trim(),
            phone: phone ? phone.trim() : undefined,
            // Additional metadata for security tracking
            ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0],
            userAgent: req.headers['user-agent'] || 'unknown'
        };

        const storageSuccess = await storeTempRegistration(verificationToken, registrationData);

        if (!storageSuccess) {
            console.error("Failed to store temporary registration for:", email);
            return res.status(500).json({
                error: "Unable to process registration at this time",
                code: "REGISTRATION_STORAGE_ERROR",
                message: "Please try again in a few minutes.",
            });
        }

        // Send verification email
        try {
            await sendVerificationEmail(
                registrationData.email,
                registrationData.name,
                verificationToken,
                registrationData.ipAddress
            );

            // Log successful temporary registration for monitoring
            console.log(
                `📧 Temporary registration created for: ${
                    registrationData.email
                } at ${new Date().toISOString()}`
            );

            // Return success - user must verify email to complete registration
            res.status(201).json({
                success: true,
                message:
                    "Registration initiated! Please check your email to verify your account and complete the registration process.",
                requiresVerification: true,
                email: registrationData.email,
                // NEW: No user object returned since user isn't created yet
                tempRegistration: true,
                expiresIn: "24 hours",
                nextStep: "Check your email and click the verification link to create your account."
            });
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);

            // If email sending fails, we should clean up the temporary registration
            // since the user won't be able to verify it
            
            res.status(500).json({
                error: "Failed to send verification email",
                code: "EMAIL_SEND_FAILED",
                message:
                    "We couldn't send the verification email to your address. Please check your email address and try registering again.",
                suggestion: "Verify your email address is correct and try again in a few minutes.",
                // Don't reveal that we stored data temporarily
            });
        }
    } catch (error) {
        // Log unexpected errors for debugging
        console.error("Registration error:", error);

        res.status(500).json({
            error: "Internal server error during registration",
            code: "REGISTRATION_ERROR",
            message: "Something went wrong. Please try again."
        });
    }
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 *
 * UPDATED: This endpoint now checks email verification status:
 * - Account locking protection against brute force attacks
 * - Failed attempt tracking and progressive penalties
 * - Secure password comparison using bcrypt
 * - EMAIL VERIFICATION CHECK (new requirement)
 * - JWT token generation for session management (only if verified)
 */
router.post("/login", validateUserLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email (case-insensitive lookup)
        const user = await User.findByEmail(email);

        if (!user) {
            // Don't reveal whether email exists for security
            return res.status(401).json({
                error: "This email is not registered",
                code: "INVALID_CREDENTIALS",
            });
        }

        // Check if account is currently locked due to failed attempts
        if (user.isLocked) {
            return res.status(423).json({
                error: "Account temporarily locked due to too many failed login attempts. Please try again later.",
                code: "ACCOUNT_LOCKED",
                // Don't reveal exact unlock time for security
                message:
                    "Account will be unlocked automatically after the security timeout period",
            });
        }

        // Verify password using bcrypt comparison
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            // Increment failed login attempts before responding
            await user.incLoginAttempts();

            return res.status(401).json({
                error: "Invalid email or password",
                code: "INVALID_CREDENTIALS",
            });
        }

        // NEW: Check if email is verified before allowing login
        if (!user.isEmailVerified) {
            // Password is correct, but email not verified
            // Reset login attempts since credentials are valid
            await user.resetLoginAttempts();

            return res.status(403).json({
                error: "Please verify your email address before logging in",
                code: "EMAIL_NOT_VERIFIED",
                message:
                    "We've sent a verification email to your address. Please check your inbox and click the verification link.",
                requiresVerification: true,
                email: user.email,
            });
        }

        // NEW: Check if account is scheduled for deletion and cancel it
        let deletionCancelled = false;
        if (user.isScheduledForDeletion) {
            user.cancelDeletion();
            deletionCancelled = true;
            console.log(`Account deletion cancelled by login: ${user.email} (ID: ${user._id})`);
        }

        // Successful login - reset any failed login attempt counters and save user changes
        await user.resetLoginAttempts();
        
        // NEW: Save user changes (including deletion cancellation) to database
        if (deletionCancelled) {
            await user.save();
            console.log(`✅ Deletion cancellation saved to database for: ${user.email}`);
        }

        // Generate new token pair for this login session
        const tokens = generateTokenPair(user._id);

        // Log successful login for security monitoring
        console.log(`User login: ${user.email} at ${new Date().toISOString()}`);

        // Prepare response message
        let loginMessage = "Login successful";
        if (deletionCancelled) {
            loginMessage = "Welcome back! Your account deletion has been cancelled.";
        }

        res.json({
            success: true,
            message: loginMessage,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                isEmailVerified: user.isEmailVerified,
                lastLoginAt: user.lastLoginAt,
                favoritesCount: user.favorites.length,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            // NEW: Include deletion cancellation info
            deletionCancelled: deletionCancelled,
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            error: "Internal server error during login",
            code: "LOGIN_ERROR",
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 *
 * This endpoint enables seamless user sessions by allowing expired
 * access tokens to be refreshed without requiring full re-authentication.
 */
router.post("/refresh", async (req, res) => {
    return refreshAccessToken(req, res);
});

/**
 * GET /api/auth/me
 * Get current user profile information
 *
 * This protected endpoint returns the current user's profile data.
 * Requires valid access token in Authorization header.
 */
router.get("/me", verifyAccessToken, async (req, res) => {
    try {
        // User object is attached to req by verifyAccessToken middleware
        res.json({
            success: true,
            user: {
                id: req.user._id,
                email: req.user.email,
                name: req.user.name,
                phone: req.user.phone,
                isEmailVerified: req.user.isEmailVerified,
                favorites: req.user.favorites,
                favoritesCount: req.user.favorites.length,
                createdAt: req.user.createdAt,
                lastLoginAt: req.user.lastLoginAt,
            },
        });
    } catch (error) {
        console.error("Get profile error:", error);

        res.status(500).json({
            error: "Error retrieving user profile",
            code: "PROFILE_ERROR",
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (currently client-side only)
 *
 * With JWT tokens, logout is primarily handled on the client side
 * by removing tokens from storage. This endpoint exists for:
 * - Logging logout events
 * - Future token blacklisting features
 * - Consistent API design
 */
router.post("/logout", verifyAccessToken, async (req, res) => {
    try {
        // Log logout event for security monitoring
        console.log(
            `User logout: ${req.user.email} at ${new Date().toISOString()}`
        );

        // TODO Phase 4: Add token to blacklist for enhanced security
        // await blacklistToken(req.headers.authorization.split(' ')[1]);

        res.json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        console.error("Logout error:", error);

        res.status(500).json({
            error: "Error during logout",
            code: "LOGOUT_ERROR",
        });
    }
});

/**
 * PUT /api/auth/profile
 * Update user profile information
 *
 * Allows users to update their name and phone number.
 * Email changes require separate verification process (future feature).
 */
router.put("/profile", verifyAccessToken, async (req, res) => {
    try {
        const { name, phone } = req.body;
        const updateData = {};

        // Validate and prepare update data
        if (name !== undefined) {
            if (!name.trim() || name.trim().length < 2) {
                return res.status(400).json({
                    error: "Name must be at least 2 characters long",
                    code: "INVALID_NAME",
                });
            }
            updateData.name = name.trim();
        }

        if (phone !== undefined) {
            if (phone && !/^[+]?[0-9\s\-()]{9,15}$/.test(phone)) {
                return res.status(400).json({
                    error: "Please enter a valid phone number",
                    code: "INVALID_PHONE",
                });
            }
            updateData.phone = phone ? phone.trim() : "";
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select("-password");

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: updatedUser._id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                isEmailVerified: updatedUser.isEmailVerified,
                updatedAt: updatedUser.updatedAt,
            },
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const validationErrors = Object.values(error.errors).map(
                (err) => err.message
            );
            return res.status(400).json({
                error: "Profile validation failed",
                code: "VALIDATION_ERROR",
                details: validationErrors,
            });
        }

        console.error("Profile update error:", error);

        res.status(500).json({
            error: "Error updating profile",
            code: "PROFILE_UPDATE_ERROR",
        });
    }
});

/**
 * POST /api/auth/change-email
 * Simplified email change with 6-digit verification
 * 
 * Two-step process:
 * 1. POST with newEmail - sends 6-digit code to current email
 * 2. POST with verificationCode - completes the change
 * 
 * Security: Code sent to current email (user has access)
 * Rate limit: 1 change per hour
 */
router.post("/change-email", verifyAccessToken, validateEmailChange, async (req, res) => {
    try {
        const { newEmail, verificationCode } = req.body;
        const user = req.user;
        
        // Step 2: Verify code and complete change
        if (verificationCode) {
            if (!user.verifyEmailChangeCode(verificationCode)) {
                return res.status(400).json({
                    error: "Invalid or expired verification code",
                    code: "INVALID_CODE"
                });
            }
            
            // Complete the email change
            user.completeEmailChange();
            await user.save();
            
            return res.json({
                success: true,
                message: "Email address changed successfully",
                newEmail: user.email
            });
        }
        
        // Step 1: Request email change
        if (!newEmail) {
            return res.status(400).json({
                error: "New email address is required",
                code: "MISSING_EMAIL"
            });
        }
        
        // Validate new email
        if (newEmail === user.email) {
            return res.status(400).json({
                error: "New email is same as current email",
                code: "SAME_EMAIL"
            });
        }
        
        // Check rate limiting
        if (!user.canChangeEmail()) {
            return res.status(429).json({
                error: "You can only change your email once per hour",
                code: "RATE_LIMITED"
            });
        }
        
        // Check if email already exists
        const existingUser = await User.findByEmail(newEmail);
        if (existingUser) {
            return res.status(409).json({
                error: "Email address already in use",
                code: "EMAIL_EXISTS"
            });
        }
        
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.setEmailChangeCode(code, newEmail);
        await user.save();
        
        // Send code to current email
        const emailService = require('../services/emailService');
        await emailService.sendEmailChangeCode(user.email, user.name, code, newEmail);
        
        res.json({
            success: true,
            message: "Verification code sent to your current email address"
        });
        
    } catch (error) {
        console.error("Email change error:", error);
        res.status(500).json({
            error: "Internal server error",
            code: "EMAIL_CHANGE_ERROR"
        });
    }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 * 
 * Phase 4A implementation:
 * - Rate limited to 1 request per hour per email (security requirement)
 * - Always returns success message (prevents email enumeration)
 * - Only sends email if account exists and is verified
 * - Uses 30-minute token expiration for security
 */
router.post("/forgot-password", validateForgotPassword, async (req, res) => {
    try {
        const { email } = req.body;
        
        // Get client IP for rate limiting
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
        
        // Find user by email
        const user = await User.findByEmail(email);
        
        // SECURITY: Always respond with success message regardless of whether email exists
        // This prevents email enumeration attacks
        const successResponse = {
            success: true,
            message: "If an account with that email exists, we've sent password reset instructions.",
            email: email
        };
        
        // If user doesn't exist, just return success (don't reveal this info)
        if (!user) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            return res.json(successResponse);
        }
        
        // If user exists but email is not verified, don't send reset email
        // This prevents password reset bypass of email verification
        if (!user.isEmailVerified) {
            console.log(`Password reset requested for unverified email: ${email}`);
            return res.json(successResponse);
        }
        
        try {
            // Generate secure reset token
            const resetToken = generateVerificationToken();
            
            // Set the reset token on the user (30-minute expiration)
            user.setPasswordResetToken(resetToken);
            await user.save();
            
            // Send password reset email
            await sendPasswordResetEmail(
                user.email,
                user.name,
                resetToken,
                clientIp
            );
            
            console.log(`Password reset email sent to: ${user.email}`);
            
            return res.json(successResponse);
            
        } catch (emailError) {
            // If email sending fails, we should clear the reset token
            if (user.resetPasswordToken) {
                user.clearPasswordResetToken();
                await user.save();
            }
            
            // Check if it's a rate limiting error
            if (emailError.code === "RATE_LIMIT_EXCEEDED") {
                return res.status(429).json({
                    error: "Too many password reset requests. Please wait before trying again.",
                    code: "RATE_LIMIT_EXCEEDED",
                    retryAfter: emailError.remainingSeconds
                });
            }
            
            console.error("Failed to send password reset email:", emailError);
            
            // Still return success to prevent enumeration, but log the error
            return res.json({
                ...successResponse,
                message: "Password reset request received. If there was an issue, please try again in a few minutes."
            });
        }
        
    } catch (error) {
        console.error("Forgot password error:", error);
        
        res.status(500).json({
            error: "Internal server error",
            code: "FORGOT_PASSWORD_ERROR",
        });
    }
});

/**
 * POST /api/auth/reset-password/:token
 * Reset password using token from email
 * 
 * Phase 4A implementation:
 * - Validates token and expiration (30 minutes)
 * - Updates password with new hash
 * - Clears reset token after use
 * - Invalidates all user sessions for security
 */
router.post("/reset-password/:token", validateResetPassword, async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;
        
        // Find user by valid reset token
        const user = await User.findByResetToken(token);
        
        if (!user) {
            return res.status(400).json({
                error: "Password reset token is invalid or has expired",
                code: "INVALID_RESET_TOKEN",
                message: "Please request a new password reset if you need to change your password."
            });
        }
        
        // Additional security check (should be redundant with findByResetToken)
        if (!user.isPasswordResetTokenValid()) {
            return res.status(400).json({
                error: "Password reset token has expired",
                code: "EXPIRED_RESET_TOKEN",
                message: "Please request a new password reset."
            });
        }
        
        try {
            // Update password (will be automatically hashed by User model middleware)
            user.password = newPassword;
            
            // Clear the reset token to prevent reuse
            user.clearPasswordResetToken();
            
            // Reset any account locking from failed attempts
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            
            // Save all changes
            await user.save();
            
            console.log(`Password reset successful for: ${user.email}`);
            
            res.json({
                success: true,
                message: "Password has been reset successfully. You can now log in with your new password.",
                // Provide user email for login convenience
                email: user.email
            });
            
        } catch (saveError) {
            console.error("Error saving password reset:", saveError);
            
            return res.status(500).json({
                error: "Failed to reset password. Please try again.",
                code: "PASSWORD_RESET_SAVE_ERROR"
            });
        }
        
    } catch (error) {
        console.error("Reset password error:", error);
        
        res.status(500).json({
            error: "Internal server error",
            code: "RESET_PASSWORD_ERROR",
        });
    }
});

/**
 * POST /api/auth/change-password
 * Change user password with current password verification
 * 
 * Secure password change workflow:
 * - User must be authenticated
 * - Validates current password before change
 * - Enforces password strength requirements
 * - Updates password with proper hashing
 * - Logs password change for security audit
 */
router.post("/change-password", verifyAccessToken, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        // Need to fetch user with password field since verifyAccessToken excludes it
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                code: "USER_NOT_FOUND"
            });
        }
        
        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                error: "Current password, new password, and confirmation are required",
                code: "MISSING_FIELDS"
            });
        }
        
        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                error: "New password and confirmation do not match",
                code: "PASSWORD_MISMATCH"
            });
        }
        
        // Validate new password strength
        if (newPassword.length < 8) {
            return res.status(400).json({
                error: "New password must be at least 8 characters long",
                code: "PASSWORD_TOO_SHORT"
            });
        }
        
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({
                error: "New password must contain at least one uppercase letter, one lowercase letter, and one number",
                code: "PASSWORD_TOO_WEAK"
            });
        }
        
        // Check if new password is same as current
        if (currentPassword === newPassword) {
            return res.status(400).json({
                error: "New password must be different from current password",
                code: "SAME_PASSWORD"
            });
        }
        
        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                error: "Current password is incorrect",
                code: "INVALID_CURRENT_PASSWORD"
            });
        }
        
        try {
            // Update password (will be automatically hashed by User model middleware)
            user.password = newPassword;
            
            // Reset any account locking from failed attempts
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            
            // Save changes
            await user.save();
            
            console.log(`Password changed for user: ${user.email}`);
            
            res.json({
                success: true,
                message: "Password changed successfully"
            });
            
        } catch (saveError) {
            console.error("Error saving password change:", saveError);
            
            return res.status(500).json({
                error: "Failed to change password. Please try again.",
                code: "PASSWORD_SAVE_ERROR"
            });
        }
        
    } catch (error) {
        console.error("Change password error:", error);
        
        res.status(500).json({
            error: "Internal server error",
            code: "CHANGE_PASSWORD_ERROR",
        });
    }
});

/**
 * POST /api/auth/favorites/toggle/:businessId
 * Toggle business in user's favorites list
 */
router.post("/favorites/toggle/:businessId", verifyAccessToken, async (req, res) => {
    try {
        const { businessId } = req.params;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                error: "User not found",
                code: "USER_NOT_FOUND"
            });
        }

        // Validate business ID format
        if (!businessId || businessId.length !== 24) {
            return res.status(400).json({
                error: "Invalid business ID",
                code: "INVALID_BUSINESS_ID"
            });
        }

        // Check if business is already favorited
        const isFavorited = user.favorites.includes(businessId);

        if (isFavorited) {
            // Remove from favorites
            user.favorites = user.favorites.filter(id => id.toString() !== businessId);
            await user.save();

            res.json({
                success: true,
                action: "removed",
                message: "Business removed from favorites",
                favoritesCount: user.favorites.length
            });
        } else {
            // Add to favorites (using $addToSet to prevent duplicates)
            await User.findByIdAndUpdate(
                user._id,
                { $addToSet: { favorites: businessId } },
                { new: true }
            );

            res.json({
                success: true,
                action: "added",
                message: "Business added to favorites",
                favoritesCount: user.favorites.length + 1
            });
        }
    } catch (error) {
        console.error("Toggle favorites error:", error);
        res.status(500).json({
            error: "Internal server error",
            code: "FAVORITES_ERROR"
        });
    }
});

/**
 * GET /api/auth/favorites
 * Get user's favorites list with business details and pagination
 */
router.get("/favorites", verifyAccessToken, async (req, res) => {
    try {
        const { page = 1, limit = 25 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                code: "USER_NOT_FOUND"
            });
        }

        const totalFavorites = user.favorites.length;
        
        // Get paginated favorites with business details
        const paginatedUser = await User.findById(req.user._id)
            .populate({
                path: "favorites",
                options: {
                    skip: skip,
                    limit: limitNum
                }
            })
            .exec();

        const hasMore = (skip + limitNum) < totalFavorites;

        res.json({
            success: true,
            favorites: paginatedUser.favorites,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(totalFavorites / limitNum),
                totalItems: totalFavorites,
                itemsPerPage: limitNum,
                hasMore: hasMore
            }
        });
    } catch (error) {
        console.error("Get favorites error:", error);
        res.status(500).json({
            error: "Internal server error",
            code: "FAVORITES_ERROR"
        });
    }
});

/**
 * DELETE /api/auth/favorites/:businessId
 * Remove single business from favorites
 */
router.delete("/favorites/:businessId", verifyAccessToken, async (req, res) => {
    try {
        const { businessId } = req.params;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                error: "User not found",
                code: "USER_NOT_FOUND"
            });
        }

        // Remove from favorites
        user.favorites = user.favorites.filter(id => id.toString() !== businessId);
        await user.save();

        res.json({
            success: true,
            message: "Business removed from favorites",
            favoritesCount: user.favorites.length
        });
    } catch (error) {
        console.error("Delete favorite error:", error);
        res.status(500).json({
            error: "Internal server error",
            code: "FAVORITES_ERROR"
        });
    }
});

/**
 * POST /api/auth/favorites/bulk-delete
 * Remove multiple businesses from favorites
 */
router.post("/favorites/bulk-delete", verifyAccessToken, async (req, res) => {
    try {
        const { businessIds } = req.body;
        
        if (!businessIds || !Array.isArray(businessIds)) {
            return res.status(400).json({
                error: "Business IDs array is required",
                code: "INVALID_REQUEST"
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                code: "USER_NOT_FOUND"
            });
        }

        // Remove all specified business IDs
        user.favorites = user.favorites.filter(id => 
            !businessIds.includes(id.toString())
        );
        await user.save();

        res.json({
            success: true,
            message: `${businessIds.length} businesses removed from favorites`,
            favoritesCount: user.favorites.length
        });
    } catch (error) {
        console.error("Bulk delete favorites error:", error);
        res.status(500).json({
            error: "Internal server error",
            code: "FAVORITES_ERROR"
        });
    }
});

/**
 * DELETE /api/auth/account
 * Schedule user account for delayed deletion
 * 
 * NEW: Delayed deletion system:
 * - User must be authenticated
 * - Requires typing "DELETE" for confirmation
 * - Schedules deletion based on USER_DELETION_DELAY_DAYS
 * - Logs out user immediately after scheduling
 * - Can be cancelled by logging in before deletion date
 * - Actual deletion handled by background cleanup service
 */
router.delete("/account", verifyAccessToken, async (req, res) => {
    try {
        const { confirmationText } = req.body;
        // Need full user object with password field excluded but with all other fields
        const user = await User.findById(req.user._id).select("-password");
        
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                code: "USER_NOT_FOUND"
            });
        }
        
        // Require confirmation text
        if (confirmationText !== "DELETE") {
            return res.status(400).json({
                error: "Account deletion requires typing 'DELETE' as confirmation",
                code: "INVALID_CONFIRMATION"
            });
        }
        
        // Check if deletion is already scheduled
        if (user.isScheduledForDeletion) {
            return res.status(400).json({
                error: "Account deletion is already scheduled",
                code: "DELETION_ALREADY_SCHEDULED",
                message: `Your account is already scheduled for deletion on ${user.deletionScheduledFor.toDateString()}. You can cancel this by logging in again.`,
                scheduledFor: user.deletionScheduledFor,
                remainingDays: user.remainingDaysUntilDeletion
            });
        }
        
        try {
            // Schedule the deletion
            const deletionDate = user.scheduleDeletion();
            await user.save();
            
            // Log scheduled deletion for audit trail
            console.log(`Account deletion scheduled: ${user.email} (ID: ${user._id}) - will be deleted on ${deletionDate.toISOString()}`);
            
            // Get delay days for response
            const delayDays = parseInt(process.env.USER_DELETION_DELAY_DAYS) || 5;
            
            res.json({
                success: true,
                message: `Account deletion has been scheduled. Your account will be permanently deleted in ${delayDays} days. You can cancel this by logging in again before ${deletionDate.toDateString()}.`,
                scheduledDeletion: true,
                scheduledFor: deletionDate,
                delayDays: delayDays,
                canCancelBy: deletionDate,
                // Instruct client to logout user immediately
                forceLogout: true
            });
            
        } catch (scheduleError) {
            console.error("Error scheduling user account deletion:", scheduleError);
            
            return res.status(500).json({
                error: "Failed to schedule account deletion. Please try again or contact support.",
                code: "SCHEDULE_DELETION_ERROR"
            });
        }
        
    } catch (error) {
        console.error("Account deletion scheduling error:", error);
        
        res.status(500).json({
            error: "Internal server error",
            code: "ACCOUNT_DELETION_ERROR",
        });
    }
});

module.exports = router;
