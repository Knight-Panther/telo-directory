// client/src/components/common/SearchBar.js - Enhanced with clear functionality
import React, { useState, useEffect } from "react";
import "../../styles/components.css";

const SearchBar = ({
    onSearch,
    searchTerm: externalSearchTerm = "",
    placeholder = "Search businesses...",
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
        // Optional: trigger search on each keystroke with debounce
        // onSearch(e.target.value);
    };

    const handleClear = () => {
        setSearchTerm("");
        onSearch(""); // Immediately trigger search with empty term
    };

    return (
        <form className="search-bar" onSubmit={handleSubmit}>
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

            <button type="submit" className="search-button">
                Search
            </button>
        </form>
    );
};

export default SearchBar;
