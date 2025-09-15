// client/src/components/common/StickySearchWrapper.js
import React, { useState, useEffect, useRef } from "react";
import SearchBar from "./SearchBar";
// CSS loaded at page level - removed duplicate import

const StickySearchWrapper = ({
    searchTerm,
    onSearch,
    onReset,
    onFilterToggle,
    activeFilterCount = 0,
}) => {
    const [isSticky, setIsSticky] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isScrollingUp, setIsScrollingUp] = useState(false);
    const lastScrollY = useRef(0);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const shouldBeSticky = scrollY > 200; // Trigger after 200px scroll

            // Detect scroll direction
            const scrollingUp = scrollY < lastScrollY.current && scrollY > 100;
            const scrollingDown = scrollY > lastScrollY.current;

            if (shouldBeSticky !== isSticky) {
                setIsSticky(shouldBeSticky);
            }

            // Show collapsed button only when scrolling up
            if (shouldBeSticky) {
                if (scrollingUp && !isScrollingUp) {
                    setIsScrollingUp(true);
                    setIsExpanded(false);
                } else if (scrollingDown && isScrollingUp) {
                    setIsScrollingUp(false);
                    setIsExpanded(false);
                }
            } else {
                setIsScrollingUp(false);
                setIsExpanded(false);
            }

            lastScrollY.current = scrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [isSticky, isScrollingUp]);

    // Handle click outside to collapse
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        };

        if (isExpanded) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isExpanded]);

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div
            ref={wrapperRef}
            className={`sticky-search-wrapper ${isSticky && isScrollingUp ? "is-sticky" : ""} ${isExpanded ? "is-expanded" : ""}`}
        >
            <div className="sticky-search-container">
                {!isExpanded ? (
                    // Collapsed state - just a search button
                    <div className="sticky-search-collapsed">
                        <button
                            className="sticky-search-toggle-btn"
                            onClick={handleToggleExpand}
                            title="Open search"
                        >
                            <span className="search-icon">🔍</span>
                        </button>
                    </div>
                ) : (
                    // Expanded state - full search bar
                    <div className="sticky-search-content">
                        <SearchBar
                            searchTerm={searchTerm}
                            onSearch={onSearch}
                            onReset={onReset}
                            isSticky={isSticky}
                            placeholder="Search businesses..."
                        />

                        <button
                            className="filter-toggle-btn"
                            onClick={onFilterToggle}
                            title="Open filters"
                        >
                            <span className="filter-icon">⚙️</span>
                            <span className="filter-text">Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="filter-badge">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        <button
                            className="sticky-search-close-btn"
                            onClick={handleToggleExpand}
                            title="Collapse search"
                        >
                            <span>✕</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StickySearchWrapper;
