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
 * - Return URL memory (user goes back where they wanted after login)
 * - Loading state management
 * - Conservative error handling (graceful degradation)
 * - Triggers login modal on home page redirect
 *
 * Usage: <ProtectedRoute><DashboardPage /></ProtectedRoute>
 */
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading, error } = useUserAuth();
    const location = useLocation();

    /**
     * Store the current location in sessionStorage for return URL functionality
     * This runs whenever someone tries to access a protected route
     */
    useEffect(() => {
        if (!isAuthenticated && !isLoading) {
            // Store where user wanted to go for post-login redirect
            sessionStorage.setItem(
                "returnUrl",
                location.pathname + location.search
            );
        }
    }, [isAuthenticated, isLoading, location]);

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

    // If user is not authenticated (or has auth errors), redirect to home with login trigger
    if (!isAuthenticated) {
        // Add query parameter to trigger login modal on home page
        // Your Header component can watch for this parameter
        return <Navigate to="/?showLogin=true" replace />;
    }

    // User is authenticated - render the protected component
    return children;
};

export default ProtectedRoute;
