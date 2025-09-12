// client/src/components/common/LoadingSpinner.js
import React from "react";
// CSS loaded at page level - removed duplicate import

const LoadingSpinner = ({ size = "medium", className = "", text = null }) => {
    return (
        <div className={`loading-spinner ${size} ${className}`}>
            <div className="spinner" aria-label="Loading..."></div>
            {text && <p>{text}</p>}
        </div>
    );
};

export default LoadingSpinner;
