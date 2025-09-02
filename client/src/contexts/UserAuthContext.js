// client/src/contexts/UserAuthContext.js
import React, { createContext, useContext, useReducer, useEffect } from "react";
import userAuthService from "../services/userAuthService";

/**
 * User Authentication Context
 *
 * Provides global user authentication state management for the entire app.
 * Separate from admin authentication for clean code organization.
 *
 * Features:
 * - Global user state management
 * - Automatic token refresh
 * - Persistent authentication across browser sessions
 * - Loading states for better UX
 * - Error handling
 *
 * UPDATED: Now includes email verification workflow
 */

// Initial authentication state
const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true, // Start with loading to check stored tokens
    error: null,
};

// Action types for state management
const AUTH_ACTIONS = {
    SET_LOADING: "SET_LOADING",
    LOGIN_SUCCESS: "LOGIN_SUCCESS",
    LOGOUT: "LOGOUT",
    UPDATE_USER: "UPDATE_USER",
    SET_ERROR: "SET_ERROR",
    CLEAR_ERROR: "CLEAR_ERROR",
    // NEW: Registration success without immediate login
    REGISTRATION_SUCCESS: "REGISTRATION_SUCCESS",
};

// Reducer function to handle state updates
const authReducer = (state, action) => {
    switch (action.type) {
        case AUTH_ACTIONS.SET_LOADING:
            return {
                ...state,
                isLoading: action.payload,
                error: null,
            };

        case AUTH_ACTIONS.LOGIN_SUCCESS:
            return {
                ...state,
                user: action.payload,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            };

        case AUTH_ACTIONS.LOGOUT:
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            };

        case AUTH_ACTIONS.UPDATE_USER:
            return {
                ...state,
                user: action.payload,
                error: null,
            };

        case AUTH_ACTIONS.SET_ERROR:
            return {
                ...state,
                error: action.payload,
                isLoading: false,
            };

        case AUTH_ACTIONS.CLEAR_ERROR:
            return {
                ...state,
                error: null,
            };

        // NEW: Handle successful registration without login
        case AUTH_ACTIONS.REGISTRATION_SUCCESS:
            return {
                ...state,
                user: null, // No user login until email verified
                isAuthenticated: false,
                isLoading: false,
                error: null,
            };

        default:
            return state;
    }
};

// Create the context
const UserAuthContext = createContext();

/**
 * Custom hook to use the authentication context
 * This provides a clean way to access auth state and functions
 */
export const useUserAuth = () => {
    const context = useContext(UserAuthContext);
    if (!context) {
        throw new Error("useUserAuth must be used within a UserAuthProvider");
    }
    return context;
};

/**
 * Authentication Provider Component
 * Wraps the app to provide global authentication state
 */
