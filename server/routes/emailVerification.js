// server/routes/emailVerification.js
const express = require("express");
const User = require("../models/User");
const {
    generateTokenPair,
    verifyAccessToken,
} = require("../middleware/userAuth");
// NEW: Import temporary registration service
const {
    retrieveAndRemoveTempRegistration,
    hasTempRegistration,
    getPendingRegistrationByEmail,
    regenerateVerificationToken,
} = require("../services/tempRegistrationService");
const {
    sendVerificationEmail,
    sendEmailChangeVerification,
    generateVerificationToken,
    getTokenExpiration,
    checkRateLimit,
    isValidEmail,
} = require("../services/emailService");
const router = express.Router();

/**
 * Email Verification Routes for TELO Directory
 *
 * Handles all email verification workflows:
 * - Email verification from registration
 * - Resending verification emails
 * - Email change verification (future: settings page)
 *
 * Security features:
 * - Rate limiting (1 email per minute)
 * - Secure token validation
 * - Token invalidation after use
 * - Comprehensive error handling
 */

/**
 * GET /api/auth/verify-email/:token
 * Verify email address and create user account (NEW: verify-before-save)
 *
 * NEW BEHAVIOR: This endpoint now handles two scenarios:
 * 1. NEW REGISTRATIONS: Creates user account from temporary storage
 * 2. EXISTING USERS: Verifies email for users who already exist (legacy support)
 */
