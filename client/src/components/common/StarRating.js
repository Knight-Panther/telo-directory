// client/src/components/common/StarRating.js
import React from "react";
import "./../../styles/components-core.css";

/**
 * StarRating Component - Booking.com Style Rating Display
 *
 * Features:
 * - 5-star visual display with partial fill capability
 * - Rating number display (like 8.5, 9.2, etc.)
 * - Responsive sizing for different screen sizes
 * - Booking.com style layout: Stars on left, rating on right
 * - Handles no rating state gracefully
 *
 * @param {number} rating - Rating value (0-10 scale, like booking.com)
 * @param {string} size - Size variant: 'small', 'medium', 'large'
 * @param {boolean} showNumber - Whether to show the numeric rating
 * @param {string} className - Additional CSS classes
 */
const StarRating = ({
    rating = null,
    size = "medium",
    showNumber = true,
    className = "",
}) => {
    // Convert 10-point scale to 5-star scale for visual display
    // rating 8.5 -> 4.25 stars filled
    const starRating = rating ? (rating / 10) * 5 : 0;

    // Create array of 5 stars with fill percentages
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        let fillPercentage = 0;

        if (starRating >= i) {
            fillPercentage = 100; // Fully filled star
        } else if (starRating > i - 1) {
            fillPercentage = (starRating - (i - 1)) * 100; // Partially filled star
        }

        stars.push({
            index: i,
            fillPercentage: Math.min(100, Math.max(0, fillPercentage)),
        });
    }

    // Format rating number for display
    const formatRating = (rating) => {
        if (!rating) return "--";
        return rating.toFixed(1);
    };

    // Get rating quality text based on score (like Booking.com)
    const getRatingQuality = (rating) => {
        if (!rating) return "";
        if (rating >= 9.0) return "Exceptional";
        if (rating >= 8.0) return "Excellent";
        if (rating >= 7.0) return "Very Good";
        if (rating >= 6.0) return "Good";
        if (rating >= 5.0) return "Average";
        return "Below Average";
    };

    return (
        <div className={`star-rating star-rating-${size} ${className}`}>
            <div className="stars-container">
                {stars.map((star) => (
                    <div key={star.index} className="star-wrapper">
                        <div className="star star-empty" aria-hidden="true">
                            ★
                        </div>
                        <div
                            className="star star-filled"
                            style={{ width: `${star.fillPercentage}%` }}
                            aria-hidden="true"
                        >
                            ★
                        </div>
                    </div>
                ))}
            </div>

            {showNumber && (
                <div className="rating-info">
                    <span className="rating-number">
                        {formatRating(rating)}
                    </span>
                    {rating && size !== "small" && (
                        <span className="rating-quality">
                            {getRatingQuality(rating)}
                        </span>
                    )}
                </div>
            )}

            {/* Screen reader accessibility */}
            <span className="sr-only">
                {rating
                    ? `Rating: ${formatRating(
                          rating
                      )} out of 10, ${getRatingQuality(rating)}`
                    : "No rating available"}
            </span>
        </div>
    );
};

export default StarRating;
