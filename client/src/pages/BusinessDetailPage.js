// client/src/pages/BusinessDetailPage.js

import React, { useState, useEffect, Suspense } from "react"; // UPDATED: Added useEffect import
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import businessService from "../services/businessService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import LazyImage from "../components/common/LazyImage";
import {
    getImageUrl,
    getPlaceholderData,
    handleImageError,
} from "../utils/imageHelper";
import "../styles/pages.css";
import "../styles/components-core.css"; // LazyImage, loading spinner, business cards

// Lazy load the ReportIssueModal
const ReportIssueModal = React.lazy(() => import("../components/modals/ReportIssueModal"));

/**
 * BusinessDetailPage Component
 *
 * This component demonstrates several important React patterns:
 * - URL parameter extraction with useParams
 * - API data fetching with React Query
 * - Responsive design with CSS Grid and conditional rendering
 * - Error boundary patterns
 * - Image optimization with lazy loading
 * - Progressive enhancement (desktop full view, mobile collapsed)
 * - Report Issue Modal Integration
 * - FIXED: Auto scroll to top on page load (laptop screen issue resolved)
 */
const BusinessDetailPage = () => {
    const { id } = useParams(); // Extract business ID from URL (/business/:id)
    const navigate = useNavigate(); // For programmatic navigation

    // State for mobile responsive behavior
    // On mobile, secondary information starts collapsed for better UX
    const [isSecondaryInfoExpanded, setIsSecondaryInfoExpanded] =
        useState(false);

    // State for report issue modal
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // FIXED: Auto scroll to top when component mounts or ID changes
    // This resolves the issue where pages opened at the bottom on laptop screens
    useEffect(() => {
        // Scroll to top immediately when component mounts
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth", // Smooth scroll for better UX
        });

        // Alternative method for browsers that don't support smooth scrolling
        // window.scrollTo(0, 0);

        // Optional: Also scroll to top when document is ready (fallback)
        const timer = setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);

        return () => clearTimeout(timer);
    }, [id]); // Dependency on 'id' ensures scroll-to-top when navigating between different businesses

    // React Query hook for data fetching with built-in loading, error, and caching
    // This replaces the need for useState + useEffect + fetch logic
    const {
        data: business,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["business", id], // Unique key for this query
        queryFn: () => businessService.getBusiness(id), // Function that fetches the data
        retry: 2, // Retry failed requests twice before giving up
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    });

    // Loading state - show spinner while fetching data
    if (isLoading) {
        return (
            <div className="container">
                <LoadingSpinner size="large" />
                <p style={{ textAlign: "center", marginTop: "1rem" }}>
                    Loading business details...
                </p>
            </div>
        );
    }

    // Error state - handle different types of errors with specific messaging
    if (isError) {
        const errorMessage =
            error?.response?.data?.code === "BUSINESS_NOT_FOUND"
                ? "This business listing no longer exists or has been removed."
                : error?.response?.data?.code === "INVALID_ID"
                ? "The business link appears to be malformed."
                : "Unable to load business details. Please try again later.";

        return (
            <div className="container">
                <div className="error-state">
                    <div className="error-icon">⚠️</div>
                    <h2>Oops! Something went wrong</h2>
                    <p>{errorMessage}</p>
                    <div className="error-actions">
                        <button
                            onClick={() => navigate("/")}
                            className="btn btn-primary"
                        >
                            ← Back to Home
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn btn-secondary"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Handle case where query succeeds but returns no data
    if (!business) {
        return (
            <div className="container">
                <div className="no-results">
                    <p>Business not found</p>
                    <Link to="/">← Back to Home</Link>
                </div>
            </div>
        );
    }

    // Helper function to safely handle phone number clicks
    // This creates properly formatted tel: links for mobile devices
    const handlePhoneClick = (phoneNumber) => {
        if (!phoneNumber) return;

        // Clean the phone number for tel: protocol
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, "");
        window.location.href = `tel:${cleanNumber}`;
    };

    // Helper function to track social media clicks for future analytics
    const handleSocialClick = (platform, url) => {
        if (process.env.NODE_ENV === "development") {
            console.log(
                `📱 Social media click: ${platform} for ${business.businessName}`
            );
        }
        window.open(url, "_blank", "noopener,noreferrer");
    };

    // Handler functions for report issue modal
    const handleReportIssue = () => {
        setIsReportModalOpen(true);
    };

    const handleCloseReportModal = () => {
        setIsReportModalOpen(false);
    };

    // Generate placeholder data for missing images
    const placeholderData = getPlaceholderData(business.businessName);

    return (
        <div className="business-detail-page">
            <div className="container">
                {/* Back Navigation */}
                {/* <div className="back-link">
                    <Link to="/">Back to All Businesses</Link>
                </div> */}

                {/* Main Business Detail Card */}
                <div className="business-detail">
                    {/* Business Header - Image and Primary Info */}
                    <div className="business-header">
                        <div className="business-image-large">
                            {business.profileImage ? (
                                <LazyImage
                                    src={getImageUrl(
                                        business.profileImage,
                                        "detail"
                                    )}
                                    alt={`${business.businessName} profile`}
                                    onError={(e) =>
                                        handleImageError(
                                            e,
                                            business.businessName
                                        )
                                    }
                                    placeholder={
                                        <div
                                            className="image-placeholder-large"
                                            style={{
                                                backgroundColor:
                                                    placeholderData.backgroundColor,
                                            }}
                                        >
                                            <span>
                                                {placeholderData.letter}
                                            </span>
                                        </div>
                                    }
                                />
                            ) : (
                                <div
                                    className="image-placeholder-large"
                                    style={{
                                        backgroundColor:
                                            placeholderData.backgroundColor,
                                    }}
                                >
                                    <span>{placeholderData.letter}</span>
                                </div>
                            )}
                            {business.verified && (
                                <div className="verified-badge-large">
                                    ✓ Verified Business
                                </div>
                            )}
                        </div>

                        <div className="business-main-info">
                            <div className="business-title-section">
                                <h1 className="business-title">
                                    {business.businessName}
                                </h1>
                                <p className="business-id">
                                    ID: {business.businessId}
                                </p>
                            </div>

                            <div className="business-meta-grid">
                                <div className="meta-item">
                                    <span className="meta-label">Category</span>
                                    <span className="meta-value">
                                        {business.category}
                                    </span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">
                                        Business Type
                                    </span>
                                    <span className="meta-value">
                                        {business.businessType === "individual"
                                            ? "Individual"
                                            : "Company"}
                                    </span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Location</span>
                                    <span className="meta-value">
                                        {business.city}
                                    </span>
                                </div>
                            </div>

                            {business.shortDescription && (
                                <div className="business-description">
                                    <h3>About This Business</h3>
                                    <p>{business.shortDescription}</p>
                                </div>
                            )}

                            {/* Action Buttons - Call and Social Media */}
                            <div className="business-actions">
                                <button
                                    className="action-btn call-btn"
                                    onClick={() =>
                                        handlePhoneClick(business.mobile)
                                    }
                                    title={`Call ${business.businessName}`}
                                >
                                    <span className="btn-icon">📞</span>
                                    Call {business.mobile}
                                </button>

                                {/* Social Media Buttons */}
                                <div className="social-actions">
                                    {business.socialLinks.facebook && (
                                        <button
                                            className="action-btn social-btn facebook"
                                            onClick={() =>
                                                handleSocialClick(
                                                    "Facebook",
                                                    business.socialLinks
                                                        .facebook
                                                )
                                            }
                                        >
                                            <span className="btn-icon">📘</span>
                                            Facebook
                                        </button>
                                    )}
                                    {business.socialLinks.instagram && (
                                        <button
                                            className="action-btn social-btn instagram"
                                            onClick={() =>
                                                handleSocialClick(
                                                    "Instagram",
                                                    business.socialLinks
                                                        .instagram
                                                )
                                            }
                                        >
                                            <span className="btn-icon">📷</span>
                                            Instagram
                                        </button>
                                    )}
                                    {business.socialLinks.tiktok && (
                                        <button
                                            className="action-btn social-btn tiktok"
                                            onClick={() =>
                                                handleSocialClick(
                                                    "TikTok",
                                                    business.socialLinks.tiktok
                                                )
                                            }
                                        >
                                            <span className="btn-icon">🎵</span>
                                            TikTok
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Information Section */}
                    {/* Desktop: Always visible | Mobile: Collapsible */}
                    <div className="business-secondary-info">
                        <div className="secondary-header">
                            <h3>Business Information</h3>
                            {/* Mobile toggle button - hidden on desktop */}
                            <button
                                className="mobile-toggle"
                                onClick={() =>
                                    setIsSecondaryInfoExpanded(
                                        !isSecondaryInfoExpanded
                                    )
                                }
                                aria-label="Toggle additional information"
                            >
                                {isSecondaryInfoExpanded ? "−" : "+"}
                            </button>
                        </div>

                        <div
                            className={`secondary-content ${
                                isSecondaryInfoExpanded ? "expanded" : ""
                            }`}
                        >
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">
                                        Registration
                                    </span>
                                    <span className="info-value">
                                        {business.registrationInfo?.memberSince}
                                    </span>
                                    {business.registrationInfo
                                        ?.isNewBusiness && (
                                        <span className="new-badge">
                                            New Business!
                                        </span>
                                    )}
                                </div>

                                <div className="info-item">
                                    <span className="info-label">
                                        Days Active
                                    </span>
                                    <span className="info-value">
                                        {business.registrationInfo?.daysActive}{" "}
                                        days
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">
                                        Last Updated
                                    </span>
                                    <span className="info-value">
                                        {new Date(
                                            business.updatedAt
                                        ).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">
                                        Verification Status
                                    </span>
                                    <span
                                        className={`verification-status ${
                                            business.verified
                                                ? "verified"
                                                : "unverified"
                                        }`}
                                    >
                                        {business.verified
                                            ? "✓ Verified"
                                            : "○ Unverified"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Business Section */}
                    <div className="contact-section">
                        <h3>Contact This Business</h3>
                        <div className="contact-grid">
                            <div className="contact-method">
                                <span className="contact-label">Phone</span>
                                <button
                                    className="contact-value clickable"
                                    onClick={() =>
                                        handlePhoneClick(business.mobile)
                                    }
                                >
                                    {business.mobile}
                                </button>
                            </div>

                            <div className="contact-method">
                                <span className="contact-label">Location</span>
                                <span className="contact-value">
                                    {business.city}
                                </span>
                            </div>

                            {/* Report Issue button opens modal */}
                            <div className="contact-method">
                                <span className="contact-label">
                                    Report Issue
                                </span>
                                <button
                                    className="report-btn"
                                    onClick={handleReportIssue}
                                    title="Report an issue with this listing"
                                >
                                    🚩 Report
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="back-link back-link-bottom">
                        <button
                            onClick={() => navigate(-1)}
                            className="back-button"
                        >
                            ← Back to All Businesses
                        </button>
                    </div>
                </div>

                {/* Future Enhancement: Related Businesses Section */}
                {/* This is where we'll add the horizontal scrolling related businesses */}
                <div className="related-businesses-placeholder">
                    <h3>Similar Businesses</h3>
                    <p style={{ color: "#666", fontStyle: "italic" }}>
                        Related businesses feature coming soon...
                    </p>
                </div>
            </div>

            {/* Report Issue Modal - Lazy loaded */}
            {isReportModalOpen && (
                <Suspense fallback={<div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}><LoadingSpinner /></div>}>
                    <ReportIssueModal
                        isOpen={isReportModalOpen}
                        onClose={handleCloseReportModal}
                        businessId={business._id}
                        businessName={business.businessName}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default BusinessDetailPage;
