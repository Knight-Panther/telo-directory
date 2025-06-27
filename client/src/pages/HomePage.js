// client/src/pages/HomePage.js - REPLACE ENTIRE FILE
import React, { useState, useEffect } from "react";
import SearchBar from "../components/common/SearchBar";
import FilterPanel from "../components/business/FilterPanel";
import MobileFilterWrapper from "../components/business/MobileFilterWrapper";
import BusinessList from "../components/business/BusinessList";
import "../styles/pages.css";

const HomePage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [isMobile, setIsMobile] = useState(false);

    // Check screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Handle filter changes with proper data structure
    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);

        // Debug logging for development
        if (process.env.NODE_ENV === "development") {
            console.log("Filter changed:", newFilters);
        }
    };

    return (
        <div className="home-page">
            <div className="container">
                <div className="hero-section">
                    <h1>Business Directory</h1>
                    <p>Find renovation businesses in your area</p>
                    <SearchBar onSearch={setSearchTerm} />
                </div>

                <div className="content-section">
                    {/* Desktop Sidebar */}
                    {!isMobile && (
                        <aside className="sidebar">
                            <FilterPanel
                                filters={filters}
                                onFilterChange={handleFilterChange}
                            />
                        </aside>
                    )}

                    <main className="main-content">
                        {/* Mobile Filter Panel */}
                        {isMobile && (
                            <MobileFilterWrapper
                                filters={filters}
                                onFilterChange={handleFilterChange}
                            />
                        )}

                        {/* Business List */}
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
