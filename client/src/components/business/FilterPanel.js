// client/src/components/business/FilterPanel.js
import React from "react";
import { useQuery } from "@tanstack/react-query";
import businessService from "../../services/businessService";
import "../../styles/components.css";

const FilterPanel = ({ filters, onFilterChange }) => {
    // Fetch categories and cities
    const { data: categories = [] } = useQuery({
        queryKey: ["categories"],
        queryFn: businessService.getCategories,
    });

    const { data: cities = [] } = useQuery({
        queryKey: ["cities"],
        queryFn: businessService.getCities,
    });

    const handleFilterChange = (filterType, value) => {
        onFilterChange({
            ...filters,
            [filterType]: value,
        });
    };

    return (
        <div className="filter-panel">
            <h3>Filters</h3>

            {/* Category Filter */}
            <div className="filter-group">
                <label>Category:</label>
                <select
                    value={filters.category || ""}
                    onChange={(e) =>
                        handleFilterChange("category", e.target.value)
                    }
                >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                        <option key={category._id} value={category.name}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* City Filter */}
            <div className="filter-group">
                <label>City:</label>
                <select
                    value={filters.city || ""}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                >
                    <option value="">All Cities</option>
                    {cities.map((city) => (
                        <option key={city} value={city}>
                            {city}
                        </option>
                    ))}
                </select>
            </div>

            {/* Verified Filter */}
            <div className="filter-group">
                <label>Status:</label>
                <select
                    value={filters.verified || ""}
                    onChange={(e) =>
                        handleFilterChange("verified", e.target.value)
                    }
                >
                    <option value="">All Businesses</option>
                    <option value="true">Verified Only</option>
                    <option value="false">Unverified Only</option>
                </select>
            </div>

            {/* Clear Filters */}
            <button
                className="clear-filters-btn"
                onClick={() => onFilterChange({})}
            >
                Clear All Filters
            </button>
        </div>
    );
};

export default FilterPanel;