router.get("/verify-email/:token", async (req, res) => {
    try {
        const { token } = req.params;

        // Validate token format
        if (!token || token.length !== 64) {
            // Our tokens are 64 chars (32 bytes hex)
            return res.status(400).json({
                error: "Invalid verification token format",
                code: "INVALID_TOKEN_FORMAT",
            });
        }

        // NEW: First check if this is a temporary registration
        const tempRegistration = retrieveAndRemoveTempRegistration(token);

        if (tempRegistration) {
            // NEW PATH: Create user account from temporary registration
            try {
                // Check if user somehow got created while verification was pending
                const existingUser = await User.findByEmail(tempRegistration.email);
                
                if (existingUser) {
                    return res.status(409).json({
                        error: "An account with this email already exists",
                        code: "EMAIL_ALREADY_EXISTS",
                        message: "Please try logging in instead.",
                    });
                }

                // Create the actual user account
                const user = new User({
                    email: tempRegistration.email,
                    password: tempRegistration.password, // Already hashed by tempRegistrationService
                    name: tempRegistration.name,
                    phone: tempRegistration.phone,
                    // Set as verified immediately since they clicked the verification link
                    isEmailVerified: true,
                    emailVerifiedAt: new Date(),
                    // No verification token fields needed since already verified
                });

                // Override password hashing middleware since password is already hashed
                user.$__skipPasswordHashing = true;

                await user.save();

                // Generate JWT tokens for immediate login
                const tokens = generateTokenPair(user._id);

                console.log(
                    `🎉 User account created and verified: ${user.email} at ${new Date().toISOString()}`
                );

                return res.json({
                    success: true,
                    message: "Email verified successfully! Your account has been created and you are now logged in.",
                    user: {
                        id: user._id,
                        email: user.email,
                        name: user.name,
                        phone: user.phone,
                        isEmailVerified: true,
                        emailVerifiedAt: user.emailVerifiedAt,
                        createdAt: user.createdAt,
                    },
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    newAccount: true, // Flag to indicate this is a newly created account
                });

            } catch (userCreationError) {
                console.error("Failed to create user from temporary registration:", userCreationError);
                
                // Handle duplicate key errors
                if (userCreationError.code === 11000) {
                    return res.status(409).json({
                        error: "An account with this email already exists",
                        code: "EMAIL_ALREADY_EXISTS",
                        message: "Please try logging in instead.",
                    });
                }

                return res.status(500).json({
                    error: "Failed to create your account",
                    code: "ACCOUNT_CREATION_ERROR",
                    message: "Something went wrong while creating your account. Please try registering again.",
                });
            }
        }

        // LEGACY PATH: Handle existing users who need email verification
        // This supports users who were created before the verify-before-save change
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() }, // Token must not be expired
        });

        if (!user) {
            return res.status(400).json({
                error: "Invalid or expired verification token",
                code: "INVALID_OR_EXPIRED_TOKEN",
                message:
                    "This verification link is invalid or has expired. Please request a new one.",
            });
        }

        // Check if user is already verified
        if (user.isEmailVerified) {
            // Generate tokens for already verified user (graceful handling)
            const tokens = generateTokenPair(user._id);

            return res.json({
                success: true,
                message: "Email already verified. You are now logged in.",
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    isEmailVerified: true,
                    createdAt: user.createdAt,
                },
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                alreadyVerified: true,
            });
        }

        // Mark existing user as verified and clear verification fields
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        user.emailVerifiedAt = new Date();

        await user.save();

        // Generate JWT tokens for immediate login
        const tokens = generateTokenPair(user._id);

        // Log successful verification for monitoring
        console.log(
            `✅ Email verified for existing user: ${
                user.email
            } at ${new Date().toISOString()}`
        );

        // Return success with tokens
        res.json({
            success: true,
            message: "Email verified successfully! You are now logged in.",
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                isEmailVerified: true,
                emailVerifiedAt: user.emailVerifiedAt,
                createdAt: user.createdAt,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (error) {
        console.error("Email verification error:", error);

        res.status(500).json({
            error: "Internal server error during email verification",
            code: "VERIFICATION_ERROR",
            message:
                "Something went wrong. Please try again or contact support.",
        });
    }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 *
 * Body: { email }
 *
 * Allows users to request a new verification email if:
 * - Original email was not received
 * - Original verification token expired
 * - User entered wrong email initially
 */
router.post("/resend-verification", async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email format
        if (!email || !isValidEmail(email)) {
            return res.status(400).json({
                error: "Valid email address is required",
                code: "INVALID_EMAIL_FORMAT",
            });
        }

        // NEW: Check if there's a pending temporary registration and resend if needed
        const normalizedEmail = email.toLowerCase().trim();
        const pendingRegistration = getPendingRegistrationByEmail(normalizedEmail);
        
        if (pendingRegistration) {
            // Check rate limiting for temp registration resends
            const rateCheck = checkRateLimit(normalizedEmail);
            if (!rateCheck.allowed) {
                return res.status(429).json({
                    error: "Too many verification emails sent",
                    code: "RATE_LIMIT_EXCEEDED",
                    message: `Please wait ${rateCheck.remainingSeconds} seconds before requesting another email.`,
                    remainingSeconds: rateCheck.remainingSeconds,
                });
            }

            // Generate new verification token (invalidates old one)
            const newVerificationToken = generateVerificationToken();
            const updatedRegistration = regenerateVerificationToken(normalizedEmail, newVerificationToken);
            
            if (!updatedRegistration) {
                return res.status(400).json({
                    error: "Registration not found or expired",
                    code: "REGISTRATION_NOT_FOUND",
                    message: "Your registration may have expired. Please register again.",
                });
            }

            // Resend verification email with new token
            try {
                const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
                await sendVerificationEmail(
                    updatedRegistration.email,
                    updatedRegistration.name,
                    updatedRegistration.verificationToken,
                    clientIp
                );

                console.log(`📧 Verification email resent with new token for temp registration: ${updatedRegistration.email}`);

                return res.json({
                    success: true,
                    message:
                        "Verification email sent successfully! Please check your inbox and spam folder. Previous verification links are now invalid.",
                    sentTo: updatedRegistration.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
                    expiresIn: "24 hours",
                    isPendingRegistration: true,
                    tokenRegenerated: true, // Inform frontend that old links are invalid
                });
            } catch (emailError) {
                console.error("Failed to resend verification email for temp registration:", emailError);

                if (emailError.code === "RATE_LIMIT_EXCEEDED") {
                    return res.status(429).json({
                        error: "Too many verification emails sent",
                        code: "RATE_LIMIT_EXCEEDED",
                        message: `Please wait ${emailError.remainingSeconds} seconds before trying again.`,
                        remainingSeconds: emailError.remainingSeconds,
                    });
                }

                return res.status(500).json({
                    error: "Failed to send verification email",
                    code: "EMAIL_SEND_FAILED",
                    message:
                        "Unable to send email at this time. Please check your email address and try again, or contact support if the problem persists.",
                    suggestion:
                        "Verify your email address is correct and try again in a few minutes.",
                });
            }
        }

        // Find user by email (case-insensitive)
        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        });

        if (!user) {
            // Don't reveal whether email exists for security
            // But still return success to prevent email enumeration
            return res.json({
                success: true,
                message:
                    "If an account with this email exists and is unverified, a verification email has been sent.",
                rateLimitNote: "Please wait 1 minute between requests.",
            });
        }

        // Check if user is already verified
        if (user.isEmailVerified) {
            return res.json({
                success: true,
                message:
                    "This email is already verified. You can log in normally.",
                alreadyVerified: true,
            });
        }

        // Check rate limiting
        const rateCheck = checkRateLimit(user.email);
        if (!rateCheck.allowed) {
            return res.status(429).json({
                error: "Too many verification emails sent",
                code: "RATE_LIMIT_EXCEEDED",
                message: `Please wait ${rateCheck.remainingSeconds} seconds before requesting another email.`,
                remainingSeconds: rateCheck.remainingSeconds,
            });
        }

        // Generate new verification token (invalidates old one)
        const verificationToken = generateVerificationToken();
        const tokenExpiration = getTokenExpiration();

        // Update user with new token
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = tokenExpiration;
        await user.save();

        // Send verification email
        try {
            const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
            await sendVerificationEmail(
                user.email,
                user.name,
                verificationToken,
                clientIp
            );

            console.log(`📧 Verification email resent to: ${user.email}`);

            res.json({
                success: true,
                message:
                    "Verification email sent successfully! Please check your inbox and spam folder.",
                sentTo: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Partially mask email for security
                expiresIn: "24 hours",
            });
        } catch (emailError) {
            console.error("Failed to resend verification email:", emailError);

            // Handle different email error types
            if (emailError.code === "RATE_LIMIT_EXCEEDED") {
                return res.status(429).json({
                    error: "Too many verification emails sent",
                    code: "RATE_LIMIT_EXCEEDED",
                    message: `Please wait ${emailError.remainingSeconds} seconds before trying again.`,
                    remainingSeconds: emailError.remainingSeconds,
                });
            }

            res.status(500).json({
                error: "Failed to send verification email",
                code: "EMAIL_SEND_FAILED",
                message:
                    "Unable to send email at this time. Please check your email address and try again, or contact support if the problem persists.",
                suggestion:
                    "Verify your email address is correct and try again in a few minutes.",
            });
        }
    } catch (error) {
        console.error("Resend verification error:", error);

        res.status(500).json({
            error: "Internal server error",
            code: "RESEND_ERROR",
            message: "Something went wrong. Please try again.",
        });
    }
});

