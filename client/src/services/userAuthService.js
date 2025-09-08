// client/src/services/userAuthService.js
import axios from "axios";

/**
 * User Authentication Service
 *
 * Dedicated service for user authentication, registration, and profile management.
 * Completely separate from admin authentication for clean code organization.
 *
 * Features:
 * - User registration and login
 * - Automatic token refresh
 * - "Remember Me" functionality
 * - Profile management
 * - Secure token storage
 *
 * UPDATED: Now includes email verification workflow support
 */

// Token storage keys
const ACCESS_TOKEN_KEY = "telo_user_access_token";
const REFRESH_TOKEN_KEY = "telo_user_refresh_token";
const USER_DATA_KEY = "telo_user_data";
const REMEMBER_ME_KEY = "telo_remember_me";

/**
 * Token Management Functions
 */
const tokenManager = {
    // Get access token from storage
    getAccessToken: () => {
        return (
            localStorage.getItem(ACCESS_TOKEN_KEY) ||
            sessionStorage.getItem(ACCESS_TOKEN_KEY)
        );
    },

    // Get refresh token from storage
    getRefreshToken: () => {
        return (
            localStorage.getItem(REFRESH_TOKEN_KEY) ||
            sessionStorage.getItem(REFRESH_TOKEN_KEY)
        );
    },

    // Store tokens (respects "Remember Me" setting)
    setTokens: (accessToken, refreshToken, rememberMe = true) => {
        if (rememberMe) {
            // Store in localStorage for persistence across browser sessions
            localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
            localStorage.setItem(REMEMBER_ME_KEY, "true");
        } else {
            // Store in sessionStorage for current session only
            sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
            sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
            localStorage.setItem(REMEMBER_ME_KEY, "false");
        }
    },

    // Store user data
    setUserData: (userData) => {
        const storage =
            localStorage.getItem(REMEMBER_ME_KEY) === "true"
                ? localStorage
                : sessionStorage;
        storage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    },

    // Get user data
    getUserData: () => {
        const stored =
            localStorage.getItem(USER_DATA_KEY) ||
            sessionStorage.getItem(USER_DATA_KEY);
        return stored ? JSON.parse(stored) : null;
    },

    // Clear all tokens and user data
    clearTokens: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
        localStorage.removeItem(REMEMBER_ME_KEY);
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(USER_DATA_KEY);
    },

    // Check if user wants to be remembered
    shouldRemember: () => {
        return localStorage.getItem(REMEMBER_ME_KEY) === "true";
    },
};

/**
 * Create axios instance for user API requests
 */
