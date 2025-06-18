// client/src/components/admin/ManageBusinesses.js
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import adminService from "../../services/adminService";
import LoadingSpinner from "../common/LoadingSpinner";
import "../../styles/admin.css";

const ManageBusinesses = () => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin-businesses", page, search],
        queryFn: () => adminService.getBusinesses({ page, search, limit: 10 }),
    });

    const deleteMutation = useMutation({
        mutationFn: adminService.deleteBusiness,
        onSuccess: () => {
            queryClient.invalidateQueries(["admin-businesses"]);
            alert("Business deleted successfully");
        },
        onError: () => alert("Error deleting business"),
    });

    const verifyMutation = useMutation({
        mutationFn: adminService.toggleVerification,
        onSuccess: () => {
            queryClient.invalidateQueries(["admin-businesses"]);
        },
    });

    const handleDelete = (id, name) => {
        if (window.confirm(`Delete business "${name}"?`)) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <LoadingSpinner size="large" />;
    if (isError)
        return <div className="error-message">Error loading businesses</div>;

    const { businesses = [], pagination = {} } = data || {};

    return (
        <div className="manage-businesses">
            <div className="manage-header">
                <h2>Manage Businesses</h2>
                <Link to="/admin/businesses/new" className="btn btn-primary">
                    Add New Business
                </Link>
            </div>

            <div className="search-section">
                <input
                    type="text"
                    placeholder="Search businesses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-input-admin"
                />
            </div>

            <div className="businesses-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Category</th>
                            <th>City</th>
                            <th>Type</th>
                            <th>Verified</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {businesses.map((business) => (
                            <tr key={business._id}>
                                <td>
                                    <div className="business-cell">
                                        {business.profileImage && (
                                            <img
                                                src={`http://localhost:3000${business.profileImage}`}
                                                alt={business.businessName}
                                                className="table-image"
                                            />
                                        )}
                                        <div>
                                            <strong>
                                                {business.businessName}
                                            </strong>
                                            <small>{business.businessId}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>{business.category}</td>
                                <td>{business.city}</td>
                                <td>{business.businessType}</td>
                                <td>
                                    <button
                                        className={`verify-btn ${
                                            business.verified
                                                ? "verified"
                                                : "unverified"
                                        }`}
                                        onClick={() =>
                                            verifyMutation.mutate(business._id)
                                        }
                                        disabled={verifyMutation.isPending}
                                    >
                                        {business.verified ? "✓" : "✗"}
                                    </button>
                                </td>
                                <td className="actions">
                                    <Link
                                        to={`/admin/businesses/edit/${business._id}`}
                                        className="btn btn-small btn-secondary"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() =>
                                            handleDelete(
                                                business._id,
                                                business.businessName
                                            )
                                        }
                                        className="btn btn-small btn-danger"
                                        disabled={deleteMutation.isPending}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
                <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrev}
                    className="btn btn-secondary"
                >
                    Previous
                </button>
                <span>
                    Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasNext}
                    className="btn btn-secondary"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default ManageBusinesses;
