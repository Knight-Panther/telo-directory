// client/src/components/business/FilterPanel.js - CORRECTED VERSION
import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import businessService from "../../services/businessService";
// REMOVED: Heavy components.css - using optimized components-filters.css instead
import "../../styles/components-filters.css";

const FilterPanel = ({ filters, onFilterChange, isMobile = false }) => {
    const [openDropdown, setOpenDropdown] = useState(null);
    const dropdownRefs = useRef({});
    // Search state for dropdowns
    const [categorySearch, setCategorySearch] = useState("");
    const [citySearch, setCitySearch] = useState("");

    // Fetch categories and cities
    const { data: categories = [] } = useQuery({
        queryKey: ["categories"],
        queryFn: businessService.getCategories,
    });

    const { data: cities = [] } = useQuery({
        queryKey: ["cities"],
        queryFn: businessService.getCities,
    });

    // Business type options
    const businessTypes = [
        { value: "individual", label: "Individual" },
        { value: "company", label: "Company" },
    ];

    // Status options (keeping single select)
    const statusOptions = [
        { value: "true", label: "Verified" },
        { value: "false", label: "Unverified" },
    ];

    // Handle clicking outside dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                openDropdown &&
                dropdownRefs.current[openDropdown] &&
                !dropdownRefs.current[openDropdown].contains(event.target)
            ) {
                setOpenDropdown(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [openDropdown]);

    // Multi-select handlers
    const handleMultiSelectToggle = (filterType, value) => {
        const currentValues = filters[filterType] || [];
        const newValues = currentValues.includes(value)
            ? currentValues.filter((v) => v !== value)
            : [...currentValues, value];

        onFilterChange({
            ...filters,
            [filterType]: newValues.length > 0 ? newValues : undefined,
        });
    };

    // Single select handler (for status)
    const handleSingleSelect = (filterType, value) => {
        onFilterChange({
            ...filters,
            [filterType]: value || undefined,
        });
        setOpenDropdown(null);
    };

    // Remove single tag
    const removeTag = (filterType, value) => {
        if (Array.isArray(filters[filterType])) {
            const newValues = filters[filterType].filter((v) => v !== value);
            onFilterChange({
                ...filters,
                [filterType]: newValues.length > 0 ? newValues : undefined,
            });
        } else {
            onFilterChange({
                ...filters,
                [filterType]: undefined,
            });
        }
    };

    // Clear all filters
    const clearAllFilters = () => {
        onFilterChange({});
        // Reset search terms when clearing filters
        setCategorySearch("");
        setCitySearch("");
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

    // Filter functions for search
    const filterCategories = (categories) => {
        if (!categorySearch.trim()) return categories;
        return categories.filter((cat) =>
            cat.name.toLowerCase().includes(categorySearch.toLowerCase())
        );
    };

    const filterCities = (cities) => {
        if (!citySearch.trim()) return cities;
        return cities.filter((city) =>
            city.toLowerCase().includes(citySearch.toLowerCase())
        );
    };

    // Enhanced dropdown with search capability
    const renderMultiSelectDropdown = (
        filterType,
        options,
        currentValues = [],
        searchTerm = "",
        setSearchTerm = null
    ) => {
        return (
            <div className="dropdown-content">
                {/* Search input for categories and cities */}
                {(filterType === "categories" || filterType === "cities") && (
                    <div className="dropdown-search">
                        <input
                            type="text"
                            placeholder={`Search ${filterType}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="dropdown-search-input"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {/* Options */}
                {options.map((option) => {
                    // FIXED: Handle different data structures correctly
                    const value =
                        typeof option === "string"
                            ? option
                            : option.name || option.value; // Use name for categories, value for others
                    const label =
                        typeof option === "string"
                            ? option
                            : option.name || option.label; // Use name for categories, label for others
                    const isSelected = currentValues.includes(value);

                    return (
                        <div
                            key={value}
                            className={`dropdown-option ${
                                isSelected ? "selected" : ""
                            }`}
                            onClick={() =>
                                handleMultiSelectToggle(filterType, value)
                            }
                        >
                            <div className="checkbox-wrapper">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="modern-checkbox"
                                />
                                <span className="checkmark"></span>
                            </div>
                            <span className="option-label">{label}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Render single select dropdown
    const renderSingleSelectDropdown = (filterType, options, currentValue) => {
        return (
            <div className="dropdown-content">
                <div
                    className={`dropdown-option ${
                        !currentValue ? "selected" : ""
                    }`}
                    onClick={() => handleSingleSelect(filterType, "")}
                >
                    <div className="radio-wrapper">
                        <input
                            type="radio"
                            checked={!currentValue}
                            onChange={() => {}}
                            className="modern-radio"
                        />
                        <span className="radiomark"></span>
                    </div>
                    <span className="option-label">All Businesses</span>
                </div>
                {options.map((option) => {
                    const value =
                        typeof option === "string" ? option : option.value;
                    const label =
                        typeof option === "string" ? option : option.label;
                    const isSelected = currentValue === value;

                    return (
                        <div
                            key={value}
                            className={`dropdown-option ${
                                isSelected ? "selected" : ""
                            }`}
                            onClick={() =>
                                handleSingleSelect(filterType, value)
                            }
                        >
                            <div className="radio-wrapper">
                                <input
                                    type="radio"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="modern-radio"
                                />
                                <span className="radiomark"></span>
                            </div>
                            <span className="option-label">{label}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Render tags
    const renderTags = (filterType, values, getDisplayName = (v) => v) => {
        if (!values || values.length === 0) return null;

        const valuesArray = Array.isArray(values) ? values : [values];

        return (
            <div className="tags-container">
                {valuesArray.map((value) => (
                    <span key={value} className="filter-tag">
                        <span className="tag-text">
                            {getDisplayName(value)}
                        </span>
                        <button
                            className="tag-remove"
                            onClick={() => removeTag(filterType, value)}
                            aria-label={`Remove ${getDisplayName(
                                value
                            )} filter`}
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
        );
    };

    // Get display name for business type
    const getBusinessTypeLabel = (value) => {
        const type = businessTypes.find((t) => t.value === value);
        return type ? type.label : value;
    };

    // Get display name for status
    const getStatusLabel = (value) => {
        const status = statusOptions.find((s) => s.value === value);
        return status
            ? status.label
            : value === "true"
            ? "Verified"
            : "Unverified";
    };

    const activeFilterCount = getActiveFilterCount();

    return (
        <div className={`filter-panel ${isMobile ? "mobile" : ""}`}>
            <div className="filter-header">
                <h3>Filters</h3>
                {activeFilterCount > 0 && (
                    <span className="filter-count">{activeFilterCount}</span>
                )}
            </div>

            {/* Categories Filter */}
            <div className="filter-group">
                <label>Categories:</label>
                <div
                    className="dropdown-wrapper"
                    ref={(el) => (dropdownRefs.current.categories = el)}
                >
                    <button
                        className={`dropdown-trigger ${
                            openDropdown === "categories" ? "open" : ""
                        }`}
                        onClick={() =>
                            setOpenDropdown(
                                openDropdown === "categories"
                                    ? null
                                    : "categories"
                            )
                        }
                    >
                        <span>Select Categories</span>
                        <span className="dropdown-arrow">▼</span>
                    </button>

                    {openDropdown === "categories" &&
                        renderMultiSelectDropdown(
                            "categories",
                            filterCategories(categories),
                            filters.categories || [],
                            categorySearch,
                            setCategorySearch
                        )}
                </div>

                {renderTags("categories", filters.categories)}
            </div>

            {/* Cities Filter */}
            <div className="filter-group">
                <label>Cities:</label>
                <div
                    className="dropdown-wrapper"
                    ref={(el) => (dropdownRefs.current.cities = el)}
                >
                    <button
                        className={`dropdown-trigger ${
                            openDropdown === "cities" ? "open" : ""
                        }`}
                        onClick={() =>
                            setOpenDropdown(
                                openDropdown === "cities" ? null : "cities"
                            )
                        }
                    >
                        <span>Select Cities</span>
                        <span className="dropdown-arrow">▼</span>
                    </button>

                    {openDropdown === "cities" &&
                        renderMultiSelectDropdown(
                            "cities",
                            filterCities(cities),
                            filters.cities || [],
                            citySearch,
                            setCitySearch
                        )}
                </div>

                {renderTags("cities", filters.cities)}
            </div>

            {/* Business Type Filter */}
            <div className="filter-group">
                <label>Business Type:</label>
                <div
                    className="dropdown-wrapper"
                    ref={(el) => (dropdownRefs.current.businessTypes = el)}
                >
                    <button
                        className={`dropdown-trigger ${
                            openDropdown === "businessTypes" ? "open" : ""
                        }`}
                        onClick={() =>
                            setOpenDropdown(
                                openDropdown === "businessTypes"
                                    ? null
                                    : "businessTypes"
                            )
                        }
                    >
                        <span>Select Type</span>
                        <span className="dropdown-arrow">▼</span>
                    </button>

                    {openDropdown === "businessTypes" &&
                        renderMultiSelectDropdown(
                            "businessTypes",
                            businessTypes,
                            filters.businessTypes || []
                        )}
                </div>

                {renderTags(
                    "businessTypes",
                    filters.businessTypes,
                    getBusinessTypeLabel
                )}
            </div>

            {/* Status Filter (Single Select) */}
            <div className="filter-group">
                <label>Status:</label>
                <div
                    className="dropdown-wrapper"
                    ref={(el) => (dropdownRefs.current.verified = el)}
                >
                    <button
                        className={`dropdown-trigger ${
                            openDropdown === "verified" ? "open" : ""
                        }`}
                        onClick={() =>
                            setOpenDropdown(
                                openDropdown === "verified" ? null : "verified"
                            )
                        }
                    >
                        <span>
                            {filters.verified
                                ? getStatusLabel(filters.verified)
                                : "All Businesses"}
                        </span>
                        <span className="dropdown-arrow">▼</span>
                    </button>

                    {openDropdown === "verified" &&
                        renderSingleSelectDropdown(
                            "verified",
                            statusOptions,
                            filters.verified
                        )}
                </div>

                {filters.verified &&
                    renderTags("verified", filters.verified, getStatusLabel)}
            </div>

            {/* Clear All Filters */}
            {activeFilterCount > 0 && (
                <button className="clear-filters-btn" onClick={clearAllFilters}>
                    Clear All Filters ({activeFilterCount})
                </button>
            )}
        </div>
    );
};

export default FilterPanel;