const createUserAPI = () => {
    const userAPI = axios.create({
        baseURL: process.env.REACT_APP_API_URL || "http://localhost:3000/api",
        headers: {
            "Content-Type": "application/json",
        },
    });

    // Request interceptor - automatically add access token to requests
    userAPI.interceptors.request.use(
        (config) => {
            const token = tokenManager.getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor - handle automatic token refresh and email verification
    userAPI.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            // NEW: Handle email verification errors
            // BUT NOT for login requests - let the login function handle those
            if (
                error.response?.status === 403 &&
                error.response?.data?.code === "EMAIL_NOT_VERIFIED" &&
                !originalRequest.url.includes('/auth/login')
            ) {
                // User needs to verify email - clear tokens and emit event
                tokenManager.clearTokens();
                window.dispatchEvent(
                    new CustomEvent("auth:email-not-verified", {
                        detail: error.response.data,
                    })
                );
                return Promise.reject({
                    ...error.response.data,
                    requiresVerification: true,
                });
            }

            // If access token expired and we haven't already tried to refresh
            if (
                error.response?.status === 401 &&
                error.response?.data?.code === "TOKEN_EXPIRED" &&
                !originalRequest._retry
            ) {
                originalRequest._retry = true;

                try {
                    // Try to refresh the token
                    const refreshToken = tokenManager.getRefreshToken();
                    if (!refreshToken) {
                        throw new Error("No refresh token available");
                    }

                    const response = await axios.post(
                        `${
                            process.env.REACT_APP_API_URL ||
                            "http://localhost:3000/api"
                        }/auth/refresh`,
                        { refreshToken }
                    );

                    const { accessToken, refreshToken: newRefreshToken } =
                        response.data;

                    // Store new tokens
                    tokenManager.setTokens(
                        accessToken,
                        newRefreshToken,
                        tokenManager.shouldRemember()
                    );

                    // Retry the original request with new token
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return userAPI(originalRequest);
                } catch (refreshError) {
                    // Refresh failed - user needs to login again
                    tokenManager.clearTokens();

                    // Emit custom event for authentication context to handle
                    window.dispatchEvent(new CustomEvent("auth:token-expired"));

                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );

    return userAPI;
};

// Create user API instance
const userAPI = createUserAPI();

/**
 * User Authentication Service Methods
 */
const userAuthService = {
    /**
     * Register new user account
     * UPDATED: Now handles email verification requirement
     */
    register: async (userData) => {
        try {
            const response = await userAPI.post("/auth/register", userData);
            const data = response.data;

            // NEW: Check if registration requires email verification
            if (data.requiresVerification) {
                // Registration successful but requires email verification
                // Do NOT store tokens yet
                return {
                    success: true,
                    user: data.user,
                    message: data.message,
                    requiresVerification: true,
                    emailSendFailed: data.emailSendFailed || false,
                };
            } else {
                // Legacy path: immediate login (shouldn't happen with new backend)
                const { user, accessToken, refreshToken } = data;

                tokenManager.setTokens(accessToken, refreshToken, true);
                tokenManager.setUserData(user);

                return {
                    success: true,
                    user,
                    message: data.message,
                    requiresVerification: false,
                };
            }
        } catch (error) {
            throw {
                message: error.response?.data?.error || "Registration failed",
                details: error.response?.data?.details || [],
                code: error.response?.data?.code || "REGISTRATION_ERROR",
            };
        }
    },

    /**
     * Login existing user
     * UPDATED: Now handles email verification requirement
     */
    login: async (credentials, rememberMe = true) => {
        try {
            const response = await userAPI.post("/auth/login", credentials);
            const data = response.data;

            // NEW: Check if login requires email verification
            if (data.requiresVerification) {
                // Credentials valid but email not verified
                return {
                    success: false,
                    message: data.error || "Please verify your email address",
                    requiresVerification: true,
                    email: data.email,
                    code: data.code,
                };
            } else {
                // Normal login flow
                const { user, accessToken, refreshToken } = data;

                // Store tokens and user data with remember me preference
                tokenManager.setTokens(accessToken, refreshToken, rememberMe);
                tokenManager.setUserData(user);

                return {
                    success: true,
                    user,
                    message: data.message,
                    requiresVerification: false,
                };
            }
        } catch (error) {
            // Handle email verification errors from backend
            if (
                error.response?.status === 403 &&
                error.response?.data?.code === "EMAIL_NOT_VERIFIED"
            ) {
                return {
                    success: false,
                    message: error.response.data.error,
                    requiresVerification: true,
                    email: error.response.data.email,
                    code: error.response.data.code,
                };
            }

            throw {
                message: error.response?.data?.error || "Login failed",
                details: error.response?.data?.details || [],
                code: error.response?.data?.code || "LOGIN_ERROR",
            };
        }
    },

    /**
     * Logout user
     */
    logout: async () => {
        try {
            // Call backend logout endpoint
            await userAPI.post("/auth/logout");
        } catch (error) {
            // Even if backend logout fails, clear local tokens
            console.warn("Logout API call failed:", error.message);
        } finally {
            // Always clear local storage
            tokenManager.clearTokens();
        }
    },

    /**
     * Get current user profile
     * UPDATED: Now handles email verification errors
     */
    getCurrentUser: async () => {
        try {
            const response = await userAPI.get("/auth/me");
            const user = response.data.user;

            // Update stored user data
            tokenManager.setUserData(user);

            return user;
        } catch (error) {
            // Handle email verification errors
            if (
                error.response?.status === 403 &&
                error.response?.data?.code === "EMAIL_NOT_VERIFIED"
            ) {
                throw {
                    message: error.response.data.error,
                    code: "EMAIL_NOT_VERIFIED",
                    requiresVerification: true,
                };
            }

            throw {
                message:
                    error.response?.data?.error || "Failed to get user profile",
                code: error.response?.data?.code || "PROFILE_ERROR",
            };
        }
    },

    /**
     * Update user profile
     */
    updateProfile: async (profileData) => {
        try {
            const response = await userAPI.put("/auth/profile", profileData);
            const user = response.data.user;

            // Update stored user data
            tokenManager.setUserData(user);

            return {
                success: true,
                user,
                message: response.data.message,
            };
        } catch (error) {
            throw {
                message: error.response?.data?.error || "Profile update failed",
                details: error.response?.data?.details || [],
                code: error.response?.data?.code || "PROFILE_UPDATE_ERROR",
            };
        }
    },

    /**
     * Refresh access token
     * UPDATED: Now handles email verification during refresh
     */
    refreshToken: async () => {
        try {
            const refreshToken = tokenManager.getRefreshToken();
            if (!refreshToken) {
                throw new Error("No refresh token available");
            }

            const response = await axios.post(
                `${
                    process.env.REACT_APP_API_URL || "http://localhost:3000/api"
                }/auth/refresh`,
                { refreshToken }
            );

            const {
                accessToken,
                refreshToken: newRefreshToken,
                user,
            } = response.data;

            // Store new tokens
            tokenManager.setTokens(
                accessToken,
                newRefreshToken,
                tokenManager.shouldRemember()
            );

            // Update user data if provided
            if (user) {
                tokenManager.setUserData(user);
            }

            return { accessToken, refreshToken: newRefreshToken, user };
        } catch (error) {
            // Handle email verification errors during refresh
            if (
                error.response?.status === 403 &&
                error.response?.data?.code === "EMAIL_NOT_VERIFIED"
            ) {
                tokenManager.clearTokens();
                throw {
                    message: "Email verification required",
                    code: "EMAIL_NOT_VERIFIED",
                    requiresVerification: true,
                };
            }

            tokenManager.clearTokens();
            throw {
                message: "Session expired. Please login again.",
                code: "REFRESH_TOKEN_EXPIRED",
            };
        }
    },

    /**
     * Check if user is currently authenticated
     * UPDATED: Now checks email verification status too
     */
    isAuthenticated: () => {
        const token = tokenManager.getAccessToken();
        const userData = tokenManager.getUserData();

        // NEW: Only consider authenticated if user has token, data, AND is email verified
        return !!(token && userData && userData.isEmailVerified);
    },

    /**
     * NEW: Check if user has tokens but needs email verification
     */
    hasTokensButUnverified: () => {
        const token = tokenManager.getAccessToken();
        const userData = tokenManager.getUserData();

        return !!(token && userData && !userData.isEmailVerified);
    },

    /**
     * Get current user data from storage (without API call)
     */
    getCurrentUserFromStorage: () => {
        return tokenManager.getUserData();
    },

    /**
     * Clear user session (for forced logout)
     */
    clearSession: () => {
        tokenManager.clearTokens();
    },

    /**
     * NEW: Handle successful email verification
     * Called when user completes email verification
     */
    handleEmailVerification: (user, tokens) => {
        const rememberMe = tokenManager.shouldRemember();

        // Store new tokens and updated user data
        if (tokens && tokens.accessToken && tokens.refreshToken) {
            tokenManager.setTokens(
                tokens.accessToken,
                tokens.refreshToken,
                rememberMe
            );
        }

        tokenManager.setUserData(user);

        return {
            success: true,
            user,
            message: "Email verified successfully",
        };
    },

    /**
     * NEW: Get user's email for verification purposes
     */
    getUserEmail: () => {
        const userData = tokenManager.getUserData();
        return userData?.email || null;
    },

    /**
     * NEW: Check if user needs email verification
     */
    needsEmailVerification: () => {
        const userData = tokenManager.getUserData();
        return userData && !userData.isEmailVerified;
    },

    /**
     * NEW: Request password reset
     * Phase 4B: Frontend password reset functionality
     */
    requestPasswordReset: async (email) => {
        try {
            const response = await userAPI.post("/auth/forgot-password", { email });
            
            return {
                success: true,
                message: response.data.message,
                email: response.data.email
            };
        } catch (error) {
            // Handle rate limiting
            if (error.response?.status === 429) {
                throw {
                    message: error.response.data.error,
                    code: "RATE_LIMIT_EXCEEDED",
                    retryAfter: error.response.data.retryAfter
                };
            }
            
            throw {
                message: error.response?.data?.error || "Failed to send password reset email",
                code: error.response?.data?.code || "PASSWORD_RESET_ERROR",
            };
        }
    },

    /**
     * NEW: Reset password using token
     * Phase 4B: Complete password reset process
     */
    resetPassword: async (token, newPassword, confirmPassword) => {
        try {
            const response = await userAPI.post(`/auth/reset-password/${token}`, {
                newPassword,
                confirmPassword
            });
            
            return {
                success: true,
                message: response.data.message,
                email: response.data.email
            };
        } catch (error) {
            // Handle various reset errors
            if (error.response?.status === 400) {
                const errorCode = error.response.data.code;
                
                if (errorCode === "INVALID_RESET_TOKEN" || errorCode === "EXPIRED_RESET_TOKEN") {
                    throw {
                        message: error.response.data.error,
                        code: errorCode,
                        expired: true
                    };
                }
                
                if (errorCode === "VALIDATION_ERROR") {
                    throw {
                        message: error.response.data.error,
                        details: error.response.data.details || [],
                        code: errorCode
                    };
                }
            }
            
            throw {
                message: error.response?.data?.error || "Failed to reset password",
                code: error.response?.data?.code || "PASSWORD_RESET_ERROR",
            };
        }
    },

    /**
     * NEW: Change email address
     * Initiates email change with verification
     */
    changeEmail: async (newEmail) => {
        try {
            const response = await userAPI.post("/auth/change-email", { newEmail });
            
            return {
                success: true,
                message: response.data.message,
                newEmail: response.data.newEmail
            };
        } catch (error) {
            // Handle specific email change errors
            if (error.response?.status === 400) {
                const errorCode = error.response.data.code;
                
                if (errorCode === "SAME_EMAIL") {
                    throw {
                        message: "New email address is the same as your current email",
                        code: errorCode
                    };
                } else if (errorCode === "PENDING_EMAIL_CHANGE_EXISTS") {
                    throw {
                        message: error.response.data.error,
                        code: errorCode,
                        pendingEmail: error.response.data.pendingEmail
                    };
                }
            } else if (error.response?.status === 409) {
                throw {
                    message: "This email address is already associated with another account",
                    code: "EMAIL_ALREADY_EXISTS"
                };
            } else if (error.response?.status === 429) {
                throw {
                    message: error.response.data.error,
                    code: "RATE_LIMIT_EXCEEDED",
                    retryAfter: error.response.data.retryAfter
                };
            }

            throw {
                message: error.response?.data?.error || "Failed to initiate email change",
                code: error.response?.data?.code || "EMAIL_CHANGE_ERROR",
                details: error.response?.data?.details || []
            };
        }
    },

    /**
     * NEW: Change user password
     * Changes password with current password verification
     */
    changePassword: async (passwordData) => {
        try {
            const response = await userAPI.post("/auth/change-password", passwordData);
            
            return {
                success: true,
                message: response.data.message
            };
        } catch (error) {
            // Handle specific password change errors
            if (error.response?.status === 400) {
                const errorCode = error.response.data.code;
                
                if (errorCode === "PASSWORD_MISMATCH") {
                    throw {
                        message: "New password and confirmation do not match",
                        code: errorCode,
                        field: "confirmPassword"
                    };
                } else if (errorCode === "PASSWORD_TOO_SHORT") {
                    throw {
                        message: "Password must be at least 8 characters long",
                        code: errorCode,
                        field: "newPassword"
                    };
                } else if (errorCode === "PASSWORD_TOO_WEAK") {
                    throw {
                        message: "Password must contain uppercase, lowercase and number",
                        code: errorCode,
                        field: "newPassword"
                    };
                } else if (errorCode === "SAME_PASSWORD") {
                    throw {
                        message: "New password must be different from current password",
                        code: errorCode,
                        field: "newPassword"
                    };
                }
            } else if (error.response?.status === 401) {
                throw {
                    message: "Current password is incorrect",
                    code: "INVALID_CURRENT_PASSWORD",
                    field: "currentPassword"
                };
            }

            throw {
                message: error.response?.data?.error || "Failed to change password",
                code: error.response?.data?.code || "PASSWORD_CHANGE_ERROR"
            };
        }
    },

    /**
     * NEW: Delete user account
     * Permanently deletes the user account and all associated data
     */
    deleteAccount: async (confirmationText = "DELETE") => {
        try {
            const response = await userAPI.delete("/auth/account", {
                data: { confirmationText }
            });
            
            // Clear tokens after successful deletion
            tokenManager.clearTokens();
            
            return {
                success: true,
                message: response.data.message
            };
        } catch (error) {
            if (error.response?.status === 400) {
                throw {
                    message: "Account deletion requires typing 'DELETE' as confirmation",
                    code: "INVALID_CONFIRMATION"
                };
            }

            throw {
                message: error.response?.data?.error || "Failed to delete account",
                code: error.response?.data?.code || "DELETE_ACCOUNT_ERROR"
            };
        }
    },

    /**
     * NEW: Validate email format
     */
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email?.trim());
    },

    /**
     * Token management utilities (exported for context use)
     */
    tokenManager,

    // NEW: Export token management functions for external use
    setTokens: tokenManager.setTokens,
    setUserData: tokenManager.setUserData,
    clearTokens: tokenManager.clearTokens,
};

export default userAuthService;
