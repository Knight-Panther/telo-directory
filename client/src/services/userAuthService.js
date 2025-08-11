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

    // Response interceptor - handle automatic token refresh
    userAPI.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

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
     */
    register: async (userData) => {
        try {
            const response = await userAPI.post("/auth/register", userData);

            const { user, accessToken, refreshToken } = response.data;

            // Store tokens and user data (default to remember me for registration)
            tokenManager.setTokens(accessToken, refreshToken, true);
            tokenManager.setUserData(user);

            return {
                success: true,
                user,
                message: response.data.message,
            };
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
     */
    login: async (credentials, rememberMe = true) => {
        try {
            const response = await userAPI.post("/auth/login", credentials);

            const { user, accessToken, refreshToken } = response.data;

            // Store tokens and user data with remember me preference
            tokenManager.setTokens(accessToken, refreshToken, rememberMe);
            tokenManager.setUserData(user);

            return {
                success: true,
                user,
                message: response.data.message,
            };
        } catch (error) {
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
     */
    getCurrentUser: async () => {
        try {
            const response = await userAPI.get("/auth/me");
            const user = response.data.user;

            // Update stored user data
            tokenManager.setUserData(user);

            return user;
        } catch (error) {
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
            tokenManager.clearTokens();
            throw {
                message: "Session expired. Please login again.",
                code: "REFRESH_TOKEN_EXPIRED",
            };
        }
    },

    /**
     * Check if user is currently authenticated
     */
    isAuthenticated: () => {
        const token = tokenManager.getAccessToken();
        const userData = tokenManager.getUserData();
        return !!(token && userData);
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
     * Token management utilities (exported for context use)
     */
    tokenManager,
};

export default userAuthService;
