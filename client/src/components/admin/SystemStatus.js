// client/src/components/admin/SystemStatus.js
import React from "react";
import { useQuery } from "@tanstack/react-query";
import adminService from "../../services/adminService";
import LoadingSpinner from "../common/LoadingSpinner";

const SystemStatus = () => {
    const { data: systemData, isLoading } = useQuery({
        queryKey: ["system-status"],
        queryFn: adminService.getSystemStatus,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    if (isLoading) return <LoadingSpinner />;

    const formatUptime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="system-status">
            <h3>System Status</h3>

            <div className="status-grid">
                <div className="status-item">
                    <div className="status-header">
                        <span className="status-label">Database</span>
                        <span
                            className={`status-indicator ${
                                systemData?.database?.connected
                                    ? "connected"
                                    : "disconnected"
                            }`}
                        >
                            {systemData?.database?.connected ? "●" : "●"}
                        </span>
                    </div>
                    <div className="status-value">
                        {systemData?.database?.status || "Unknown"}
                    </div>
                </div>

                <div className="status-item">
                    <div className="status-header">
                        <span className="status-label">Storage Used</span>
                    </div>
                    <div className="status-value">
                        {systemData?.storage?.usedMB || 0} MB
                    </div>
                    <div className="status-sub">
                        {systemData?.storage?.totalFiles || 0} files
                    </div>
                </div>

                <div className="status-item">
                    <div className="status-header">
                        <span className="status-label">System Uptime</span>
                    </div>
                    <div className="status-value">
                        {systemData?.system?.uptime
                            ? formatUptime(systemData.system.uptime)
                            : "0h 0m"}
                    </div>
                </div>

                <div className="status-item">
                    <div className="status-header">
                        <span className="status-label">Memory Usage</span>
                    </div>
                    <div className="status-value">
                        {systemData?.system?.memoryMB || 0} MB
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemStatus;
