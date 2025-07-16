// client/src/pages/AdminPage.js - Enhanced with logout detection
import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import authService from "../services/authService";
import AdminLogin from "../components/admin/AdminLogin";
import AdminDashboard from "../components/admin/AdminDashboard";

const AdminPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();

    // Check authentication on component mount AND location changes
    useEffect(() => {
        const checkAuth = () => {
            const authStatus = authService.isAuthenticated();
            setIsAuthenticated(authStatus);
            setIsLoading(false);
        };

        checkAuth();
    }, [location]); // Re-run when location changes (including after logout navigation)

    // Also check authentication when the component becomes visible (tab focus)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                const authStatus = authService.isAuthenticated();
                setIsAuthenticated(authStatus);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () =>
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
    }, []);

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "50vh",
                }}
            >
                <div>Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <Routes>
            <Route
                path="/*"
                element={<AdminDashboard onLogout={handleLogout} />}
            />
        </Routes>
    );
};

export default AdminPage;
