// client/src/components/common/StickySearchWrapper.js
import React, { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import "../../styles/components.css";

const StickySearchWrapper = ({
    searchTerm,
    onSearch,
    onReset,
    onFilterToggle,
    activeFilterCount = 0,
}) => {
    const [isSticky, setIsSticky] = useState(false);
    const [heroHeight, setHeroHeight] = useState(0);

    useEffect(() => {
        const heroSection = document.querySelector(".hero-section");
        if (heroSection) {
            setHeroHeight(heroSection.offsetHeight);
        }

        const handleScroll = () => {
            const scrollY = window.scrollY;
            const shouldBeSticky = scrollY > 200; // Trigger after 200px scroll

            if (shouldBeSticky !== isSticky) {
                setIsSticky(shouldBeSticky);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [isSticky]);

    return (
        <div className={`sticky-search-wrapper ${isSticky ? "is-sticky" : ""}`}>
            <div className="sticky-search-container">
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
                </div>
            </div>
        </div>
    );
};

export default StickySearchWrapper;
