// client/src/components/business/BusinessCard.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import LazyImage from "../common/LazyImage";
import ReportIssueModal from "../modals/ReportIssueModal"; // NEW: Added for report functionality
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

    // NEW: State for report issue modal
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // Handle image loading error
    const handleImageError = (e) => {
        e.target.src = "/placeholder-business.png";
    };

    // NEW: Handler functions for report issue modal
    const handleReportIssue = (e) => {
        e.preventDefault(); // Prevent navigation when clicking report
        e.stopPropagation(); // Prevent event bubbling
        setIsReportModalOpen(true);
    };

    const handleCloseReportModal = () => {
        setIsReportModalOpen(false);
    };

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
                    {/* NEW: Modified business-name section with report button */}
                    <div className="business-name-header">
                        <h3 className="business-name">
                            <Link to={`/business/${_id}`}>{businessName}</Link>
                        </h3>
                        <button
                            className="report-btn-small"
                            onClick={handleReportIssue}
                            title="Report an issue with this listing"
                            aria-label={`Report issue with ${businessName}`}
                        >
                            🚩
                        </button>
                    </div>

                    <div className="business-meta">
                        <span className="category">{category}</span>
                        <span className="type">{businessType}</span>
                        <span className="city">{city}</span>
                    </div>

                    {shortDescription && (
                        <p className="description">{shortDescription}</p>
                    )}

                    <div className="business-contact">
                        <span className="mobile">{mobile}</span>
                    </div>

                    {/* Social Links */}
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

            {/* NEW: Report Issue Modal */}
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
