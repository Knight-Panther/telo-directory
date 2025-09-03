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
} = require("../middleware/validation");
// NEW: Email verification service
const {
    sendVerificationEmail,
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

        // Successful login - reset any failed login attempt counters
        await user.resetLoginAttempts();

        // Generate new token pair for this login session
        const tokens = generateTokenPair(user._id);

        // Log successful login for security monitoring
        console.log(`User login: ${user.email} at ${new Date().toISOString()}`);

        res.json({
            success: true,
            message: "Login successful",
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

module.exports = router;
