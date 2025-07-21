// client/src/components/business/BusinessCard.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import LazyImage from "../common/LazyImage";
import StarRating from "../common/StarRating"; // Import StarRating component
import ReportIssueModal from "../modals/ReportIssueModal";
import "../../styles/components.css";

const BusinessCard = ({ business }) => {
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

    // State for report issue modal (PRESERVED)
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // State for favorites functionality
    const [isFavorited, setIsFavorited] = useState(false); // Placeholder state

    // Handle image loading error (PRESERVED)
    const handleImageError = (e) => {
        e.target.src = "/placeholder-business.png";
    };

    // Handler functions for report issue modal (PRESERVED)
    const handleReportIssue = (e) => {
        e.preventDefault(); // Prevent navigation when clicking report
        e.stopPropagation(); // Prevent event bubbling
        setIsReportModalOpen(true);
    };

    // Close modal handler (PRESERVED)
    const handleCloseReportModal = () => {
        setIsReportModalOpen(false);
    };

    // Favorite button handler
    const handleFavoriteClick = (e) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation(); // Prevent event bubbling
        setIsFavorited(!isFavorited);

        // Future implementation will save to favorites database
        if (process.env.NODE_ENV === "development") {
            console.log(
                `${
                    isFavorited ? "Removed from" : "Added to"
                } favorites: ${businessName}`
            );
        }
    };

    // Generate sample rating (will come from database later)
    // 70% chance of having a rating between 7-10, 30% no rating
    const sampleRating = Math.random() < 0.3 ? null : Math.random() * 3 + 7;

    return (
        <>
            <div className="business-card">
                <div className="business-image">
                    {profileImage ? (
                        <LazyImage
                            src={`http://localhost:3000${profileImage}`}
                            alt={businessName}
                            onError={handleImageError}
                            placeholder={
                                <div className="image-placeholder">
                                    <span>{businessName.charAt(0)}</span>
                                </div>
                            }
                        />
                    ) : (
                        <div className="image-placeholder">
                            <span>{businessName.charAt(0)}</span>
                        </div>
                    )}
                    {verified && <span className="verified-badge">✓</span>}
                </div>

                <div className="business-info">
                    {/* Enhanced business-name section with heart + report button */}
                    <div className="business-name-header">
                        <h3 className="business-name">
                            <Link to={`/business/${_id}`}>{businessName}</Link>
                        </h3>

                        {/* Icon group with heart and report buttons */}
                        <div className="icon-group">
                            <button
                                className={`favorite-btn-small ${
                                    isFavorited ? "favorited" : ""
                                }`}
                                onClick={handleFavoriteClick}
                                title={
                                    isFavorited
                                        ? "Remove from favorites"
                                        : "Add to favorites"
                                }
                                aria-label={`${
                                    isFavorited ? "Remove" : "Add"
                                } ${businessName} ${
                                    isFavorited ? "from" : "to"
                                } favorites`}
                            >
                                {isFavorited ? "❤️" : "🤍"}
                            </button>

                            {/* Report button (preserved with same functionality) */}
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

                    {/* Description (PRESERVED - no changes) */}
                    {shortDescription && (
                        <p className="description">{shortDescription}</p>
                    )}

                    {/*Contact section (PRESERVED - no changes) */}
                    <div className="business-contact">
                        <span className="mobile">{mobile}</span>
                    </div>

                    {/* Social Links (PRESERVED - no changes) */}
                    {(socialLinks?.facebook ||
                        socialLinks?.instagram ||
                        socialLinks?.tiktok) && (
                        <div className="social-links">
                            {socialLinks.facebook && (
                                <a
                                    href={socialLinks.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    FB
                                </a>
                            )}
                            {socialLinks.instagram && (
                                <a
                                    href={socialLinks.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    IG
                                </a>
                            )}
                            {socialLinks.tiktok && (
                                <a
                                    href={socialLinks.tiktok}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    TT
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Report Issue Modal (PRESERVED - no changes) */}
            <ReportIssueModal
                isOpen={isReportModalOpen}
                onClose={handleCloseReportModal}
                businessId={_id}
                businessName={businessName}
            />
        </>
    );
};

export default BusinessCard;
