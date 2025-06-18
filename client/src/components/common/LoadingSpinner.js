// client/src/components/common/LoadingSpinner.js
import React from "react";
import "../../styles/components.css";

const LoadingSpinner = ({ size = "medium" }) => {
    return (
        <div className={`loading-spinner ${size}`}>
            <div className="spinner"></div>
        </div>
    );
};

export default LoadingSpinner;
