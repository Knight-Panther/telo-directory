// client/src/components/admin/AdminDashboard.js - Enhanced logout
import React, { useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import DashboardStats from "./DashboardStats";
import DashboardCharts from "./DashboardCharts";
import RecentActivity from "./RecentActivity";
import SystemStatus from "./SystemStatus";
import ManageBusinesses from "./ManageBusinesses";
import BusinessForm from "./BusinessForm";
import CategoryManager from "./CategoryManager";
import ReportsManagement from "./ReportsManagement"; // NEW: Import reports component
import UserManagement from "./UserManagement"; // NEW: Import user management component
import SubmissionsManager from "./SubmissionsManager"; // NEW: Import submissions component
import "../../styles/admin.css";

const AdminDashboard = ({ onLogout }) => {
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);

            // Clear authentication
            authService.logout();

            // Show immediate feedback
            // alert("Logged out successfully!");

            // Call parent logout handler to update state
            if (onLogout) {
                onLogout();
            }

            // Navigate to admin login
            navigate("/admin", { replace: true });

            // Optional: Force page reload to ensure clean state
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (error) {
            alert("Error during logout");
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <div className="container">
                    <h1>Admin Dashboard</h1>
                    <button
                        onClick={handleLogout}
                        className={`logout-btn ${
                            isLoggingOut ? "logging-out" : ""
                        }`}
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? "Logging out..." : "Logout"}
                    </button>
                </div>
            </div>

            <div className="admin-content">
                <div className="container">
                    <nav className="admin-nav">
                        <Link to="/admin/" className="admin-nav-link">
                            Dashboard
                        </Link>
                        <Link to="/admin/businesses" className="admin-nav-link">
                            Manage Businesses
                        </Link>
                        <Link
                            to="/admin/businesses/new"
                            className="admin-nav-link"
                        >
                            Add Business
                        </Link>
                        <Link to="/admin/categories" className="admin-nav-link">
                            Categories
                        </Link>
                        <Link to="/admin/submissions" className="admin-nav-link">
                            Submissions
                        </Link>
                        <Link to="/admin/reports" className="admin-nav-link">
                            Reports
                        </Link>
                        <Link to="/admin/users" className="admin-nav-link">
                            User Management
                        </Link>
                    </nav>

                    <div className="admin-main">
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <div className="dashboard-overview">
                                        <DashboardStats />
                                        <div className="dashboard-grid">
                                            <div className="dashboard-left">
                                                <DashboardCharts />
                                            </div>
                                            <div className="dashboard-right">
                                                <RecentActivity />
                                                <SystemStatus />
                                            </div>
                                        </div>
                                    </div>
                                }
                            />
                            <Route
                                path="/businesses"
                                element={<ManageBusinesses />}
                            />
                            <Route
                                path="/businesses/new"
                                element={<BusinessForm />}
                            />
                            <Route
                                path="/businesses/edit/:id"
                                element={<BusinessForm />}
                            />
                            <Route
                                path="/categories"
                                element={<CategoryManager />}
                            />
                            <Route
                                path="/submissions"
                                element={<SubmissionsManager />}
                            />
                            <Route
                                path="/reports"
                                element={<ReportsManagement />}
                            />
                            <Route
                                path="/users"
                                element={<UserManagement />}
                            />
                        </Routes>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
