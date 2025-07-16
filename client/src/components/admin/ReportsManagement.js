// client/src/components/admin/ReportsManagement.js
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import adminService from "../../services/adminService";
import LoadingSpinner from "../common/LoadingSpinner";
import "../../styles/admin.css";

/**
 * ReportsManagement Component
 *
 * This component follows your exact patterns from ManageBusinesses.js:
 * - URL-based pagination with searchParams
 * - Real-time search with separate input and query states
 * - React Query for data fetching and caching
 * - Consistent table layout and styling
 * - Status updates with optimistic UI
 * - Proper error handling and loading states
 */
const ReportsManagement = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [issueTypeFilter, setIssueTypeFilter] = useState("");

    const page = parseInt(searchParams.get("page")) || 1;
    const queryClient = useQueryClient();

    // Fetch reports with current filters
    const { data, isLoading, isError } = useQuery({
        queryKey: [
            "admin-reports",
            page,
            searchQuery,
            statusFilter,
            issueTypeFilter,
        ],
        queryFn: () =>
            adminService.getReports({
                page,
                search: searchQuery,
                status: statusFilter,
                issueType: issueTypeFilter,
                limit: 15,
            }),
    });

    // Update report status mutation
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, adminNotes }) =>
            adminService.updateReportStatus(id, { status, adminNotes }),
        onSuccess: () => {
            queryClient.invalidateQueries(["admin-reports"]);
        },
        onError: (error) => {
            alert(
                `Error updating report: ${
                    error.response?.data?.error || error.message
                }`
            );
        },
    });

    // Delete report mutation
    const deleteMutation = useMutation({
        mutationFn: adminService.deleteReport,
        onSuccess: () => {
            queryClient.invalidateQueries(["admin-reports"]);
            alert("Report deleted successfully");
        },
        onError: (error) => {
            alert(
                `Error deleting report: ${
                    error.response?.data?.error || error.message
                }`
            );
        },
    });

    // Pagination handler (following your URL-based pattern)
    const setPage = (newPage) => {
        setSearchParams({ page: newPage.toString() });
    };

    // Search handler (following your debounced search pattern)
    const handleSearch = () => {
        setSearchQuery(searchInput);
        setPage(1); // Reset to first page on new search
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchInput("");
        setSearchQuery("");
        setStatusFilter("");
        setIssueTypeFilter("");
        setPage(1);
    };

    // Handle status update
    const handleStatusUpdate = async (reportId, newStatus) => {
        const adminNotes = prompt(
            `${
                newStatus === "resolved" ? "Resolve" : "Dismiss"
            } this report?\n\nOptional admin notes:`
        );

        if (adminNotes !== null) {
            // User didn't cancel
            updateStatusMutation.mutate({
                id: reportId,
                status: newStatus,
                adminNotes: adminNotes.trim(),
            });
        }
    };

    // Handle delete
    const handleDelete = (reportId, businessName) => {
        if (
            window.confirm(
                `Permanently delete this report for "${businessName}"?\n\nThis action cannot be undone.`
            )
        ) {
            deleteMutation.mutate(reportId);
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Get status badge class
    const getStatusClass = (status) => {
        switch (status) {
            case "resolved":
                return "status-resolved";
            case "dismissed":
                return "status-dismissed";
            case "pending":
                return "status-pending";
            default:
                return "";
        }
    };

    if (isLoading) return <LoadingSpinner size="large" />;

    if (isError) {
        return (
            <div className="error-state">
                <h3>Error Loading Reports</h3>
                <p>Unable to fetch reports. Please try again later.</p>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    const { reports = [], pagination } = data || {};

    return (
        <div className="reports-management">
            <div className="manage-header">
                <h2>Reports Management</h2>
                <div className="reports-summary">
                    <span>Total: {pagination?.totalReports || 0} reports</span>
                </div>
            </div>

            {/* Filters Section */}
            <div className="filters-section">
                <div className="search-filter">
                    <input
                        type="text"
                        placeholder="Search reports, business names..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <button onClick={handleSearch} className="btn btn-primary">
                        Search
                    </button>
                </div>

                <div className="dropdown-filters">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                    </select>

                    <select
                        value={issueTypeFilter}
                        onChange={(e) => setIssueTypeFilter(e.target.value)}
                    >
                        <option value="">All Issue Types</option>
                        <option value="Broken Image">Broken Image</option>
                        <option value="Business No Longer Exists">
                            Business No Longer Exists
                        </option>
                        <option value="Other Issue">Other Issue</option>
                    </select>

                    <button
                        onClick={clearFilters}
                        className="btn btn-secondary"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Reports Table */}
            <div className="table-container">
                {reports.length === 0 ? (
                    <div className="no-results">
                        <h3>No Reports Found</h3>
                        <p>
                            {searchQuery || statusFilter || issueTypeFilter
                                ? "Try adjusting your filters or search terms."
                                : "No reports have been submitted yet."}
                        </p>
                    </div>
                ) : (
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Business</th>
                                <th>Issue Types</th>
                                <th>Status</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) => (
                                <tr key={report._id}>
                                    <td>
                                        <div className="report-date">
                                            {formatDate(report.createdAt)}
                                        </div>
                                        <div className="report-ip">
                                            IP: {report.reporterIp}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="business-info">
                                            <div className="business-name">
                                                {report.businessId
                                                    ?.businessName ||
                                                    "Unknown Business"}
                                            </div>
                                            <div className="business-details">
                                                {report.businessId?.category} •{" "}
                                                {report.businessId?.city}
                                            </div>
                                            <div className="business-id">
                                                ID:{" "}
                                                {report.businessId?.businessId}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="issue-types">
                                            {report.issueTypes.map(
                                                (type, index) => (
                                                    <span
                                                        key={index}
                                                        className="issue-tag"
                                                    >
                                                        {type}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            className={`status ${getStatusClass(
                                                report.status
                                            )}`}
                                        >
                                            {report.status
                                                .charAt(0)
                                                .toUpperCase() +
                                                report.status.slice(1)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="description-cell">
                                            {report.description ? (
                                                <div className="description-text">
                                                    "{report.description}"
                                                </div>
                                            ) : (
                                                <em className="no-description">
                                                    No description
                                                </em>
                                            )}
                                            {report.adminNotes && (
                                                <div className="admin-notes">
                                                    <strong>
                                                        Admin Notes:
                                                    </strong>{" "}
                                                    {report.adminNotes}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {report.status === "pending" && (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            handleStatusUpdate(
                                                                report._id,
                                                                "resolved"
                                                            )
                                                        }
                                                        className="btn btn-success btn-sm"
                                                        disabled={
                                                            updateStatusMutation.isPending
                                                        }
                                                    >
                                                        Resolve
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleStatusUpdate(
                                                                report._id,
                                                                "dismissed"
                                                            )
                                                        }
                                                        className="btn btn-warning btn-sm"
                                                        disabled={
                                                            updateStatusMutation.isPending
                                                        }
                                                    >
                                                        Dismiss
                                                    </button>
                                                </>
                                            )}

                                            {report.status !== "pending" && (
                                                <button
                                                    onClick={() =>
                                                        handleStatusUpdate(
                                                            report._id,
                                                            "pending"
                                                        )
                                                    }
                                                    className="btn btn-info btn-sm"
                                                    disabled={
                                                        updateStatusMutation.isPending
                                                    }
                                                >
                                                    Reopen
                                                </button>
                                            )}

                                            <button
                                                onClick={() =>
                                                    handleDelete(
                                                        report._id,
                                                        report.businessId
                                                            ?.businessName ||
                                                            "Unknown"
                                                    )
                                                }
                                                className="btn btn-danger btn-sm"
                                                disabled={
                                                    deleteMutation.isPending
                                                }
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="pagination">
                    <button
                        onClick={() => setPage(page - 1)}
                        disabled={!pagination.hasPrev}
                        className="btn btn-secondary"
                    >
                        Previous
                    </button>

                    <div className="page-info">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </div>

                    <button
                        onClick={() => setPage(page + 1)}
                        disabled={!pagination.hasNext}
                        className="btn btn-secondary"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReportsManagement;
