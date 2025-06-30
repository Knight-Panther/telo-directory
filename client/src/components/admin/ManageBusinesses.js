// client/src/components/admin/ManageBusinesses.js (existing code)
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import adminService from "../../services/adminService";
import LoadingSpinner from "../common/LoadingSpinner";
import "../../styles/admin.css";

const ManageBusinesses = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    //change here
    const [searchInput, setSearchInput] = useState(""); // What user types
    const [searchQuery, setSearchQuery] = useState(""); // What gets sent to API

    // 🔥 GET PAGE FROM URL INSTEAD OF LOCAL STATE
    const page = parseInt(searchParams.get("page")) || 1;
    const queryClient = useQueryClient();

    //change here
    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin-businesses", page, searchQuery],
        queryFn: () =>
            adminService.getBusinesses({
                page,
                search: searchQuery,
                limit: 10,
            }),
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

    // 🔥 UPDATE URL INSTEAD OF LOCAL STATE
    const setPage = (newPage) => {
        const params = new URLSearchParams(searchParams);
        if (newPage === 1) {
            params.delete("page"); // Clean URL for page 1
        } else {
            params.set("page", newPage.toString());
        }
        setSearchParams(params);
    };

    //change here
    const handleSearch = (e) => {
        e.preventDefault();
        setSearchQuery(searchInput); // This triggers the API call
        // Reset to page 1 when searching
        const params = new URLSearchParams(searchParams);
        params.delete("page");
        setSearchParams(params);
    };

    const handleClearSearch = () => {
        setSearchInput("");
        setSearchQuery("");
        // Reset to page 1
        const params = new URLSearchParams(searchParams);
        params.delete("page");
        setSearchParams(params);
    };

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
                <form
                    onSubmit={handleSearch}
                    style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                    }}
                >
                    <input
                        type="text"
                        placeholder="Search by name, ID, or mobile..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="search-input-admin"
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary">
                        Search
                    </button>
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={handleClearSearch}
                            className="btn btn-secondary"
                        >
                            Clear
                        </button>
                    )}
                </form>

                {searchQuery && (
                    <div
                        style={{
                            marginTop: "8px",
                            fontSize: "14px",
                            color: "#666",
                        }}
                    >
                        Searching for: "{searchQuery}"
                    </div>
                )}
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
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={!pagination.hasPrev}
                    className="btn btn-secondary"
                >
                    Previous
                </button>
                <span>
                    Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                    onClick={() => setPage(page + 1)}
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
