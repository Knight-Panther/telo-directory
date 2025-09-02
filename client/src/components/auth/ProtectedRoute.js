// client/src/components/auth/ProtectedRoute.js
import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserAuth } from "../../contexts/UserAuthContext";
import LoadingSpinner from "../common/LoadingSpinner";

/**
 * ProtectedRoute Component
 *
 * Provides route-level authentication protection for user pages.
 * Uses your existing UserAuthContext for authentication state.
 *
 * Features:
 * - Quick context-based authentication check (fast UX)
 * - Email verification requirement enforcement
 * - Return URL memory (user goes back where they wanted after verification)
 * - Loading state management
 * - Conservative error handling (graceful degradation)
 * - Smart redirection based on user state
 *
 * UPDATED: Now enforces email verification for protected routes
 *
 * Usage: <ProtectedRoute><DashboardPage /></ProtectedRoute>
 */
const ProtectedRoute = ({ children }) => {
    const {
        isAuthenticated,
        isLoading,
        error,
        user,
        isEmailVerified,
        getUserEmail,
    } = useUserAuth();
    const location = useLocation();

    /**
     * Store the current location in sessionStorage for return URL functionality
     * This runs whenever someone tries to access a protected route
     */
    useEffect(() => {
        if ((!isAuthenticated || !isEmailVerified()) && !isLoading) {
            // Store where user wanted to go for post-verification redirect
            sessionStorage.setItem(
                "returnUrl",
                location.pathname + location.search
            );
        }
    }, [isAuthenticated, isEmailVerified, isLoading, location]);

    // Show loading spinner while authentication is being determined
    if (isLoading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "50vh",
                    flexDirection: "column",
                }}
            >
                <LoadingSpinner />
                <p style={{ marginTop: "1rem", color: "#666" }}>
                    Checking authentication...
                </p>
            </div>
        );
    }

    // Conservative error handling: if there's an auth error, treat as not authenticated
    // This prevents blocking users due to network issues or temporary errors
    if (error) {
        console.warn("ProtectedRoute: Authentication error detected:", error);
        // Clear any bad stored data that might be causing issues
        sessionStorage.removeItem("returnUrl");
    }

    // NEW: Check authentication and email verification status
    const userEmail = getUserEmail() || user?.email;

    // If user is not authenticated at all, redirect to login
    if (!isAuthenticated && !user) {
        // Add query parameter to trigger login modal on home page
        return <Navigate to="/?showLogin=true" replace />;
    }

    // NEW: If user is authenticated but email is not verified, redirect to verification page
    if (user && !isEmailVerified()) {
        const verifyEmailUrl = userEmail
            ? `/verify-email?email=${encodeURIComponent(userEmail)}`
            : "/verify-email";

        return <Navigate to={verifyEmailUrl} replace />;
    }

    // NEW: If user has some auth state but isn't fully authenticated, handle appropriately
    if (!isAuthenticated) {
        // This handles edge cases where user exists but tokens are invalid
        return <Navigate to="/?showLogin=true" replace />;
    }

    // User is fully authenticated AND email verified - render the protected component
    return children;
};

export default ProtectedRoute;
