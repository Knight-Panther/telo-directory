// client/src/components/admin/SubmissionsManager.js
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminService from "../../services/adminService";
import styles from "../../styles/submissions-manager.module.css";

const SubmissionsManager = () => {
    const queryClient = useQueryClient();

    // State management
    const [selectedSubmissions, setSelectedSubmissions] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [duplicateInfo, setDuplicateInfo] = useState({});

    // Filter state
    const [filters, setFilters] = useState({
        status: 'all',
        category: 'all',
        search: '',
        dateFrom: '',
        dateTo: ''
    });

    // Pagination state
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 25,
        hasMore: false
    });

    // Fetch submissions with filters
    const {
        data: submissionsData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ["admin-submissions", currentPage, filters],
        queryFn: () => adminService.getSubmissions({
            page: currentPage,
            limit: 25,
            ...filters
        }),
        staleTime: 30000, // 30 seconds
        cacheTime: 5 * 60 * 1000, // 5 minutes
    });

    // Fetch categories for filtering
    const { data: categoriesData } = useQuery({
        queryKey: ["admin-categories"],
        queryFn: adminService.getCategories,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Fetch submission statistics
    const { data: statsData } = useQuery({
        queryKey: ["admin-submission-stats"],
        queryFn: adminService.getSubmissionStats,
        refetchInterval: 60000, // Refresh every minute
    });

    // Update submission status mutation
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, rejectionReason }) =>
            adminService.updateSubmissionStatus(id, status, rejectionReason),
        onSuccess: () => {
            queryClient.invalidateQueries(["admin-submissions"]);
            queryClient.invalidateQueries(["admin-submission-stats"]);
        },
        onError: (error) => {
            alert(`Error updating submission: ${error.response?.data?.error || error.message}`);
        },
    });

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: adminService.bulkDeleteSubmissions,
        onSuccess: (data) => {
            queryClient.invalidateQueries(["admin-submissions"]);
            queryClient.invalidateQueries(["admin-submission-stats"]);
            setSelectedSubmissions([]);
            alert(data.message);
        },
        onError: (error) => {
            alert(`Error deleting submissions: ${error.response?.data?.error || error.message}`);
        },
    });

    // Check duplicates mutation
    const checkDuplicatesMutation = useMutation({
        mutationFn: adminService.batchCheckDuplicates,
        onSuccess: (data) => {
            setDuplicateInfo(data.duplicateResults);
        },
        onError: (error) => {
            console.error('Error checking duplicates:', error);
        },
    });

    // Extract data from responses
    const submissions = submissionsData?.submissions || [];
    const categories = categoriesData || [];
    const stats = statsData?.stats || {};

    // Update pagination when data changes
    useEffect(() => {
        if (submissionsData?.pagination) {
            setPagination(submissionsData.pagination);
        }
    }, [submissionsData]);

    // Batch check duplicates when submissions change
    useEffect(() => {
        if (submissions.length > 0) {
            const submissionIds = submissions.map(sub => sub._id);
            checkDuplicatesMutation.mutate(submissionIds);
        }
    }, [submissions]);

    // Handle filter changes
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page
    };

    // Handle filter reset
    const handleFilterReset = () => {
        setFilters({
            status: 'all',
            category: 'all',
            search: '',
            dateFrom: '',
            dateTo: ''
        });
        setCurrentPage(1);
    };

    // Handle select all toggle
    const handleSelectAll = () => {
        if (selectedSubmissions.length === submissions.length) {
            setSelectedSubmissions([]);
        } else {
            setSelectedSubmissions(submissions.map(sub => sub._id));
        }
    };

    // Handle individual selection
    const handleSelectSubmission = (submissionId) => {
        setSelectedSubmissions(prev => {
            if (prev.includes(submissionId)) {
                return prev.filter(id => id !== submissionId);
            } else {
                return [...prev, submissionId];
            }
        });
    };

    // Handle status update
    const handleStatusUpdate = (submissionId, status) => {
        let rejectionReason = null;

        if (status === 'rejected') {
            rejectionReason = prompt('Please provide a reason for rejection:');
            if (!rejectionReason) return; // User cancelled
        }

        updateStatusMutation.mutate({
            id: submissionId,
            status,
            rejectionReason
        });
    };

    // Handle bulk status update
    const handleBulkStatusUpdate = (status) => {
        if (selectedSubmissions.length === 0) {
            alert('Please select submissions to update');
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to ${status} ${selectedSubmissions.length} submission(s)?`
        );

        if (!confirmed) return;

        // For simplicity, update each submission individually
        // In production, you might want a dedicated bulk update endpoint
        selectedSubmissions.forEach(submissionId => {
            handleStatusUpdate(submissionId, status);
        });

        setSelectedSubmissions([]);
    };

    // Handle bulk delete
    const handleBulkDelete = () => {
        if (selectedSubmissions.length === 0) {
            alert('Please select submissions to delete');
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to delete ${selectedSubmissions.length} submission(s)? This action cannot be undone.`
        );

        if (!confirmed) return;

        bulkDeleteMutation.mutate(selectedSubmissions);
    };

    // Handle pagination
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        setSelectedSubmissions([]); // Clear selections when changing page
    };

    // Format date for display
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return "Today";
        if (diffDays === 2) return "Yesterday";
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        return date.toLocaleDateString();
    };

    // Format categories for display
    const formatCategories = (categories) => {
        if (!categories || categories.length === 0) return null;
        return categories.slice(0, 2); // Show first 2 categories
    };

    // Format cities for display
    const formatCities = (cities) => {
        if (!cities || cities.length === 0) return null;
        return cities.slice(0, 2); // Show first 2 cities
    };

    // Get social link for business name
    const getBusinessLink = (submission) => {
        if (submission.socialLinks?.facebook) {
            return submission.socialLinks.facebook;
        }
        if (submission.socialLinks?.instagram) {
            return submission.socialLinks.instagram;
        }
        return null;
    };

    // Render duplicate indicator
    const renderDuplicateIndicator = (submission) => {
        const duplicates = duplicateInfo[submission._id];
        if (!duplicates?.hasDuplicates) return null;

        const tooltipText = `${duplicates.matchCount} duplicate(s) found: ${
            duplicates.matches.map(m => m.field).join(', ')
        }`;

        return (
            <div className={styles.duplicateIndicator}>
                <span className={`${styles.duplicateIcon} ${styles.hasDuplicates}`}>
                    🔄
                </span>
                <div className={styles.duplicateTooltip}>
                    {tooltipText}
                </div>
            </div>
        );
    };

    // Loading state
    if (isLoading) {
        return (
            <div className={styles.submissionsManager}>
                <div className={styles.loadingState}>
                    <div className={styles.loadingSpinner}>⏳</div>
                    <p>Loading submissions...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={styles.submissionsManager}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>❌</div>
                    <h3>Error Loading Submissions</h3>
                    <p>{error.message}</p>
                    <button
                        className={`${styles.filterBtn} ${styles.primary}`}
                        onClick={() => refetch()}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.submissionsManager}>
            {/* Header */}
            <div className={styles.submissionsHeader}>
                <h1>
                    📝 Submissions Management
                    {stats.total ? `(${stats.total})` : ''}
                </h1>
                <p>
                    Manage business submissions with duplicate detection and bulk operations
                    {stats.pending > 0 && ` • ${stats.pending} pending review`}
                </p>
            </div>

            {/* Filters */}
            <div className={styles.filtersContainer}>
                <div className={styles.filtersGrid}>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>Status</label>
                        <select
                            className={styles.filterSelect}
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>Category</label>
                        <select
                            className={styles.filterSelect}
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(category => (
                                <option key={category._id} value={category.name}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>Search</label>
                        <input
                            type="text"
                            className={styles.filterInput}
                            placeholder="Business name, email..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>Date From</label>
                        <input
                            type="date"
                            className={styles.filterInput}
                            value={filters.dateFrom}
                            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        />
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>Date To</label>
                        <input
                            type="date"
                            className={styles.filterInput}
                            value={filters.dateTo}
                            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.filtersActions}>
                    <button
                        className={`${styles.filterBtn} ${styles.primary}`}
                        onClick={() => refetch()}
                    >
                        🔍 Apply Filters
                    </button>
                    <button
                        className={styles.filterBtn}
                        onClick={handleFilterReset}
                    >
                        🔄 Reset
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            {submissions.length > 0 && (
                <div className={styles.bulkActions}>
                    <div className={styles.selectionControls}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={selectedSubmissions.length === submissions.length}
                                onChange={handleSelectAll}
                            />
                            Select All ({selectedSubmissions.length} selected)
                        </label>
                    </div>

                    {selectedSubmissions.length > 0 && (
                        <div className={styles.bulkActionsButtons}>
                            <button
                                className={`${styles.bulkBtn} ${styles.approve}`}
                                onClick={() => handleBulkStatusUpdate('approved')}
                                disabled={updateStatusMutation.isPending}
                            >
                                ✅ Approve Selected
                            </button>
                            <button
                                className={`${styles.bulkBtn} ${styles.reject}`}
                                onClick={() => handleBulkStatusUpdate('rejected')}
                                disabled={updateStatusMutation.isPending}
                            >
                                ❌ Reject Selected
                            </button>
                            <button
                                className={`${styles.bulkBtn} ${styles.delete}`}
                                onClick={handleBulkDelete}
                                disabled={bulkDeleteMutation.isPending}
                            >
                                🗑️ Delete Selected
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Submissions List */}
            {submissions.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📭</div>
                    <h3>No Submissions Found</h3>
                    <p>
                        {Object.values(filters).some(v => v && v !== 'all')
                            ? 'Try adjusting your filters to see more results.'
                            : 'No business submissions have been received yet.'
                        }
                    </p>
                </div>
            ) : (
                <div className={styles.submissionsList}>
                    {submissions.map((submission) => {
                        const businessLink = getBusinessLink(submission);
                        const isSelected = selectedSubmissions.includes(submission._id);

                        return (
                            <div
                                key={submission._id}
                                className={`${styles.submissionItem} ${isSelected ? styles.selected : ''}`}
                            >
                                {/* Checkbox */}
                                <div className={styles.submissionCheckbox}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleSelectSubmission(submission._id)}
                                    />
                                </div>

                                {/* Submission Info */}
                                <div className={styles.submissionInfo}>
                                    <span className={styles.submissionDate}>
                                        {formatDate(submission.submittedAt)}
                                    </span>

                                    <span className={styles.submissionName}>
                                        {businessLink ? (
                                            <a
                                                href={businessLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {submission.businessName}
                                            </a>
                                        ) : (
                                            submission.businessName
                                        )}
                                    </span>

                                    <div className={styles.submissionCategories}>
                                        {formatCategories(submission.categories)?.map((category, index) => (
                                            <span key={index} className={styles.categoryTag}>
                                                {category}
                                            </span>
                                        ))}
                                        {submission.categories?.length > 2 && (
                                            <span className={styles.categoryTag}>
                                                +{submission.categories.length - 2} more
                                            </span>
                                        )}
                                    </div>

                                    <div className={styles.submissionCities}>
                                        {formatCities(submission.cities)?.map((city, index) => (
                                            <span key={index} className={styles.cityTag}>
                                                {city}
                                            </span>
                                        ))}
                                        {submission.cities?.length > 2 && (
                                            <span className={styles.cityTag}>
                                                +{submission.cities.length - 2} more
                                            </span>
                                        )}
                                    </div>

                                    {renderDuplicateIndicator(submission)}

                                    <div className={styles.submissionStatus}>
                                        <span className={`${styles.statusBadge} ${styles[submission.status]}`}>
                                            {submission.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className={styles.submissionActions}>
                                    {submission.status === 'pending' && (
                                        <>
                                            <button
                                                className={`${styles.actionBtn} ${styles.approve}`}
                                                onClick={() => handleStatusUpdate(submission._id, 'approved')}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                ✅
                                            </button>
                                            <button
                                                className={`${styles.actionBtn} ${styles.reject}`}
                                                onClick={() => handleStatusUpdate(submission._id, 'rejected')}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                ❌
                                            </button>
                                        </>
                                    )}
                                    <button
                                        className={`${styles.actionBtn} ${styles.delete}`}
                                        onClick={() => bulkDeleteMutation.mutate([submission._id])}
                                        disabled={bulkDeleteMutation.isPending}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className={styles.paginationContainer}>
                    <div className={styles.paginationInfo}>
                        Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                        {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                        {pagination.totalItems} submissions
                    </div>
                    <div className={styles.paginationButtons}>
                        <button
                            className={styles.paginationBtn}
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={pagination.currentPage <= 1}
                        >
                            ← Previous
                        </button>
                        <span className={styles.paginationInfo}>
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        <button
                            className={styles.paginationBtn}
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            disabled={pagination.currentPage >= pagination.totalPages}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubmissionsManager;