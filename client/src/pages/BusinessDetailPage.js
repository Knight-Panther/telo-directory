// client/src/pages/BusinessDetailPage.js
import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import businessService from "../services/businessService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import "../styles/pages.css";
import LazyImage from "../components/common/LazyImage";

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
        // client/src/pages/BusinessDetailPage.js - UPDATE IMAGE SECTION ONLY
        // Find the business-image-large section (around line 45) and replace with:

        <div className="business-image-large">
            {business.profileImage ? (
                <LazyImage
                    src={`http://localhost:3000${business.profileImage}`}
                    alt={business.businessName}
                    style={{ borderRadius: "8px" }}
                    placeholder={
                        <div className="image-placeholder-large">
                            <span>{business.businessName.charAt(0)}</span>
                        </div>
                    }
                />
            ) : (
                <div className="image-placeholder-large">
                    <span>{business.businessName.charAt(0)}</span>
                </div>
            )}
            {business.verified && (
                <span className="verified-badge-large">✓ Verified</span>
            )}
        </div>
    );
};

export default BusinessDetailPage;