/**
 * POST /api/auth/request-email-change
 * Request email address change (for authenticated users)
 *
 * Body: { newEmail }
 * Headers: Authorization: Bearer <token>
 *
 * This will be used in the settings page when users want to change their email.
 * Creates a temporary email change request that needs verification.
 */
router.post("/request-email-change", verifyAccessToken, async (req, res) => {
    try {
        const { newEmail } = req.body;
        const currentUser = req.user;

        // Validate new email format
        if (!newEmail || !isValidEmail(newEmail)) {
            return res.status(400).json({
                error: "Valid new email address is required",
                code: "INVALID_EMAIL_FORMAT",
            });
        }

        const normalizedEmail = newEmail.toLowerCase().trim();

        // Check if new email is same as current
        if (normalizedEmail === currentUser.email) {
            return res.status(400).json({
                error: "New email must be different from current email",
                code: "SAME_EMAIL_ADDRESS",
            });
        }

        // Check if new email is already taken
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                error: "Email address already in use",
                code: "EMAIL_ALREADY_EXISTS",
                message:
                    "This email address is already associated with another account.",
            });
        }

        // Check rate limiting for new email
        const rateCheck = checkRateLimit(normalizedEmail);
        if (!rateCheck.allowed) {
            return res.status(429).json({
                error: "Too many email change requests",
                code: "RATE_LIMIT_EXCEEDED",
                message: `Please wait ${rateCheck.remainingSeconds} seconds before requesting another email change.`,
                remainingSeconds: rateCheck.remainingSeconds,
            });
        }

        // Generate verification token for email change
        const verificationToken = generateVerificationToken();
        const tokenExpiration = getTokenExpiration();

        // Store email change request (we'll add these fields to User model)
        currentUser.pendingEmailChange = normalizedEmail;
        currentUser.emailChangeToken = verificationToken;
        currentUser.emailChangeTokenExpires = tokenExpiration;
        await currentUser.save();

        // Send verification email to NEW email address
        try {
            const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
            await sendEmailChangeVerification(
                normalizedEmail,
                currentUser.name,
                verificationToken,
                clientIp
            );

            console.log(
                `📧 Email change verification sent from ${currentUser.email} to ${normalizedEmail}`
            );

            res.json({
                success: true,
                message:
                    "Email change verification sent! Please check your new email inbox to confirm the change.",
                newEmail: normalizedEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Partially mask
                currentEmail: currentUser.email.replace(
                    /(.{2})(.*)(@.*)/,
                    "$1***$3"
                ),
                expiresIn: "24 hours",
            });
        } catch (emailError) {
            console.error(
                "Failed to send email change verification:",
                emailError
            );

            if (emailError.code === "RATE_LIMIT_EXCEEDED") {
                return res.status(429).json({
                    error: "Too many verification emails sent",
                    code: "RATE_LIMIT_EXCEEDED",
                    message: `Please wait ${emailError.remainingSeconds} seconds before trying again.`,
                    remainingSeconds: emailError.remainingSeconds,
                });
            }

            res.status(500).json({
                error: "Failed to send email change verification",
                code: "EMAIL_SEND_FAILED",
                message:
                    "Unable to send verification email. Please check the new email address and try again.",
            });
        }
    } catch (error) {
        console.error("Email change request error:", error);

        res.status(500).json({
            error: "Internal server error",
            code: "EMAIL_CHANGE_ERROR",
            message: "Something went wrong. Please try again.",
        });
    }
});

