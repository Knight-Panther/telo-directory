// client/src/pages/FavoritesPage.js
import React, { useState, useEffect } from "react";
import { useUserAuth } from "../contexts/UserAuthContext";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/pages.css";

const FavoritesPage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, refreshUser } = useUserAuth();
    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFavorites, setSelectedFavorites] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 25,
        hasMore: false
    });
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Load favorites on component mount
    useEffect(() => {
        if (isAuthenticated) {
            loadFavorites();
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    const loadFavorites = async (page = 1, append = false) => {
        try {
            if (!append) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }

            const accessToken = localStorage.getItem("telo_user_access_token") || 
                              sessionStorage.getItem("telo_user_access_token");
                              
            const response = await fetch(`/api/auth/favorites?page=${page}&limit=25`, {
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to load favorites");
            }

            if (append) {
                // Append new favorites to existing list
                setFavorites(prev => [...prev, ...data.favorites]);
            } else {
                // Replace favorites list
                setFavorites(data.favorites);
            }
            
            setPagination(data.pagination);
            setCurrentPage(page);
            
        } catch (error) {
            console.error("Load favorites error:", error);
            toast.error("Failed to load favorites");
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    // Handle individual favorite deletion
    const handleDeleteFavorite = async (businessId) => {
        try {
            const accessToken = localStorage.getItem("telo_user_access_token") || 
                              sessionStorage.getItem("telo_user_access_token");
                              
            const response = await fetch(`/api/auth/favorites/${businessId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to remove favorite");
            }

            // Update local state
            setFavorites(prev => prev.filter(fav => fav._id !== businessId));
            
            // Remove from selected if it was selected
            setSelectedFavorites(prev => prev.filter(id => id !== businessId));

            // Update user data
            await refreshUser();

            toast.success("Business removed from favorites");
        } catch (error) {
            console.error("Delete favorite error:", error);
            toast.error("Failed to remove favorite");
        }
    };

    // Handle bulk deletion
    const handleBulkDelete = async () => {
        if (selectedFavorites.length === 0) {
            toast.error("Please select favorites to delete");
            return;
        }

        setIsDeleting(true);

        try {
            const accessToken = localStorage.getItem("telo_user_access_token") || 
                              sessionStorage.getItem("telo_user_access_token");
                              
            const response = await fetch("/api/auth/favorites/bulk-delete", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    businessIds: selectedFavorites,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to delete favorites");
            }

            // Update local state
            setFavorites(prev => 
                prev.filter(fav => !selectedFavorites.includes(fav._id))
            );
            
            // Clear selections
            setSelectedFavorites([]);

            // Update user data
            await refreshUser();

            toast.success(data.message);
        } catch (error) {
            console.error("Bulk delete error:", error);
            toast.error("Failed to delete selected favorites");
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle select all toggle
    const handleSelectAll = () => {
        if (selectedFavorites.length === favorites.length) {
            setSelectedFavorites([]);
        } else {
            setSelectedFavorites(favorites.map(fav => fav._id));
        }
    };

    // Handle individual selection
    const handleSelectFavorite = (businessId) => {
        setSelectedFavorites(prev => {
            if (prev.includes(businessId)) {
                return prev.filter(id => id !== businessId);
            } else {
                return [...prev, businessId];
            }
        });
    };

    // Utility functions for Gmail-style display
    const formatDateAdded = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return "Added today";
        if (diffDays === 2) return "Added yesterday";
        if (diffDays <= 7) return `Added ${diffDays - 1} days ago`;
        if (diffDays <= 30) return `Added ${Math.ceil((diffDays - 1) / 7)} weeks ago`;
        return `Added ${Math.ceil((diffDays - 1) / 30)} months ago`;
    };

    const renderStars = (rating) => {
        if (!rating) return "☆☆☆☆☆";
        const filled = "⭐".repeat(Math.floor(rating));
        const empty = "☆".repeat(5 - Math.floor(rating));
        return filled + empty;
    };

    const handleBusinessClick = (businessId) => {
        navigate(`/business/${businessId}`);
    };

    // Handle "Show More" button click
    const handleShowMore = async () => {
        const nextPage = currentPage + 1;
        await loadFavorites(nextPage, true);
    };

    // Redirect if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="page-container">
                <div className="favorites-page">
                    <div className="auth-required">
                        <h1>🔒 Authentication Required</h1>
                        <p>Please log in to view your favorites.</p>
                        <Link to="/" className="btn btn-primary">
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="page-container">
                <div className="favorites-page">
                    <div className="loading-state">
                        <h1>Loading your favorites...</h1>
                        <div className="loading-spinner">⏳</div>
                    </div>
                </div>
            </div>
        );
    }

    // Empty state
    if (favorites.length === 0) {
        return (
            <div className="page-container">
                <div className="favorites-page">
                    <div className="favorites-header">
                        <h1>❤️ My Favorites</h1>
                        <p>Your favorite businesses will appear here</p>
                    </div>
                    
                    <div className="empty-state">
                        <div className="empty-icon">🤍</div>
                        <h2>No favorites yet!</h2>
                        <p>Start exploring businesses and save your favorites by clicking the heart button.</p>
                        <Link to="/" className="btn btn-primary">
                            Discover Businesses
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="favorites-page">
                {/* Header */}
                <div className="favorites-header">
                    <h1>❤️ My Favorites ({pagination.totalItems})</h1>
                    <p>Manage your saved businesses</p>
                </div>

                {/* Bulk Actions */}
                {favorites.length > 0 && (
                    <div className="bulk-actions">
                        <div className="selection-controls">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={selectedFavorites.length === favorites.length}
                                    onChange={handleSelectAll}
                                />
                                <span className="checkmark"></span>
                                Select All ({selectedFavorites.length} selected)
                            </label>
                        </div>

                        {selectedFavorites.length > 0 && (
                            <button
                                className="btn btn-danger"
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : `Delete Selected (${selectedFavorites.length})`}
                            </button>
                        )}
                    </div>
                )}

                {/* Gmail-style Favorites List */}
                <div className="gmail-favorites-list">
                    {favorites.map((business) => (
                        <div key={business._id} className="gmail-favorite-item">
                            {/* Checkbox */}
                            <div className="gmail-checkbox">
                                <input
                                    type="checkbox"
                                    checked={selectedFavorites.includes(business._id)}
                                    onChange={() => handleSelectFavorite(business._id)}
                                />
                            </div>
                            
                            {/* Business Info */}
                            <div className="gmail-business-info">
                                <span 
                                    className="gmail-business-name"
                                    onClick={() => handleBusinessClick(business._id)}
                                >
                                    {business.businessName}
                                </span>
                                <span className="gmail-separator">•</span>
                                <span className="gmail-category">{business.category}</span>
                                <span className="gmail-separator">•</span>
                                <span className="gmail-city">{business.city}</span>
                                <span className="gmail-separator">•</span>
                                <span className="gmail-rating">{renderStars(4.5)}</span>
                                <span className="gmail-separator">•</span>
                                <span className="gmail-date">{formatDateAdded(business.createdAt || new Date())}</span>
                            </div>
                            
                            {/* Delete Action */}
                            <div className="gmail-actions">
                                <button
                                    className="gmail-delete-btn"
                                    onClick={() => handleDeleteFavorite(business._id)}
                                    title="Remove from favorites"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Show More Button */}
                {pagination.hasMore && (
                    <div className="show-more-container">
                        <button
                            className="show-more-btn"
                            onClick={handleShowMore}
                            disabled={isLoadingMore}
                        >
                            {isLoadingMore ? (
                                <>
                                    <span className="loading-spinner">⏳</span>
                                    Loading more...
                                </>
                            ) : (
                                <>
                                    Show {Math.min(25, pagination.totalItems - favorites.length)} More
                                    <span className="show-more-count">
                                        ({favorites.length} of {pagination.totalItems})
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FavoritesPage;