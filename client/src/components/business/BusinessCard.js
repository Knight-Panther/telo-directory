// client/src/components/business/BusinessCard.js
import React from "react";
import { Link } from "react-router-dom";
import LazyImage from "../common/LazyImage";
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

    // Handle image loading error
    const handleImageError = (e) => {
        e.target.src = "/placeholder-business.png";
    };

    return (
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
                <h3 className="business-name">
                    <Link to={`/business/${_id}`}>{businessName}</Link>
                </h3>

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
    );
};

export default BusinessCard;
