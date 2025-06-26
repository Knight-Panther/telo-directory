// client/src/pages/HomePage.js - Enhanced with navigation reset
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import SearchBar from "../components/common/SearchBar";
import FilterPanel from "../components/business/FilterPanel";
import BusinessList from "../components/business/BusinessList";
import "../styles/pages.css";

const HomePage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const location = useLocation();

    // Reset search and filters when navigating to home page
    useEffect(() => {
        // Check if we came from a navigation (not a page refresh)
        if (location.state?.resetSearch || location.key !== "default") {
            setSearchTerm("");
            setFilters({});
        }
    }, [location]);

    // Function to reset all search and filters
    const resetAll = () => {
        setSearchTerm("");
        setFilters({});
    };

    return (
        <div className="home-page">
            <div className="container">
                <div className="hero-section">
                    <h1>Business Directory</h1>
                    <p>Find renovation businesses in your area</p>
                    <SearchBar
                        onSearch={setSearchTerm}
                        searchTerm={searchTerm} // Pass current search term
                    />

                    {/* Add reset button if there are active searches/filters */}
                    {(searchTerm ||
                        Object.keys(filters).some((key) => filters[key])) && (
                        <div className="reset-section">
                            <button
                                onClick={resetAll}
                                className="reset-all-btn"
                            >
                                Clear All & Show All Businesses
                            </button>
                        </div>
                    )}
                </div>

                <div className="content-section">
                    <aside className="sidebar">
                        <FilterPanel
                            filters={filters}
                            onFilterChange={setFilters}
                        />
                    </aside>

                    <main className="main-content">
                        <BusinessList
                            searchTerm={searchTerm}
                            filters={filters}
                        />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
