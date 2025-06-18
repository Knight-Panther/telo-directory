// client/src/components/business/BusinessList.js
import React, { useState, useEffect, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import businessService from "../../services/businessService";
import BusinessCard from "./BusinessCard";
import LoadingSpinner from "../common/LoadingSpinner";
import "../../styles/components.css";

const BusinessList = ({ searchTerm, filters }) => {
    const [businesses, setBusinesses] = useState([]);

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
                search: searchTerm,
                ...filters,
            }),
        getNextPageParam: (lastPage) => {
            return lastPage.pagination.hasNext
                ? lastPage.pagination.currentPage + 1
                : undefined;
        },
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
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    if (isLoading) return <LoadingSpinner size="large" />;

    if (isError) {
        return (
            <div className="error-message">
                <p>Error loading businesses: {error.message}</p>
                <button onClick={() => refetch()}>Try Again</button>
            </div>
        );
    }

    if (businesses.length === 0) {
        return (
            <div className="no-results">
                <p>No businesses found matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className="business-list">
            <div className="business-grid">
                {businesses.map((business) => (
                    <BusinessCard key={business._id} business={business} />
                ))}
            </div>

            {isFetchingNextPage && <LoadingSpinner />}

            {!hasNextPage && businesses.length > 0 && (
                <div className="end-message">
                    <p>You've reached the end of the list.</p>
                </div>
            )}
        </div>
    );
};

export default BusinessList;