export const UserAuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    /**
     * Initialize authentication state on app startup
     * UPDATED: Now checks for email verification
     */
    useEffect(() => {
        const initializeAuth = async () => {
            dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

            try {
                // Check if user is already authenticated from storage
                if (userAuthService.isAuthenticated()) {
                    // Get cached user data first for immediate UI update
                    const cachedUser =
                        userAuthService.getCurrentUserFromStorage();

                    // NEW: Only consider authenticated if email is verified
                    if (cachedUser && cachedUser.isEmailVerified) {
                        dispatch({
                            type: AUTH_ACTIONS.LOGIN_SUCCESS,
                            payload: cachedUser,
                        });

                        // Then fetch fresh user data in the background
                        try {
                            const freshUser =
                                await userAuthService.getCurrentUser();

                            // Double-check verification status with fresh data
                            if (freshUser.isEmailVerified) {
                                dispatch({
                                    type: AUTH_ACTIONS.UPDATE_USER,
                                    payload: freshUser,
                                });
                            } else {
                                // User became unverified somehow, log them out
                                userAuthService.clearSession();
                                dispatch({ type: AUTH_ACTIONS.LOGOUT });
                            }
                        } catch (error) {
                            // If fetching fresh data fails, handle based on error type
                            if (error.code === "EMAIL_NOT_VERIFIED") {
                                // User needs to verify email
                                userAuthService.clearSession();
                                dispatch({ type: AUTH_ACTIONS.LOGOUT });
                            } else {
                                // Network error - keep cached data but log the error
                                console.warn(
                                    "Failed to fetch fresh user data:",
                                    error.message
                                );
                            }
                        }
                    } else {
                        // User not verified or no cached user - clear any invalid tokens
                        userAuthService.clearSession();
                        dispatch({
                            type: AUTH_ACTIONS.SET_LOADING,
                            payload: false,
                        });
                    }
                } else {
                    // No stored authentication
                    dispatch({
                        type: AUTH_ACTIONS.SET_LOADING,
                        payload: false,
                    });
                }
            } catch (error) {
                // If authentication check fails, clear any invalid tokens
                console.error("Authentication initialization failed:", error);
                userAuthService.clearSession();
                dispatch({ type: AUTH_ACTIONS.LOGOUT });
            }
        };

        initializeAuth();
    }, []);

    /**
     * Listen for token expiration events
     * Automatically logs out user when tokens expire
     */
    useEffect(() => {
        const handleTokenExpired = () => {
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
        };

        window.addEventListener("auth:token-expired", handleTokenExpired);
        return () =>
            window.removeEventListener(
                "auth:token-expired",
                handleTokenExpired
            );
    }, []);

    /**
     * User registration function
     * UPDATED: Now handles email verification requirement
     */
    const register = async (userData) => {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
        dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

        try {
            const result = await userAuthService.register(userData);

            // NEW: Check if registration requires email verification
            if (result.requiresVerification) {
                // Registration successful but requires email verification
                dispatch({ type: AUTH_ACTIONS.REGISTRATION_SUCCESS });
                return {
                    ...result,
                    requiresVerification: true,
                    registrationComplete: true,
                };
            } else {
                // Legacy path: immediate login (shouldn't happen with new backend)
                dispatch({
                    type: AUTH_ACTIONS.LOGIN_SUCCESS,
                    payload: result.user,
                });
                return result;
            }
        } catch (error) {
            dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
            throw error;
        }
    };

    /**
     * User login function
     * UPDATED: Now handles email verification requirement
     */
    const login = async (credentials, rememberMe = true) => {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
        dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

        try {
            const result = await userAuthService.login(credentials, rememberMe);

            // NEW: Check if login requires email verification
            if (result.requiresVerification) {
                // Credentials valid but email not verified
                dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
                return {
                    ...result,
                    requiresVerification: true,
                    credentialsValid: true,
                };
            } else {
                // Normal login flow
                dispatch({
                    type: AUTH_ACTIONS.LOGIN_SUCCESS,
                    payload: result.user,
                });
                return result;
            }
        } catch (error) {
            dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
            throw error;
        }
    };

    /**
     * NEW: Handle successful email verification
     * Called when user successfully verifies their email
     */
    const handleEmailVerified = (user, tokens) => {
        // Store tokens if provided (from email verification)
        if (tokens && tokens.accessToken && tokens.refreshToken) {
            const rememberMe =
                localStorage.getItem("telo_remember_me") !== "false";
            userAuthService.setTokens(
                tokens.accessToken,
                tokens.refreshToken,
                rememberMe
            );
            userAuthService.setUserData(user);
        }

        dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: user,
        });
    };

    /**
     * User logout function
     */
    const logout = async () => {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

        try {
            await userAuthService.logout();
        } catch (error) {
            // Even if logout API call fails, clear local state
            console.warn("Logout API call failed:", error.message);
        } finally {
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
    };

    /**
     * Update user profile function
     */
    const updateProfile = async (profileData) => {
        dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

        try {
            const result = await userAuthService.updateProfile(profileData);
            dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: result.user });
            return result;
        } catch (error) {
            dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
            throw error;
        }
    };

    /**
     * Refresh user data function
     * Useful after external changes that might affect user data
     */
    const refreshUser = async () => {
        if (!state.isAuthenticated) return;

        try {
            const freshUser = await userAuthService.getCurrentUser();

            // NEW: Check if user is still verified
            if (freshUser.isEmailVerified) {
                dispatch({
                    type: AUTH_ACTIONS.UPDATE_USER,
                    payload: freshUser,
                });
                return freshUser;
            } else {
                // User became unverified, log them out
                userAuthService.clearSession();
                dispatch({ type: AUTH_ACTIONS.LOGOUT });
                return null;
            }
        } catch (error) {
            console.error("Failed to refresh user data:", error);

            // Handle email verification errors
            if (error.code === "EMAIL_NOT_VERIFIED") {
                userAuthService.clearSession();
                dispatch({ type: AUTH_ACTIONS.LOGOUT });
            }
            // Don't throw error here as this is often called in background
        }
    };

    /**
     * Clear error function
     * Useful for dismissing error messages
     */
    const clearError = () => {
        dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    };

    /**
     * Check if user has specific verification status
     * UPDATED: More robust email verification check
     */
    const isEmailVerified = () => {
        return state.user?.isEmailVerified === true;
    };

    /**
     * NEW: Check if user is authenticated AND email verified
     * This is the main authentication check for protected routes
     */
    const isFullyAuthenticated = () => {
        return state.isAuthenticated && isEmailVerified();
    };

    /**
     * Get user's favorites count
     * Useful for UI badges and counters
     */
    const getFavoritesCount = () => {
        return state.user?.favoritesCount || 0;
    };

    /**
     * NEW: Get user's email for verification purposes
     */
    const getUserEmail = () => {
        return state.user?.email || null;
    };

    // Context value object
    const value = {
        // State
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        error: state.error,

        // Actions
        register,
        login,
        logout,
        updateProfile,
        refreshUser,
        clearError,
        handleEmailVerified, // NEW

        // Utility functions
        isEmailVerified,
        isFullyAuthenticated, // NEW
        getFavoritesCount,
        getUserEmail, // NEW
    };

    return (
        <UserAuthContext.Provider value={value}>
            {children}
        </UserAuthContext.Provider>
    );
};

export default UserAuthContext;