/**
 * GET /api/auth/verify-email-change/:token
 * Verify email change using token from email
 *
 * This completes the email change process when user clicks the link
 * in the verification email sent to their NEW email address.
 */
router.get(
    "/verify-email-change/:token",
    verifyAccessToken,
    async (req, res) => {
        try {
            const { token } = req.params;
            const currentUser = req.user;

            // Validate token format
            if (!token || token.length !== 64) {
                return res.status(400).json({
                    error: "Invalid email change token format",
                    code: "INVALID_TOKEN_FORMAT",
                });
            }

            // Check if user has a pending email change with this token
            if (
                !currentUser.emailChangeToken ||
                currentUser.emailChangeToken !== token ||
                !currentUser.emailChangeTokenExpires ||
                currentUser.emailChangeTokenExpires < new Date()
            ) {
                return res.status(400).json({
                    error: "Invalid or expired email change token",
                    code: "INVALID_OR_EXPIRED_TOKEN",
                    message:
                        "This email change link is invalid or has expired. Please request a new one.",
                });
            }

            const newEmail = currentUser.pendingEmailChange;
            if (!newEmail) {
                return res.status(400).json({
                    error: "No pending email change found",
                    code: "NO_PENDING_CHANGE",
                });
            }

            // Final check: ensure new email is still available
            const existingUser = await User.findOne({ email: newEmail });
            if (
                existingUser &&
                existingUser._id.toString() !== currentUser._id.toString()
            ) {
                return res.status(409).json({
                    error: "Email address no longer available",
                    code: "EMAIL_TAKEN",
                    message:
                        "This email address has been taken by another user. Please try a different email.",
                });
            }

            const oldEmail = currentUser.email;

            // Update user's email and clear change request fields
            currentUser.email = newEmail;
            currentUser.pendingEmailChange = undefined;
            currentUser.emailChangeToken = undefined;
            currentUser.emailChangeTokenExpires = undefined;
            currentUser.emailChangedAt = new Date();

            await currentUser.save();

            console.log(`✅ Email changed for user: ${oldEmail} → ${newEmail}`);

            res.json({
                success: true,
                message: "Email address updated successfully!",
                oldEmail: oldEmail,
                newEmail: newEmail,
                changedAt: currentUser.emailChangedAt,
            });
        } catch (error) {
            console.error("Email change verification error:", error);

            res.status(500).json({
                error: "Internal server error during email change verification",
                code: "EMAIL_CHANGE_VERIFICATION_ERROR",
                message: "Something went wrong. Please try again.",
            });
        }
    }
);


module.exports = router;
