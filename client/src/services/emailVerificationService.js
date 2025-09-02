// client/src/services/emailVerificationService.js
import axios from "axios";

/**
 * Email Verification Service
 *
 * Handles all email verification API calls from the frontend.
 * Provides clean interface for email verification workflows.
 *
 * Features:
 * - Email verification from token
 * - Resend verification requests
 * - Email change requests (for settings page)
 * - Error handling and standardized responses
 * - Rate limiting awareness
 */

// Create axios instance with default config
const emailAPI = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:3000/api",
    timeout: 10000, // 10 second timeout
    headers: {
        "Content-Type": "application/json",
    },
});

// Add request interceptor for authentication
emailAPI.interceptors.request.use(
    (config) => {
        // Add auth token for protected routes
        const token =
            localStorage.getItem("telo_user_access_token") ||
            sessionStorage.getItem("telo_user_access_token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
emailAPI.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle token expiration
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem("telo_user_access_token");
            sessionStorage.removeItem("telo_user_access_token");
            window.dispatchEvent(new CustomEvent("auth:token-expired"));
        }

        return Promise.reject(error);
    }
);

/**
 * Email Verification API Methods
 */
const emailVerificationService = {
    /**
     * Verify email using token from email link
     *
     * @param {string} token - Verification token from email URL
     * @returns {Object} - Verification result with user data and tokens
     */
    verifyEmail: async (token) => {
        try {
            const response = await emailAPI.get(`/auth/verify-email/${token}`);

            return {
                success: true,
                user: response.data.user,
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken,
                message: response.data.message,
                alreadyVerified: response.data.alreadyVerified || false,
            };
        } catch (error) {
            const errorData = error.response?.data || {};

            throw {
                success: false,
                message: errorData.error || "Email verification failed",
                code: errorData.code || "VERIFICATION_ERROR",
                details:
                    errorData.message ||
                    "Please try again or request a new verification email.",
            };
        }
    },

    /**
     * Resend verification email
     *
     * @param {string} email - User's email address
     * @returns {Object} - Resend result
     */
    resendVerification: async (email) => {
        try {
            const response = await emailAPI.post("/auth/resend-verification", {
                email: email.trim().toLowerCase(),
            });

            return {
                success: true,
                message: response.data.message,
                sentTo: response.data.sentTo,
                expiresIn: response.data.expiresIn,
                alreadyVerified: response.data.alreadyVerified || false,
            };
        } catch (error) {
            const errorData = error.response?.data || {};
            const status = error.response?.status;

            // Handle rate limiting specifically
            if (status === 429) {
                throw {
                    success: false,
                    message: errorData.message || "Too many requests",
                    code: "RATE_LIMIT_EXCEEDED",
                    remainingSeconds: errorData.remainingSeconds || 60,
                    rateLimited: true,
                };
            }

            throw {
                success: false,
                message:
                    errorData.error || "Failed to resend verification email",
                code: errorData.code || "RESEND_ERROR",
                details:
                    errorData.message ||
                    "Please check your email address and try again.",
            };
        }
    },

    /**
     * Request email address change (for authenticated users)
     * This will be used in the settings page
     *
     * @param {string} newEmail - New email address
     * @returns {Object} - Email change request result
     */
    requestEmailChange: async (newEmail) => {
        try {
            const response = await emailAPI.post("/auth/request-email-change", {
                newEmail: newEmail.trim().toLowerCase(),
            });

            return {
                success: true,
                message: response.data.message,
                newEmail: response.data.newEmail,
                currentEmail: response.data.currentEmail,
                expiresIn: response.data.expiresIn,
            };
        } catch (error) {
            const errorData = error.response?.data || {};
            const status = error.response?.status;

            // Handle different error types
            if (status === 409) {
                throw {
                    success: false,
                    message: "Email address already in use",
                    code: "EMAIL_ALREADY_EXISTS",
                    details: "Please choose a different email address.",
                };
            }

            if (status === 429) {
                throw {
                    success: false,
                    message:
                        errorData.message || "Too many email change requests",
                    code: "RATE_LIMIT_EXCEEDED",
                    remainingSeconds: errorData.remainingSeconds || 60,
                    rateLimited: true,
                };
            }

            throw {
                success: false,
                message: errorData.error || "Failed to request email change",
                code: errorData.code || "EMAIL_CHANGE_ERROR",
                details: errorData.message || "Please try again later.",
            };
        }
    },

    /**
     * Verify email change using token from email link
     *
     * @param {string} token - Email change verification token
     * @returns {Object} - Email change verification result
     */
    verifyEmailChange: async (token) => {
        try {
            const response = await emailAPI.get(
                `/auth/verify-email-change/${token}`
            );

            return {
                success: true,
                message: response.data.message,
                oldEmail: response.data.oldEmail,
                newEmail: response.data.newEmail,
                changedAt: response.data.changedAt,
            };
        } catch (error) {
            const errorData = error.response?.data || {};

            throw {
                success: false,
                message: errorData.error || "Email change verification failed",
                code: errorData.code || "EMAIL_CHANGE_VERIFICATION_ERROR",
                details:
                    errorData.message ||
                    "Please try requesting a new email change.",
            };
        }
    },

    /**
     * Check if email format is valid
     * Client-side validation before API calls
     *
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid format
     */
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email?.trim());
    },

    /**
     * Format email for display (partially masked for security)
     *
     * @param {string} email - Email to format
     * @returns {string} - Formatted email (e.g., "jo***@example.com")
     */
    formatEmailForDisplay: (email) => {
        if (!email) return "";

        const [local, domain] = email.split("@");
        if (!local || !domain) return email;

        if (local.length <= 3) {
            return email; // Don't mask very short emails
        }

        const maskedLocal =
            local.substring(0, 2) + "***" + local.substring(local.length - 1);
        return `${maskedLocal}@${domain}`;
    },

    /**
     * Get verification status from stored user data
     * Utility function for checking current verification state
     *
     * @returns {Object} - Verification status info
     */
    getVerificationStatus: () => {
        try {
            const userData =
                localStorage.getItem("telo_user_data") ||
                sessionStorage.getItem("telo_user_data");

            if (!userData) {
                return {
                    isVerified: false,
                    email: null,
                    hasUser: false,
                };
            }

            const user = JSON.parse(userData);

            return {
                isVerified: user.isEmailVerified || false,
                email: user.email || null,
                hasUser: true,
                verifiedAt: user.emailVerifiedAt || null,
            };
        } catch (error) {
            console.warn("Error parsing user data:", error);
            return {
                isVerified: false,
                email: null,
                hasUser: false,
            };
        }
    },

    /**
     * Clear email verification related data
     * Used when user logs out or verification fails
     */
    clearVerificationData: () => {
        // This could be expanded to clear specific verification-related cache
        console.log("Email verification data cleared");
    },
};

export default emailVerificationService;
