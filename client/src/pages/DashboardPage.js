// client/src/pages/DashboardPage.js
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserAuth } from "../contexts/UserAuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import "../styles/dashboard.css";

/**
 * DashboardPage Component - Redesigned
 *
 * Clean dashboard with clickable activity containers:
 * - Full-width narrow hero section
 * - Large clickable containers (Favorites, Ratings, Comments)
 * - Modal system for detailed listings
 * - Simplified quick actions
 *
 * Features:
 * - Clickable containers open modals with full listings
 * - Gmail-style lists inside modals
 * - Bulk operations within modals
 * - Clean, minimal design
 *
 * FIXED: Updated all class names to avoid collision with admin dashboard
 * UPDATED: Hero section now spans full width
 */
const DashboardPage = () => {
    const navigate = useNavigate();
    const { user, isLoading, isAuthenticated } = useUserAuth();

    // Modal states
    const [activeModal, setActiveModal] = useState(null); // 'favorites', 'ratings', 'comments', or null
    const [selectedItems, setSelectedItems] = useState([]);

    // Mock data - TODO: Replace with real API calls
    const [dashboardData, setDashboardData] = useState({
        favorites: [
            {
                id: 1,
                businessName: "Restaurant ABC",
                category: "Georgian",
                city: "Tbilisi",
                rating: 4.5,
                image: "/api/placeholder/40/40",
                dateAdded: "2 days ago",
                businessId: "biz_1",
            },
            {
                id: 2,
                businessName: "Cafe XYZ",
                category: "Coffee",
                city: "Batumi",
                rating: 4.0,
                image: "/api/placeholder/40/40",
                dateAdded: "1 week ago",
                businessId: "biz_2",
            },
            {
                id: 3,
                businessName: "Shop DEF",
                category: "Shopping",
                city: "Kutaisi",
                rating: 5.0,
                image: "/api/placeholder/40/40",
                dateAdded: "2 weeks ago",
                businessId: "biz_3",
            },
            {
                id: 4,
                businessName: "Hotel GHI",
                category: "Accommodation",
                city: "Tbilisi",
                rating: 4.2,
                image: "/api/placeholder/40/40",
                dateAdded: "3 weeks ago",
                businessId: "biz_8",
            },
            {
                id: 5,
                businessName: "Spa JKL",
                category: "Wellness",
                city: "Batumi",
                rating: 4.8,
                image: "/api/placeholder/40/40",
                dateAdded: "1 month ago",
                businessId: "biz_9",
            },
        ],
        ratings: [
            {
                id: 1,
                businessName: "Hotel ABC",
                rating: 5,
                image: "/api/placeholder/40/40",
                dateRated: "3 days ago",
                businessId: "biz_4",
            },
            {
                id: 2,
                businessName: "Restaurant XYZ",
                rating: 4,
                image: "/api/placeholder/40/40",
                dateRated: "1 week ago",
                businessId: "biz_5",
            },
            {
                id: 3,
                businessName: "Gym MNO",
                rating: 3,
                image: "/api/placeholder/40/40",
                dateRated: "2 weeks ago",
                businessId: "biz_10",
            },
        ],
        comments: [
            {
                id: 1,
                businessName: "Cafe DEF",
                comment: "Great coffee and atmosphere, perfect for working!",
                image: "/api/placeholder/40/40",
                dateCommented: "2 days ago",
                businessId: "biz_6",
            },
            {
                id: 2,
                businessName: "Shop GHI",
                comment: "Helpful staff, good prices, wide selection.",
                image: "/api/placeholder/40/40",
                dateCommented: "1 week ago",
                businessId: "biz_7",
            },
        ],
    });

    // Auto-scroll to top on page load
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
    }, []);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // Get current modal data
    const getCurrentModalData = () => {
        switch (activeModal) {
            case "favorites":
                return dashboardData.favorites;
            case "ratings":
                return dashboardData.ratings;
            case "comments":
                return dashboardData.comments;
            default:
                return [];
        }
    };

    // Modal handlers
    const openModal = (type) => {
        setActiveModal(type);
        setSelectedItems([]);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedItems([]);
    };

    // Bulk selection handlers
    const handleSelectAll = (isChecked) => {
        const currentData = getCurrentModalData();
        setSelectedItems(isChecked ? currentData.map((item) => item.id) : []);
    };

    const handleItemSelect = (itemId, isChecked) => {
        setSelectedItems((prev) =>
            isChecked ? [...prev, itemId] : prev.filter((id) => id !== itemId)
        );
    };

    // Action handlers
    const handleBulkDelete = () => {
        const confirmMessage = `Are you sure you want to delete the selected ${activeModal}?`;
        if (window.confirm(confirmMessage)) {
            // TODO: API call to delete selected items
            console.log(`Deleting selected ${activeModal}:`, selectedItems);
            setSelectedItems([]);
        }
    };

    const handleEdit = (item) => {
        // TODO: Implement edit functionality
        console.log(`Editing ${activeModal}:`, item);
    };

    const handleDelete = (itemId) => {
        const confirmMessage = `Are you sure you want to delete this ${activeModal}?`;
        if (window.confirm(confirmMessage)) {
            // TODO: API call to delete single item
            console.log(`Deleting ${activeModal} with ID:`, itemId);
        }
    };

    const handleViewBusiness = (businessId) => {
        navigate(`/business/${businessId}`);
        closeModal();
    };

    // Render star rating
    const renderStars = (rating) => {
        return "⭐".repeat(rating) + "☆".repeat(5 - rating);
    };

    // Render modal content based on type
    const renderModalContent = () => {
        const currentData = getCurrentModalData();
        const modalTitle =
            activeModal === "favorites"
                ? "My Favorites"
                : activeModal === "ratings"
                ? "My Ratings"
                : "My Comments";

        return (
            <div className="user-modal-overlay" onClick={closeModal}>
                <div
                    className="user-modal-content"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="user-modal-header">
                        <h2>
                            {modalTitle} ({currentData.length})
                        </h2>
                        <button
                            className="user-modal-close"
                            onClick={closeModal}
                        >
                            ×
                        </button>
                    </div>

                    <div className="user-modal-controls">
                        <label className="user-bulk-select">
                            <input
                                type="checkbox"
                                checked={
                                    selectedItems.length ===
                                        currentData.length &&
                                    currentData.length > 0
                                }
                                onChange={(e) =>
                                    handleSelectAll(e.target.checked)
                                }
                            />
                            Select All
                        </label>
                        {selectedItems.length > 0 && (
                            <button
                                className="user-bulk-delete-btn"
                                onClick={handleBulkDelete}
                            >
                                Delete Selected ({selectedItems.length}) 🗑️
                            </button>
                        )}
                    </div>

                    <div className="user-modal-items-list">
                        {currentData.map((item) => (
                            <div key={item.id} className="user-modal-item-row">
                                <label className="user-item-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.includes(
                                            item.id
                                        )}
                                        onChange={(e) =>
                                            handleItemSelect(
                                                item.id,
                                                e.target.checked
                                            )
                                        }
                                    />
                                </label>
                                <div className="user-item-image">
                                    <img
                                        src={item.image}
                                        alt={item.businessName}
                                    />
                                </div>
                                <div className="user-item-content">
                                    <div className="user-item-main">
                                        <h3 className="user-item-title">
                                            {item.businessName}
                                        </h3>
                                        {activeModal === "favorites" && (
                                            <div className="user-item-rating">
                                                {renderStars(
                                                    Math.floor(item.rating)
                                                )}
                                            </div>
                                        )}
                                        {activeModal === "ratings" && (
                                            <div className="user-item-rating">
                                                {renderStars(item.rating)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="user-item-meta">
                                        {activeModal === "favorites" &&
                                            `${item.category} • ${item.city} • Added ${item.dateAdded}`}
                                        {activeModal === "ratings" &&
                                            `Rated ${item.dateRated}`}
                                        {activeModal === "comments" &&
                                            `Commented ${item.dateCommented}`}
                                    </div>
                                    {activeModal === "comments" && (
                                        <div className="user-item-comment">
                                            "{item.comment}"
                                        </div>
                                    )}
                                </div>
                                <div className="user-item-actions">
                                    <button
                                        className="user-action-btn user-view-btn"
                                        onClick={() =>
                                            handleViewBusiness(item.businessId)
                                        }
                                    >
                                        View
                                    </button>
                                    <button
                                        className="user-action-btn user-edit-btn"
                                        onClick={() => handleEdit(item)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="user-action-btn user-delete-btn"
                                        onClick={() => handleDelete(item.id)}
                                    >
                                        ❌
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="user-dashboard-page">
                <div className="container">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="user-dashboard-page">
                <div className="container">
                    <div className="user-dashboard-error">
                        <h2>Access Denied</h2>
                        <p>
                            Please <Link to="/">return to home</Link> and log
                            in.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="user-dashboard-page">
            {/* Hero Section - Full Width, Narrow Height - MOVED OUTSIDE CONTAINER */}
            <div className="user-dashboard-hero">
                <div className="container">
                    <h1>Welcome, {user.name || user.email?.split("@")[0]}!</h1>
                    <p>Your business discovery journey</p>
                </div>
            </div>

            <div className="container">
                {/* Dashboard Content - Activity Containers */}
                <div className="user-dashboard-content">
                    {/* My Favorites Container */}
                    <div
                        className="user-activity-container user-favorites-container"
                        onClick={() => openModal("favorites")}
                    >
                        <div className="user-container-icon">💫</div>
                        <div className="user-container-content">
                            <h3>My Favorites</h3>
                            <div className="user-container-count">
                                {dashboardData.favorites.length}
                            </div>
                            <p>Saved businesses you love</p>
                        </div>
                        <div className="user-container-arrow">→</div>
                    </div>

                    {/* My Ratings Container */}
                    <div
                        className="user-activity-container user-ratings-container"
                        onClick={() => openModal("ratings")}
                    >
                        <div className="user-container-icon">⭐</div>
                        <div className="user-container-content">
                            <h3>My Ratings</h3>
                            <div className="user-container-count">
                                {dashboardData.ratings.length}
                            </div>
                            <p>Businesses you've rated</p>
                        </div>
                        <div className="user-container-arrow">→</div>
                    </div>

                    {/* My Comments Container */}
                    <div
                        className="user-activity-container user-comments-container"
                        onClick={() => openModal("comments")}
                    >
                        <div className="user-container-icon">💬</div>
                        <div className="user-container-content">
                            <h3>My Comments</h3>
                            <div className="user-container-count">
                                {dashboardData.comments.length}
                            </div>
                            <p>Your shared experiences</p>
                        </div>
                        <div className="user-container-arrow">→</div>
                    </div>

                    {/* Quick Actions - Simplified */}
                    <div className="user-quick-actions-section">
                        <h2>Quick Actions</h2>
                        <div className="user-quick-actions-grid">
                            <Link to="/" className="user-quick-action-btn">
                                <span className="user-action-icon">🔍</span>
                                Find Businesses
                            </Link>
                            <Link to="/help" className="user-quick-action-btn">
                                <span className="user-action-icon">❓</span>
                                Help & Support
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Modal for detailed listings */}
                {activeModal && renderModalContent()}
            </div>
        </div>
    );
};

export default DashboardPage;
