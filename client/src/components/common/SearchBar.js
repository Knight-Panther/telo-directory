// client/src/components/common/SearchBar.js
import React, { useState } from "react";
import "../../styles/components.css";

const SearchBar = ({ onSearch, placeholder = "Search businesses..." }) => {
    const [searchTerm, setSearchTerm] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(searchTerm);
    };

    const handleChange = (e) => {
        setSearchTerm(e.target.value);
        // Optional: trigger search on each keystroke with debounce
        // onSearch(e.target.value);
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
            <button type="submit" className="search-button">
                Search
            </button>
        </form>
    );
};

export default SearchBar;
