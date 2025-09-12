// client/src/components/business/FullScreenFilterModal.js
import React, { useEffect, useRef } from "react";
import FilterPanel from "./FilterPanel";
import "../../styles/components-filters.css";

const FullScreenFilterModal = ({
    isOpen,
    onClose,
    filters,
    onFilterChange,
    onApplyFilters,
}) => {
    const modalRef = useRef(null);

    // Handle escape key and backdrop click
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") onClose();
        };

        const handleBackdropClick = (e) => {
            if (modalRef.current && e.target === modalRef.current) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.addEventListener("click", handleBackdropClick);
            document.body.style.overflow = "hidden"; // Prevent background scroll
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.removeEventListener("click", handleBackdropClick);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleApply = () => {
        onApplyFilters();
        onClose();
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.categories?.length) count += filters.categories.length;
        if (filters.cities?.length) count += filters.cities.length;
        if (filters.businessTypes?.length)
            count += filters.businessTypes.length;
        if (filters.verified) count += 1;
        return count;
    };

    return (
        <div className="filter-modal-overlay" ref={modalRef}>
            <div className="filter-modal-content">
                {/* Modal Header */}
                <div className="filter-modal-header">
                    <div className="filter-modal-title">
                        <h2>Filter Businesses</h2>
                        <span className="filter-subtitle">
                            Find exactly what you're looking for
                        </span>
                    </div>
                    <button
                        className="filter-modal-close"
                        onClick={onClose}
                        title="Close filters"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="filter-modal-body">
                    <FilterPanel
                        filters={filters}
                        onFilterChange={onFilterChange}
                        isFullScreen={true}
                    />
                </div>

                {/* Modal Footer */}
                <div className="filter-modal-footer">
                    <div className="filter-modal-actions">
                        <button
                            className="filter-apply-btn"
                            onClick={handleApply}
                        >
                            Apply Filters
                            {getActiveFilterCount() > 0 && (
                                <span className="apply-count">
                                    ({getActiveFilterCount()})
                                </span>
                            )}
                        </button>
                        <button className="filter-clear-btn" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FullScreenFilterModal;
