// client/src/pages/HomePage.js
import React, { useState } from "react";
import SearchBar from "../components/common/SearchBar";
import FilterPanel from "../components/business/FilterPanel";
import BusinessList from "../components/business/BusinessList";
import "../styles/pages.css";

const HomePage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});

    return (
        <div className="home-page">
            <div className="container">
                <div className="hero-section">
                    <h1>Business Directory</h1>
                    <p>Find renovation businesses in your area</p>
                    <SearchBar onSearch={setSearchTerm} />
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
