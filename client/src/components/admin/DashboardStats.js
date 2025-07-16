// client/src/components/admin/DashboardStats.js
import React from "react";
import { useQuery } from "@tanstack/react-query";
import adminService from "../../services/adminService";
import LoadingSpinner from "../common/LoadingSpinner";

const DashboardStats = () => {
    const { data: stats, isLoading } = useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: adminService.getDashboardStats,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="dashboard-stats">
            <div className="stat-card">
                <h3>Total Businesses</h3>
                <div className="stat-number">{stats?.totalBusinesses || 0}</div>
            </div>

            <div className="stat-card">
                <h3>Verified</h3>
                <div className="stat-number verified">
                    {stats?.verifiedCount || 0}
                </div>
                <div className="stat-label">businesses</div>
            </div>

            <div className="stat-card">
                <h3>Unverified</h3>
                <div className="stat-number unverified">
                    {stats?.unverifiedCount || 0}
                </div>
                <div className="stat-label">businesses</div>
            </div>

            <div className="stat-card">
                <h3>Categories</h3>
                <div className="stat-number">{stats?.totalCategories || 0}</div>
                <div className="stat-label">total</div>
            </div>

            <div className="stat-card">
                <h3>New This Month</h3>
                <div className="stat-number new">
                    {stats?.newThisMonth || 0}
                </div>
                <div className="stat-label">businesses</div>
            </div>
        </div>
    );
};

export default DashboardStats;
