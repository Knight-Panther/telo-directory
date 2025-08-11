// server/middleware/userAuth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * User Authentication Middleware
 *
 * This middleware provides JWT-based authentication with dual-token security.
 * It follows your existing patterns from admin authentication but adds:
 * - Refresh token support for seamless user experience
 * - Enhanced security with separate token secrets
 * - Comprehensive error handling with specific error codes
 * - Integration with the User model's security features
 */

// JWT secrets from environment variables
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret-key";
const JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || "refresh-secret-key";

// Token expiration times (configurable via environment)
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m"; // Short-lived for security
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d"; // Long-lived for convenience

/**
 * Generate access and refresh token pair
 *
 * Access tokens contain minimal user info and expire quickly for security.
 * Refresh tokens are used only to generate new access tokens and last longer.
 * This dual-token approach provides both security and user convenience.
 *
 * @param {string} userId - MongoDB ObjectId of the user
 * @returns {Object} - Object containing accessToken and refreshToken
 */
const generateTokenPair = (userId) => {
    const accessToken = jwt.sign(
        {
            userId: userId.toString(), // Ensure string format for consistency
            type: "access",
            iat: Math.floor(Date.now() / 1000), // Issued at timestamp
        },
        JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
        {
            userId: userId.toString(),
            type: "refresh",
            iat: Math.floor(Date.now() / 1000),
        },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
};

/**
 * Verify access token middleware
 *
 * This middleware protects routes that require user authentication.
 * It follows your established error handling patterns from admin middleware
 * but adds user-specific features like account locking checks.
 *
 * Usage: router.get('/protected-route', verifyAccessToken, (req, res) => {...})
 */
const verifyAccessToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Check for properly formatted authorization header
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Access denied. No valid token provided.",
                code: "NO_TOKEN",
            });
        }

        const token = authHeader.split(" ")[1];

        // Verify the access token signature and expiration
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

        // Ensure this is actually an access token (not a refresh token)
        if (decoded.type !== "access") {
            return res.status(401).json({
                error: "Invalid token type. Access token required.",
                code: "INVALID_TOKEN_TYPE",
            });
        }

        // Get user from database with fresh data
        // Exclude password field for security
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(401).json({
                error: "User not found. Account may have been deleted.",
                code: "USER_NOT_FOUND",
            });
        }

        // Check if user account is currently locked due to failed login attempts
        if (user.isLocked) {
            return res.status(423).json({
                error: "Account temporarily locked due to failed login attempts.",
                code: "ACCOUNT_LOCKED",
            });
        }

        // Attach user object to request for use in route handlers
        req.user = user;
        next();
    } catch (error) {
        // Handle specific JWT errors with appropriate HTTP status codes
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                error: "Access token expired. Please refresh your token.",
                code: "TOKEN_EXPIRED",
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                error: "Invalid access token format.",
                code: "INVALID_TOKEN",
            });
        }

        if (error.name === "NotBeforeError") {
            return res.status(401).json({
                error: "Token not yet valid.",
                code: "TOKEN_NOT_ACTIVE",
            });
        }

        // Pass other errors to your centralized error handler
        console.error("Access token verification error:", error);
        next(error);
    }
};

/**
 * Optional authentication middleware
 *
 * This middleware checks for authentication but doesn't require it.
 * Useful for routes that should work for both logged-in and anonymous users
 * but provide different data based on authentication status.
 *
 * Example: Business listings that show favorite status if user is logged in
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // If no auth header, continue without user data
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            req.user = null;
            return next();
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

        if (decoded.type === "access") {
            const user = await User.findById(decoded.userId).select(
                "-password"
            );
            req.user = user || null;
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        // For optional auth, we don't fail on token errors
        // Just continue without user data
        req.user = null;
        next();
    }
};

/**
 * Refresh token endpoint logic
 *
 * This function handles the token refresh process, allowing users
 * to get new access tokens without logging in again. This creates
 * a seamless user experience while maintaining security.
 */
const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                error: "Refresh token is required in request body.",
                code: "NO_REFRESH_TOKEN",
            });
        }

        // Verify refresh token signature and expiration
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        if (decoded.type !== "refresh") {
            return res.status(400).json({
                error: "Invalid token type. Refresh token required.",
                code: "INVALID_TOKEN_TYPE",
            });
        }

        // Check if user still exists and account is in good standing
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                error: "User account not found. Please login again.",
                code: "USER_NOT_FOUND",
            });
        }

        // Check if account is locked
        if (user.isLocked) {
            return res.status(423).json({
                error: "Account temporarily locked. Cannot refresh tokens.",
                code: "ACCOUNT_LOCKED",
            });
        }

        // Generate new token pair
        const tokens = generateTokenPair(user._id);

        // Return new tokens with minimal user data
        res.json({
            success: true,
            message: "Tokens refreshed successfully",
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                isEmailVerified: user.isEmailVerified,
                lastLoginAt: user.lastLoginAt,
            },
        });
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                error: "Refresh token expired. Please login again.",
                code: "REFRESH_TOKEN_EXPIRED",
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                error: "Invalid refresh token format.",
                code: "INVALID_REFRESH_TOKEN",
            });
        }

        console.error("Token refresh error:", error);
        res.status(500).json({
            error: "Internal server error during token refresh.",
            code: "REFRESH_ERROR",
        });
    }
};

/**
 * Verify email verification token
 *
 * This function verifies tokens sent via email for account verification.
 * Used in email verification endpoints.
 */
const verifyEmailToken = async (token) => {
    try {
        // Use the User model's static method for consistency
        const user = await User.findByVerificationToken(token);
        return user;
    } catch (error) {
        console.error("Email verification token error:", error);
        return null;
    }
};

/**
 * Verify password reset token
 *
 * This function verifies tokens sent via email for password resets.
 * Used in password reset endpoints.
 */
const verifyResetToken = async (token) => {
    try {
        // Use the User model's static method for consistency
        const user = await User.findByResetToken(token);
        return user;
    } catch (error) {
        console.error("Password reset token error:", error);
        return null;
    }
};

/**
 * Check if user owns resource middleware
 *
 * This middleware ensures users can only access/modify their own data.
 * Useful for profile updates, favorites management, etc.
 *
 * Usage: router.put('/profile/:userId', verifyAccessToken, checkResourceOwnership, (req, res) => {...})
 */
const checkResourceOwnership = (req, res, next) => {
    const requestedUserId = req.params.userId || req.params.id;
    const currentUserId = req.user._id.toString();

    if (requestedUserId !== currentUserId) {
        return res.status(403).json({
            error: "Access denied. You can only access your own resources.",
            code: "INSUFFICIENT_PERMISSIONS",
        });
    }

    next();
};

// Export all authentication functions and utilities
module.exports = {
    generateTokenPair,
    verifyAccessToken,
    optionalAuth,
    refreshAccessToken,
    verifyEmailToken,
    verifyResetToken,
    checkResourceOwnership,
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
};
