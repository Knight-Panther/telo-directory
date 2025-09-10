import React from "react";
import LoadingSpinner from "./LoadingSpinner";

const PageLoadingSpinner = () => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            <LoadingSpinner />
            <p style={{ color: '#666', fontSize: '14px' }}>Loading page...</p>
        </div>
    );
};

export default PageLoadingSpinner;