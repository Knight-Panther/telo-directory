// client/src/pages/BusinessDetailPage.js
import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import businessService from "../services/businessService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import "../styles/pages.css";

const BusinessDetailPage = () => {
    const { id } = useParams();

    const {
        data: business,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["business", id],
        queryFn: () => businessService.getBusiness(id),
    });

    if (isLoading) return <LoadingSpinner size="large" />;

    if (isError) {
        return (
            <div className="container">
                <div className="error-message">
                    <p>Error loading business: {error.message}</p>
                    <Link to="/">← Back to Home</Link>
                </div>
            </div>
        );
    }

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

    return (
        <div className="business-detail-page">
            <div className="container">
                <div className="back-link">
                    <Link to="/">← Back to Directory</Link>
                </div>

                <div className="business-detail">
                    <div className="business-header">
                        <div className="business-image-large">
                            {business.profileImage ? (
                                <img
                                    src={`http://localhost:3000${business.profileImage}`}
                                    alt={business.businessName}
                                />
                            ) : (
                                <div className="image-placeholder-large">
                                    <span>
                                        {business.businessName.charAt(0)}
                                    </span>
                                </div>
                            )}
                            {business.verified && (
                                <span className="verified-badge-large">
                                    ✓ Verified
                                </span>
                            )}
                        </div>

                        <div className="business-info-large">
                            <h1>{business.businessName}</h1>
                            <div className="business-meta-large">
                                <span className="category">
                                    {business.category}
                                </span>
                                <span className="type">
                                    {business.businessType}
                                </span>
                                <span className="city">{business.city}</span>
                            </div>

                            {business.shortDescription && (
                                <p className="description-large">
                                    {business.shortDescription}
                                </p>
                            )}

                            <div className="contact-info">
                                <h3>Contact Information</h3>
                                <p>
                                    <strong>Mobile:</strong> {business.mobile}
                                </p>
                                <p>
                                    <strong>Business ID:</strong>{" "}
                                    {business.businessId}
                                </p>
                            </div>

                            {/* Social Links */}
                            {(business.socialLinks?.facebook ||
                                business.socialLinks?.instagram ||
                                business.socialLinks?.tiktok) && (
                                <div className="social-section">
                                    <h3>Social Media</h3>
                                    <div className="social-links-large">
                                        {business.socialLinks.facebook && (
                                            <a
                                                href={
                                                    business.socialLinks
                                                        .facebook
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Facebook
                                            </a>
                                        )}
                                        {business.socialLinks.instagram && (
                                            <a
                                                href={
                                                    business.socialLinks
                                                        .instagram
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Instagram
                                            </a>
                                        )}
                                        {business.socialLinks.tiktok && (
                                            <a
                                                href={
                                                    business.socialLinks.tiktok
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                TikTok
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessDetailPage;
