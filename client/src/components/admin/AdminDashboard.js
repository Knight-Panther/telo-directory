// client/src/components/admin/AdminDashboard.js
import React from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import DashboardStats from "./DashboardStats";
import DashboardCharts from "./DashboardCharts";
import RecentActivity from "./RecentActivity";
import SystemStatus from "./SystemStatus";
import ManageBusinesses from "./ManageBusinesses";
import BusinessForm from "./BusinessForm";
import CategoryManager from "./CategoryManager";
import "../../styles/admin.css";

const AdminDashboard = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        authService.logout();
        navigate("/admin");
    };

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <div className="container">
                    <h1>Admin Dashboard</h1>
                    <button onClick={handleLogout} className="logout-btn">
                        Logout
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
                        </Routes>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
