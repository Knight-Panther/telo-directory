// client/src/components/common/SearchBar.js
import React, { useState, useEffect } from "react";
import "../../styles/components.css";

const SearchBar = ({
    onSearch,
    searchTerm: externalSearchTerm = "",
    placeholder = "Search businesses...",
    onReset,
    isSticky = false,
}) => {
    const [searchTerm, setSearchTerm] = useState(externalSearchTerm);

    // Sync with external search term (when parent resets)
    useEffect(() => {
        setSearchTerm(externalSearchTerm);
    }, [externalSearchTerm]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(searchTerm);
    };

    const handleChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleClear = () => {
        setSearchTerm("");
        onSearch("");
        if (onReset) onReset();
    };

    return (
        <form
            className={`search-bar ${isSticky ? "search-bar-sticky" : ""}`}
            onSubmit={handleSubmit}
        >
            <div className="search-input-wrapper">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="search-input"
                />

                {/* Show clear button if there's text */}
                {searchTerm && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="clear-button"
                        title="Clear search"
                    >
                        ✕
                    </button>
                )}
            </div>

            <button type="submit" className="search-button">
                <span className="search-icon">🔍</span>
                <span className="search-text">Search</span>
            </button>
        </form>
    );
};

export default SearchBar;
