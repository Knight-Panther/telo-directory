// client/src/components/admin/UserManagement.js
import React, { useState, useEffect } from "react";
import adminService from "../../services/adminService";

const UserManagement = () => {
    const [userStats, setUserStats] = useState(null);
    const [pendingDeletions, setPendingDeletions] = useState([]);
    const [cleanupStatus, setCleanupStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRunningManualCleanup, setIsRunningManualCleanup] = useState(false);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const [statsResponse, pendingResponse, cleanupResponse] = await Promise.all([
                adminService.getUserStats(),
                adminService.getPendingDeletions(),
                adminService.getCleanupServiceStatus()
            ]);

            setUserStats(statsResponse);
            setPendingDeletions(pendingResponse.users || []);
            setCleanupStatus(cleanupResponse);
            setError(null);
        } catch (err) {
            console.error("Error fetching user data:", err);
            setError("Failed to load user management data");
        } finally {
            setLoading(false);
        }
    };

    const handleManualCleanup = async () => {
        try {
            setIsRunningManualCleanup(true);
            const response = await adminService.triggerManualCleanup();
            
            if (response.success) {
                alert(`Manual cleanup completed successfully!\n\nUsers processed: ${response.result.usersProcessed}\nUsers deleted: ${response.result.usersDeleted}\nDuration: ${response.result.totalDuration}ms`);
                
                // Refresh data
                await fetchUserData();
            }
        } catch (err) {
            console.error("Manual cleanup failed:", err);
            alert("Manual cleanup failed: " + (err.response?.data?.error || err.message));
        } finally {
            setIsRunningManualCleanup(false);
        }
    };

    useEffect(() => {
        fetchUserData();
        
        // Refresh data every 30 seconds
        const interval = setInterval(fetchUserData, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getDaysUntilDeletion = (scheduledFor) => {
        const days = Math.ceil((new Date(scheduledFor) - new Date()) / (1000 * 60 * 60 * 24));
        return Math.max(0, days);
    };

    const getPriorityClass = (remainingDays) => {
        if (remainingDays <= 1) return "priority-critical";
        if (remainingDays <= 2) return "priority-high";
        if (remainingDays <= 3) return "priority-medium";
        return "priority-low";
    };

    if (loading) {
        return <div className="loading-container">Loading user management data...</div>;
    }

    if (error) {
        return (
            <div className="error-container">
                <p>{error}</p>
                <button onClick={fetchUserData} className="btn-primary">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="user-management">
            <div className="user-management-header">
                <h2>User Management</h2>
                <button 
                    onClick={fetchUserData} 
                    className="btn-secondary"
                    disabled={loading}
                >
                    Refresh Data
                </button>
            </div>

            {/* User Statistics */}
            <div className="user-stats-grid">
                <div className="stat-card">
                    <h3>Total Users</h3>
                    <div className="stat-number">{userStats?.total || 0}</div>
                </div>
                <div className="stat-card">
                    <h3>Verified Users</h3>
                    <div className="stat-number">{userStats?.verified || 0}</div>
                    <div className="stat-detail">
                        {userStats?.verificationRate}% verification rate
                    </div>
                </div>
                <div className="stat-card">
                    <h3>Unverified Users</h3>
                    <div className="stat-number">{userStats?.unverified || 0}</div>
                </div>
                <div className="stat-card critical">
                    <h3>Pending Deletions</h3>
                    <div className="stat-number">{userStats?.pendingDeletions || 0}</div>
                </div>
            </div>

            {/* New User Stats */}
            <div className="new-users-section">
                <h3>New User Registrations</h3>
                <div className="new-users-grid">
                    <div className="new-user-stat">
                        <span className="label">Today:</span>
                        <span className="value">{userStats?.newUsers?.today || 0}</span>
                    </div>
                    <div className="new-user-stat">
                        <span className="label">This Week:</span>
                        <span className="value">{userStats?.newUsers?.thisWeek || 0}</span>
                    </div>
                    <div className="new-user-stat">
                        <span className="label">This Month:</span>
                        <span className="value">{userStats?.newUsers?.thisMonth || 0}</span>
                    </div>
                </div>
            </div>

            {/* Cleanup Service Status */}
            <div className="cleanup-service-section">
                <div className="section-header">
                    <h3>User Cleanup Service</h3>
                    <button 
                        onClick={handleManualCleanup}
                        className="btn-primary"
                        disabled={isRunningManualCleanup}
                    >
                        {isRunningManualCleanup ? "Running Cleanup..." : "Manual Cleanup"}
                    </button>
                </div>
                
                <div className="cleanup-status-grid">
                    <div className="status-item">
                        <span className="label">Status:</span>
                        <span className={`value status-${cleanupStatus?.service?.isRunning ? 'running' : 'idle'}`}>
                            {cleanupStatus?.service?.isRunning ? 'Running' : 'Idle'}
                        </span>
                    </div>
                    <div className="status-item">
                        <span className="label">Deletion Delay:</span>
                        <span className="value">{cleanupStatus?.service?.delayDays || 5} days</span>
                    </div>
                    <div className="status-item">
                        <span className="label">Last Run:</span>
                        <span className="value">
                            {cleanupStatus?.service?.lastRunAt ? 
                                formatDate(cleanupStatus?.service?.lastRunAt) : 
                                'Never'
                            }
                        </span>
                    </div>
                    <div className="status-item">
                        <span className="label">Total Runs:</span>
                        <span className="value">{cleanupStatus?.service?.runCount || 0}</span>
                    </div>
                </div>

                {cleanupStatus?.statistics && (
                    <div className="cleanup-statistics">
                        <h4>Cleanup Statistics</h4>
                        <div className="stats-row">
                            <span>Total Processed: {cleanupStatus.statistics.totalProcessed}</span>
                            <span>Total Deleted: {cleanupStatus.statistics.totalDeleted}</span>
                            <span>Total Errors: {cleanupStatus.statistics.totalErrors}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Pending Deletions */}
            <div className="pending-deletions-section">
                <h3>Pending Account Deletions</h3>
                
                {pendingDeletions.length === 0 ? (
                    <div className="no-pending-deletions">
                        <p>✅ No accounts scheduled for deletion</p>
                    </div>
                ) : (
                    <div className="pending-deletions-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Account Age</th>
                                    <th>Scheduled Date</th>
                                    <th>Days Remaining</th>
                                    <th>Priority</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingDeletions.map((user) => {
                                    const remainingDays = getDaysUntilDeletion(user.scheduledFor);
                                    return (
                                        <tr key={user.id} className={getPriorityClass(remainingDays)}>
                                            <td className="user-name">{user.name}</td>
                                            <td className="user-email">{user.email}</td>
                                            <td>{user.accountAge} days</td>
                                            <td>{formatDate(user.scheduledFor)}</td>
                                            <td className="days-remaining">
                                                <span className={`days-badge ${getPriorityClass(remainingDays)}`}>
                                                    {remainingDays} days
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`priority-badge ${getPriorityClass(remainingDays)}`}>
                                                    {remainingDays <= 1 ? 'Critical' : 
                                                     remainingDays <= 2 ? 'High' : 
                                                     remainingDays <= 3 ? 'Medium' : 'Low'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;