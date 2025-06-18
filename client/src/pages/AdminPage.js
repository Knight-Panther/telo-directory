// client/src/pages/AdminPage.js
import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import authService from "../services/authService";
import AdminLogin from "../components/admin/AdminLogin";
import AdminDashboard from "../components/admin/AdminDashboard";

const AdminPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsAuthenticated(authService.isAuthenticated());
        setIsLoading(false);
    }, []);

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <Routes>
            <Route path="/*" element={<AdminDashboard />} />
        </Routes>
    );
};

export default AdminPage;
