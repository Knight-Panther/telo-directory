// client/src/components/business/BusinessCard.js
import React, { useState, useEffect, Suspense, memo, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import LazyImage from "../common/LazyImage";
import StarRating from "../common/StarRating";
import LoadingSpinner from "../common/LoadingSpinner";
import { useUserAuth } from "../../contexts/UserAuthContext";
import toast from "react-hot-toast";
// CSS loaded at page level - removed duplicate import

// Lazy load the ReportIssueModal
const ReportIssueModal = React.lazy(() => import("../modals/ReportIssueModal"));

const BusinessCard = memo(({ business }) => {
    const {
        _id,
        businessName,
        category,
        businessType,
        city,
        shortDescription,
        verified,
        mobile,
        profileImage,
        socialLinks,
    } = business;

    const { user, isAuthenticated, updateUserFavorites } = useUserAuth();

    // State for report issue modal
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // State for favorites functionality - optimized with local state for immediate UI feedback
    const [localFavoriteState, setLocalFavoriteState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Memoized calculation of favorite status - only recalculates when user.favorites or _id changes
    const isFavoriteFromUser = useMemo(() => {
        return user && user.favorites ? user.favorites.includes(_id) : false;
    }, [user?.favorites, _id]);

    // Display favorite state: local state takes precedence during loading, otherwise use user state
    const isFavorited = localFavoriteState !== null ? localFavoriteState : isFavoriteFromUser;

    // Reset local state when user favorites change
    useEffect(() => {
        setLocalFavoriteState(null);
    }, [isFavoriteFromUser]);

    // Memoized event handlers - prevent unnecessary re-renders of child components
    const handleImageError = useCallback((e) => {
        e.target.src = "/placeholder-business.png";
    }, []);

    // Handler functions for report issue modal
    const handleReportIssue = useCallback((e) => {
        e.preventDefault(); // Prevent navigation when clicking report
        e.stopPropagation(); // Prevent event bubbling
        setIsReportModalOpen(true);
    }, []);

    // Close modal handler
    const handleCloseReportModal = useCallback(() => {
        setIsReportModalOpen(false);
    }, []);

    // Favorite button handler with real API calls - memoized for performance
    const handleFavoriteClick = useCallback(async (e) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation(); // Prevent event bubbling

        // Check if user is authenticated
        if (!isAuthenticated) {
            toast.error("Please log in to save favorites");
            return;
        }

        // Prevent multiple clicks
        if (isLoading) return;

        setIsLoading(true);
        const previousState = isFavorited;

        // Optimistic update using local state for immediate UI feedback
        setLocalFavoriteState(!isFavorited);

        try {
            // Get token from proper storage location
            const accessToken = localStorage.getItem("telo_user_access_token") || 
                              sessionStorage.getItem("telo_user_access_token");
                              
            if (!accessToken) {
                throw new Error("No access token found");
            }

            const response = await fetch(`/api/auth/favorites/toggle/${_id}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update favorites");
            }

            // PERFORMANCE: Update favorites array and count for visual state
            updateUserFavorites(_id, data.action, data.favoritesCount);

            // Show success message
            toast.success(data.message);

        } catch (error) {
            console.error("Favorites toggle error:", error);
            
            // Rollback optimistic update using local state
            setLocalFavoriteState(previousState);

            // Show error message
            toast.error(error.message || "Failed to update favorites");
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, isLoading, isFavorited, _id, updateUserFavorites]); // Dependencies for useCallback

    // Generate consistent sample rating based on business ID (will come from database later)
    // 70% chance of having a rating between 7-10, 30% no rating
    // Memoized to ensure consistent rating per business and avoid recalculation on every render
    const sampleRating = useMemo(() => {
        // Use business ID as seed for consistent rating across renders
        const seed = _id.charCodeAt(_id.length - 1) + _id.charCodeAt(0);
        const random1 = (seed * 9301 + 49297) % 233280 / 233280;
        const random2 = ((seed + 1) * 9301 + 49297) % 233280 / 233280;

        // 30% chance of no rating
        if (random1 < 0.3) return null;

        // Rating between 7-10
        return Number((7 + random2 * 3).toFixed(1));
    }, [_id]);

    return (
        <>
            <div className="business-card business-card-mobile-horizontal">
                {/* UPDATED: New Facebook-style circular image container */}
                <div className="business-image-circular-container">
                    <div className="business-image-circular">
                        {profileImage ? (
                            <LazyImage
                                src={`http://localhost:3000${profileImage}`}
                                alt={businessName}
                                onError={handleImageError}
                                placeholder={
                                    <div className="image-placeholder-circular">
                                        <span>{businessName.charAt(0)}</span>
                                    </div>
                                }
                            />
                        ) : (
                            <div className="image-placeholder-circular">
                                <span>{businessName.charAt(0)}</span>
                            </div>
                        )}
                    </div>

                    {/* UPDATED: Verification badge positioned outside circular image */}
                    {verified && (
                        <span className="verified-badge-circular">✓</span>
                    )}

                    {/* UPDATED: Desktop overlay icons positioned near title area */}
                    <div className="desktop-overlay-icons">
                        <button
                            className={`favorite-btn-overlay ${
                                isFavorited ? "favorited" : ""
                            } ${isLoading ? "loading" : ""}`}
                            onClick={handleFavoriteClick}
                            disabled={isLoading}
                            title={
                                isLoading
                                    ? "Updating..."
                                    : isFavorited
                                    ? "Remove from favorites"
                                    : "Add to favorites"
                            }
                            aria-label={`${
                                isLoading
                                    ? "Updating"
                                    : isFavorited ? "Remove" : "Add"
                            } ${businessName} ${
                                isFavorited ? "from" : "to"
                            } favorites`}
                        >
                            {isLoading ? "⏳" : isFavorited ? "❤️" : "🤍"}
                        </button>

                        <button
                            className="report-btn-overlay"
                            onClick={handleReportIssue}
                            title="Report an issue with this listing"
                            aria-label={`Report issue with ${businessName}`}
                        >
                            🚩
                        </button>
                    </div>
                </div>

                <div className="business-info">
                    {/* Business name with mobile icons (hidden on desktop) */}
                    <div className="business-name-header">
                        <h3 className="business-name">
                            {/* Navigate to business detail page */}
                            <Link to={`/business/${_id}`}>
                                {businessName}
                            </Link>
                        </h3>

                        {/* Mobile-only icon group (hidden on desktop 1024px+) */}
                        <div className="icon-group-mobile">
                            <button
                                className={`favorite-btn-small ${
                                    isFavorited ? "favorited" : ""
                                } ${isLoading ? "loading" : ""}`}
                                onClick={handleFavoriteClick}
                                disabled={isLoading}
                                title={
                                    isLoading
                                        ? "Updating..."
                                        : isFavorited
                                        ? "Remove from favorites"
                                        : "Add to favorites"
                                }
                                aria-label={`${
                                    isLoading
                                        ? "Updating"
                                        : isFavorited ? "Remove" : "Add"
                                } ${businessName} ${
                                    isFavorited ? "from" : "to"
                                } favorites`}
                            >
                                {isLoading ? "⏳" : isFavorited ? "❤️" : "🤍"}
                            </button>

                            <button
                                className="report-btn-small"
                                onClick={handleReportIssue}
                                title="Report an issue with this listing"
                                aria-label={`Report issue with ${businessName}`}
                            >
                                🚩
                            </button>
                        </div>
                    </div>

                    {/* Star rating component */}
                    <StarRating
                        rating={sampleRating}
                        size="medium"
                        showNumber={true}
                        className="business-rating"
                    />

                    {/* Business meta (PRESERVED - no changes) */}
                    <div className="business-meta">
                        <span className="category">{category}</span>
                        <span className="type">{businessType}</span>
                        <span className="city">{city}</span>
                    </div>

                    {/* Description - always rendered to maintain consistent spacing */}
                    <p className="description">{shortDescription || ''}</p>

                    {/* Contact section with clickable phone number */}
                    <div className="business-contact">
                        <a
                            href={`tel:${mobile}`}
                            className="mobile"
                            aria-label={`Call ${businessName} at ${mobile}`}
                        >
                            {mobile}
                        </a>
                    </div>

                    {/* Social Links - always rendered to maintain consistent card heights */}
                    <div className="social-links">
                        {socialLinks?.facebook && (
                                <a
                                    href={socialLinks.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="social-icon facebook"
                                    title="Visit our Facebook page"
                                    aria-label="Facebook"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </a>
                            )}
                        {socialLinks?.instagram && (
                                <a
                                    href={socialLinks.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="social-icon instagram"
                                    title="Visit our Instagram page"
                                    aria-label="Instagram"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </a>
                            )}
                        {socialLinks?.tiktok && (
                                <a
                                    href={socialLinks.tiktok}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="social-icon tiktok"
                                    title="Visit our TikTok page"
                                    aria-label="TikTok"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 4.08-.01 8.16-.02 12.24-.03 1.83-.74 3.66-1.97 5.08-1.23 1.42-2.91 2.44-4.73 2.8-1.82.36-3.74.01-5.35-.98-1.61-.99-2.91-2.5-3.59-4.26-.68-1.76-.63-3.73.13-5.45.76-1.72 2.09-3.16 3.68-3.96 1.59-.8 3.45-.85 5.08-.13v4.56c-.6-.24-1.28-.35-1.94-.23-.66.12-1.28.5-1.73 1.05-.45.55-.7 1.26-.7 1.97 0 .71.25 1.42.7 1.97.45.55 1.07.93 1.73 1.05.66.12 1.34.01 1.94-.23.6-.24 1.12-.65 1.48-1.18.36-.53.56-1.16.56-1.79V.02h4.55z" />
                                    </svg>
                                </a>
                            )}
                    </div>
                </div>
            </div>

            {/* Report Issue Modal - Lazy loaded */}
            {isReportModalOpen && (
                <Suspense fallback={<div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}><LoadingSpinner /></div>}>
                    <ReportIssueModal
                        isOpen={isReportModalOpen}
                        onClose={handleCloseReportModal}
                        businessId={_id}
                        businessName={businessName}
                    />
                </Suspense>
            )}
        </>
    );
});

// Add display name for better debugging and React DevTools
BusinessCard.displayName = 'BusinessCard';

export default BusinessCard;
