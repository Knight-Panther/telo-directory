// client/src/components/admin/RecentActivity.js
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import adminService from "../../services/adminService";
import LoadingSpinner from "../common/LoadingSpinner";

const RecentActivity = () => {
    const { data: recentBusinesses, isLoading } = useQuery({
        queryKey: ["recent-businesses"],
        queryFn: adminService.getRecentBusinesses,
        refetchInterval: 60000, // Refresh every minute
    });

    if (isLoading) return <LoadingSpinner />;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="recent-activity">
            <h3>Recent Businesses</h3>
            {recentBusinesses?.length === 0 ? (
                <p>No businesses added yet.</p>
            ) : (
                <div className="activity-list">
                    {recentBusinesses?.map((business) => (
                        <div key={business._id} className="activity-item">
                            <div className="activity-info">
                                <strong>{business.businessName}</strong>
                                <div className="activity-meta">
                                    <span className="category">
                                        {business.category}
                                    </span>
                                    <span className="city">
                                        {business.city}
                                    </span>
                                    {business.verified && (
                                        <span className="verified-tag">✓</span>
                                    )}
                                </div>
                            </div>
                            <div className="activity-date">
                                {formatDate(business.createdAt)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Link to="/admin/businesses" className="view-all-link">
                View All Businesses →
            </Link>
        </div>
    );
};

export default RecentActivity;
