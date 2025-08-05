// client/src/pages/HomePage.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SearchBar from "../components/common/SearchBar";
import StickySearchWrapper from "../components/common/StickySearchWrapper";
import FullScreenFilterModal from "../components/business/FullScreenFilterModal";
import FilterPanel from "../components/business/FilterPanel";
import BusinessList from "../components/business/BusinessList";
import "../styles/pages.css";

const HomePage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [isMobile, setIsMobile] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isSticky, setIsSticky] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Helper function to parse URL parameters into state
    const parseUrlParams = () => {
        const urlParams = new URLSearchParams(location.search);
        const parsedFilters = {};
        const parsedSearchTerm = urlParams.get('search') || '';

        // Parse categories
        const categories = urlParams.get('categories');
        if (categories) {
            parsedFilters.categories = categories.split(',');
        }

        // Parse cities
        const cities = urlParams.get('cities');
        if (cities) {
            parsedFilters.cities = cities.split(',');
        }

        // Parse business types
        const businessTypes = urlParams.get('businessTypes');
        if (businessTypes) {
            parsedFilters.businessTypes = businessTypes.split(',');
        }

        // Parse verified filter
        const verified = urlParams.get('verified');
        if (verified === 'true') {
            parsedFilters.verified = true;
        }

        return { parsedFilters, parsedSearchTerm };
    };

    // Helper function to update URL with current state
    const updateUrl = (newSearchTerm, newFilters) => {
        const urlParams = new URLSearchParams();

        // Add search term
        if (newSearchTerm) {
            urlParams.set('search', newSearchTerm);
        }

        // Add filters
        if (newFilters.categories?.length) {
            urlParams.set('categories', newFilters.categories.join(','));
        }
        if (newFilters.cities?.length) {
            urlParams.set('cities', newFilters.cities.join(','));
        }
        if (newFilters.businessTypes?.length) {
            urlParams.set('businessTypes', newFilters.businessTypes.join(','));
        }
        if (newFilters.verified) {
            urlParams.set('verified', 'true');
        }

        // Update URL without triggering a page reload
        const newUrl = urlParams.toString() ? `/?${urlParams.toString()}` : '/';
        navigate(newUrl, { replace: true });
    };

    // Initialize state from URL parameters on component mount
    useEffect(() => {
        const { parsedFilters, parsedSearchTerm } = parseUrlParams();
        setSearchTerm(parsedSearchTerm);
        setFilters(parsedFilters);
    }, []);

    // Check screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Handle sticky behavior and hero fade
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const shouldBeSticky = scrollY > 200;

            if (shouldBeSticky !== isSticky) {
                setIsSticky(shouldBeSticky);

                // Add/remove fade class to hero section
                const heroSection = document.querySelector(".hero-section");
                if (heroSection) {
                    if (shouldBeSticky) {
                        heroSection.classList.add("fade-out");
                    } else {
                        heroSection.classList.remove("fade-out");
                    }
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [isSticky]);

    // Reset search and filters when navigating to home page
    useEffect(() => {
        if (location.state?.resetSearch) {
            setSearchTerm("");
            setFilters({});
        }
    }, [location]);

    // Handle filter changes
    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        updateUrl(searchTerm, newFilters);

        if (process.env.NODE_ENV === "development") {
            console.log("Filter changed:", newFilters);
        }
    };

    // Handle search term changes
    const handleSearchChange = (newSearchTerm) => {
        setSearchTerm(newSearchTerm);
        updateUrl(newSearchTerm, filters);
    };

    // Function to reset search and filters
    const resetToMainPage = () => {
        setSearchTerm("");
        setFilters({});
        updateUrl("", {});
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

    // Handle filter modal
    const handleFilterToggle = () => {
        setIsFilterModalOpen(true);
    };

    const handleFilterModalClose = () => {
        setIsFilterModalOpen(false);
    };

    const handleApplyFilters = () => {
        // Filters are already applied through handleFilterChange
        // This is just for closing the modal
    };

    return (
        <div className="home-page">
            {/* Sticky Search Wrapper */}
            <StickySearchWrapper
                searchTerm={searchTerm}
                onSearch={handleSearchChange}
                onReset={resetToMainPage}
                onFilterToggle={handleFilterToggle}
                activeFilterCount={getActiveFilterCount()}
            />

            {/* Full-Screen Filter Modal */}
            <FullScreenFilterModal
                isOpen={isFilterModalOpen}
                onClose={handleFilterModalClose}
                filters={filters}
                onFilterChange={handleFilterChange}
                onApplyFilters={handleApplyFilters}
            />

            <div className="container">
                <div className="hero-section">
                    <h1>Your Business Directory</h1>
                    <p>Find renovation businesses in your area</p>
                    <SearchBar
                        onSearch={handleSearchChange}
                        searchTerm={searchTerm}
                        onReset={resetToMainPage}
                    />
                </div>

                <div className="content-section">
                    {/* Desktop Sidebar Filter */}
                    {!isMobile && (
                        <div className="sidebar">
                            <FilterPanel
                                filters={filters}
                                onFilterChange={handleFilterChange}
                            />
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="main-content">
                        <BusinessList
                            searchTerm={searchTerm}
                            filters={filters}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
