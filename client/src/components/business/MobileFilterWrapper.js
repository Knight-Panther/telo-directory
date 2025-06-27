// client/src/components/business/MobileFilterWrapper.js - CREATE NEW FILE
import React, { useState, useEffect, useCallback } from "react";
import FilterPanel from "./FilterPanel";

const MobileFilterWrapper = ({ filters, onFilterChange }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile screen
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Smart scroll behavior for mobile
    const handleScroll = useCallback(() => {
        if (!isMobile) return;

        const currentScrollY = window.scrollY;

        // Auto-collapse when scrolling down past 100px
        if (currentScrollY > 100 && currentScrollY > lastScrollY) {
            setIsCollapsed(true);
        }

        setLastScrollY(currentScrollY);
    }, [isMobile, lastScrollY]);

    useEffect(() => {
        if (isMobile) {
            const throttledScroll = throttle(handleScroll, 100);
            window.addEventListener("scroll", throttledScroll);
            return () => window.removeEventListener("scroll", throttledScroll);
        }
    }, [isMobile, handleScroll]);

    // Throttle function
    const throttle = (func, delay) => {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();

            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    };

    // Count active filters
    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.categories?.length) count += filters.categories.length;
        if (filters.cities?.length) count += filters.cities.length;
        if (filters.businessTypes?.length)
            count += filters.businessTypes.length;
        if (filters.verified) count += 1;
        return count;
    };

    // Get preview tags (first 3 active filters)
    const getPreviewTags = () => {
        const tags = [];

        if (filters.categories?.length) {
            tags.push(
                ...filters.categories.slice(0, 2).map((cat) => ({
                    type: "category",
                    value: cat,
                    label: cat,
                }))
            );
        }

        if (filters.cities?.length && tags.length < 3) {
            const remaining = 3 - tags.length;
            tags.push(
                ...filters.cities
                    .slice(0, remaining)
                    .map((city) => ({ type: "city", value: city, label: city }))
            );
        }

        if (filters.businessTypes?.length && tags.length < 3) {
            const remaining = 3 - tags.length;
            const typeLabels = { individual: "Individual", company: "Company" };
            tags.push(
                ...filters.businessTypes.slice(0, remaining).map((type) => ({
                    type: "businessType",
                    value: type,
                    label: typeLabels[type] || type,
                }))
            );
        }

        if (filters.verified && tags.length < 3) {
            tags.push({
                type: "verified",
                value: filters.verified,
                label: filters.verified === "true" ? "Verified" : "Unverified",
            });
        }

        return tags;
    };

    const activeFilterCount = getActiveFilterCount();
    const previewTags = getPreviewTags();
    const hasMoreFilters = activeFilterCount > previewTags.length;

    // Don't render mobile wrapper on desktop
    if (!isMobile) {
        return (
            <FilterPanel filters={filters} onFilterChange={onFilterChange} />
        );
    }

    return (
        <div
            className={`filter-panel mobile ${isCollapsed ? "collapsed" : ""}`}
        >
            <div className="filter-header">
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                        }}
                    >
                        <h3>Filters</h3>
                        {activeFilterCount > 0 && (
                            <span className="filter-count">
                                {activeFilterCount}
                            </span>
                        )}
                    </div>

                    <button
                        className="mobile-toggle"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        aria-label={
                            isCollapsed ? "Show filters" : "Hide filters"
                        }
                    >
                        <span>{isCollapsed ? "Show" : "Hide"}</span>
                        <span
                            style={{
                                transform: isCollapsed
                                    ? "rotate(180deg)"
                                    : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                            }}
                        >
                            ▲
                        </span>
                    </button>
                </div>

                {/* Preview tags when collapsed */}
                {isCollapsed && activeFilterCount > 0 && (
                    <div className="filter-preview">
                        {previewTags.map((tag, index) => (
                            <span
                                key={`${tag.type}-${tag.value}-${index}`}
                                className="filter-tag"
                            >
                                <span className="tag-text">{tag.label}</span>
                            </span>
                        ))}
                        {hasMoreFilters && (
                            <span
                                className="filter-tag"
                                style={{ background: "#6c757d" }}
                            >
                                <span className="tag-text">
                                    +{activeFilterCount - previewTags.length}{" "}
                                    more
                                </span>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Full filter panel when expanded */}
            {!isCollapsed && (
                <>
                    <FilterPanel
                        filters={filters}
                        onFilterChange={onFilterChange}
                        isMobile={true}
                    />
                </>
            )}
        </div>
    );
};

export default MobileFilterWrapper;
