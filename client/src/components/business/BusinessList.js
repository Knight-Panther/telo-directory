// client/src/components/business/BusinessList.js - REPLACE ENTIRE FILE
import React, { useState, useEffect, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import businessService from "../../services/businessService";
import BusinessCard from "./BusinessCard";
import LoadingSpinner from "../common/LoadingSpinner";
// CSS loaded at page level - removed duplicate import

const BusinessList = ({ searchTerm, filters }) => {
    const [businesses, setBusinesses] = useState([]);

    // Transform filters for API call
    const apiFilters = {
        search: searchTerm,
        categories: filters.categories,
        cities: filters.cities,
        businessTypes: filters.businessTypes,
        verified: filters.verified,
    };

    // Infinite query for businesses
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
        refetch,
    } = useInfiniteQuery({
        queryKey: ["businesses", searchTerm, filters],
        queryFn: ({ pageParam = 1 }) =>
            businessService.getBusinesses({
                page: pageParam,
                limit: 12,
                ...apiFilters,
            }),
        getNextPageParam: (lastPage) => {
            return lastPage.pagination.hasNext
                ? lastPage.pagination.currentPage + 1
                : undefined;
        },
        // Keep previous data while refetching
        keepPreviousData: true,
    });

    // Flatten all pages into single businesses array
    useEffect(() => {
        if (data) {
            const allBusinesses = data.pages.flatMap((page) => page.businesses);
            setBusinesses(allBusinesses);
        }
    }, [data]);

    // Infinite scroll handler
    const handleScroll = useCallback(() => {
        if (
            window.innerHeight + document.documentElement.scrollTop >=
                document.documentElement.offsetHeight - 1000 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    // Attach scroll listener
    useEffect(() => {
        const throttledScroll = throttle(handleScroll, 200);
        window.addEventListener("scroll", throttledScroll);
        return () => window.removeEventListener("scroll", throttledScroll);
    }, [handleScroll]);

    // Throttle function for scroll performance
    const throttle = (func, delay) => {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();

            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    };

    // Count active filters for display
    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.categories?.length) count += filters.categories.length;
        if (filters.cities?.length) count += filters.cities.length;
        if (filters.businessTypes?.length)
            count += filters.businessTypes.length;
        if (filters.verified) count += 1;
        return count;
    };

    // Get filter summary for display
    const getFilterSummary = () => {
        const parts = [];
        if (searchTerm) parts.push(`"${searchTerm}"`);
        if (filters.categories?.length) {
            parts.push(
                `${filters.categories.length} categor${
                    filters.categories.length === 1 ? "y" : "ies"
                }`
            );
        }
        if (filters.cities?.length) {
            parts.push(
                `${filters.cities.length} cit${
                    filters.cities.length === 1 ? "y" : "ies"
                }`
            );
        }
        if (filters.businessTypes?.length) {
            parts.push(
                `${filters.businessTypes.length} business type${
                    filters.businessTypes.length === 1 ? "" : "s"
                }`
            );
        }
        if (filters.verified) {
            parts.push(
                filters.verified === "true"
                    ? "verified only"
                    : "unverified only"
            );
        }
        return parts.join(", ");
    };

    const activeFilterCount = getActiveFilterCount();
    const filterSummary = getFilterSummary();
    const totalResults = data?.pages?.[0]?.pagination?.totalBusinesses || 0;

    if (isLoading) return <LoadingSpinner size="large" />;

    if (isError) {
        return (
            <div className="error-message">
                <p>Error loading businesses: {error.message}</p>
                <button onClick={() => refetch()}>Try Again</button>
            </div>
        );
    }

    return (
        <div className="business-list">
            {/* Skip link for screen readers */}
            <a href="#business-grid" className="sr-only-focusable skip-to-content">
                Skip to business listings
            </a>

            {/* Announce results to screen readers */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {isLoading
                    ? "Loading businesses..."
                    : `${totalResults} business${totalResults === 1 ? "" : "es"} found`
                }
            </div>

            {/* Results Header */}
            <div className="results-header">
                <div className="results-info">
                    <h2>
                        {totalResults === 0
                            ? "No businesses found"
                            : `${totalResults} business${
                                  totalResults === 1 ? "" : "es"
                              } found`}
                    </h2>
                    {filterSummary && (
                        <p className="filter-summary">
                            Filtered by: {filterSummary}
                        </p>
                    )}
                </div>

                {activeFilterCount > 0 && (
                    <div className="active-filters-count">
                        <span className="filter-badge">
                            {activeFilterCount} active filter
                            {activeFilterCount === 1 ? "" : "s"}
                        </span>
                    </div>
                )}
            </div>

            {/* Business Grid */}
            {businesses.length === 0 ? (
                <div className="no-results">
                    <div className="no-results-icon">🔍</div>
                    <h3>No businesses found</h3>
                    <p>
                        {searchTerm || activeFilterCount > 0
                            ? "Try adjusting your search criteria or filters"
                            : "No businesses have been added yet"}
                    </p>
                    {activeFilterCount > 0 && (
                        <button
                            className="clear-filters-suggestion"
                            onClick={() => window.location.reload()} // Simple approach, could be improved
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Main content with proper landmark */}
                    <main id="business-grid" role="main" tabIndex="-1">
                        <div className="business-grid" role="list">
                            {businesses.map((business) => (
                                <div key={business._id} role="listitem">
                                    <BusinessCard business={business} />
                                </div>
                            ))}
                        </div>
                    </main>

                    {/* Loading indicator for infinite scroll */}
                    {isFetchingNextPage && (
                        <div className="loading-more">
                            <LoadingSpinner />
                            <p>Loading more businesses...</p>
                            <div
                                role="status"
                                aria-live="polite"
                                className="sr-only"
                            >
                                Loading more business results...
                            </div>
                        </div>
                    )}

                    {/* End of results message */}
                    {!hasNextPage && businesses.length > 0 && (
                        <div className="end-message">
                            <p>
                                You've seen all {totalResults} business
                                {totalResults === 1 ? "" : "es"}.
                                {filterSummary &&
                                    " Try adjusting your filters to see more results."}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default BusinessList;
