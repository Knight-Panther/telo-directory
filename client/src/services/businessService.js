// client/src/services/businessService.js - REPLACE ENTIRE FILE
import api from "./api";

export const businessService = {
    // Get businesses with filters and pagination
    getBusinesses: async (params = {}) => {
        // Transform filter arrays to proper query parameters
        const queryParams = new URLSearchParams();

        // Handle single-value parameters
        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);
        if (params.search) queryParams.append("search", params.search);
        if (params.verified) queryParams.append("verified", params.verified);

        // Handle multi-select arrays with proper parameter naming
        if (params.categories && params.categories.length > 0) {
            params.categories.forEach((category) => {
                queryParams.append("categories[]", category);
            });
        }

        if (params.cities && params.cities.length > 0) {
            params.cities.forEach((city) => {
                queryParams.append("cities[]", city);
            });
        }

        if (params.businessTypes && params.businessTypes.length > 0) {
            params.businessTypes.forEach((type) => {
                queryParams.append("businessTypes[]", type);
            });
        }

        // Debug logging for development
        if (process.env.NODE_ENV === "development") {
            console.log("API Request params:", {
                original: params,
                queryString: queryParams.toString(),
            });
        }

        const response = await api.get(`/businesses?${queryParams.toString()}`);
        return response.data;
    },

    // Get single business by ID
    getBusiness: async (id) => {
        const response = await api.get(`/businesses/${id}`);
        return response.data;
    },

    // Get categories
    getCategories: async () => {
        const response = await api.get("/businesses/categories/list");
        return response.data;
    },

    // Get cities
    getCities: async () => {
        const response = await api.get("/businesses/cities/list");
        return response.data;
    },

    // Get filter statistics (new endpoint)
    getFilterStats: async () => {
        const response = await api.get("/businesses/filters/stats");
        return response.data;
    },

    /**
     * NEW: Submit business issue report
     *
     * This function handles the submission of user reports about business listings.
     * It integrates with your existing API configuration to maintain consistent
     * error handling, authentication, and request management patterns.
     *
     * @param {Object} reportData - The report information
     * @param {string} reportData.businessId - ID of the business being reported
     * @param {Array<string>} reportData.issueTypes - Array of selected issue types
     * @param {string} reportData.description - Optional custom description
     * @param {string} reportData.honeypot - Hidden field for spam protection
     * @returns {Promise<Object>} API response data
     */
    submitReport: async (reportData) => {
        try {
            // Validate required fields before sending to API
            if (!reportData.businessId) {
                throw new Error("Business ID is required");
            }

            if (!reportData.issueTypes || reportData.issueTypes.length === 0) {
                throw new Error("At least one issue type must be selected");
            }

            // Prepare the request payload following your API patterns
            const payload = {
                businessId: reportData.businessId,
                issueTypes: reportData.issueTypes,
                description: reportData.description || "",
                honeypot: reportData.honeypot || "", // Spam protection field
            };

            // Debug logging for development environment
            if (process.env.NODE_ENV === "development") {
                console.log("🚩 Submitting business report:", {
                    businessId: payload.businessId,
                    issueTypes: payload.issueTypes,
                    hasDescription: !!payload.description,
                });
            }

            // Use your centralized API instance for consistent error handling
            const response = await api.post("/reports", payload);

            // Log successful submission in development
            if (process.env.NODE_ENV === "development") {
                console.log("✅ Report submitted successfully:", response.data);
            }

            return response.data;
        } catch (error) {
            // Enhanced error handling that follows your existing patterns
            console.error("❌ Report submission failed:", error);

            // Transform API errors into user-friendly messages
            if (error.response) {
                // Server responded with error status
                const apiError = error.response.data;

                switch (error.response.status) {
                    case 400:
                        throw new Error(
                            apiError.message ||
                                "Invalid report data. Please check your input and try again."
                        );
                    case 429:
                        throw new Error(
                            "Too many reports submitted. Please wait before submitting another report."
                        );
                    case 404:
                        throw new Error(
                            "Business not found. This listing may have been removed."
                        );
                    case 500:
                        throw new Error(
                            "Server error occurred. Please try again later."
                        );
                    default:
                        throw new Error(
                            apiError.message ||
                                "Failed to submit report. Please try again."
                        );
                }
            } else if (error.code === "ECONNABORTED") {
                // Request timeout (from your api.js timeout setting)
                throw new Error(
                    "Request timed out. Please check your connection and try again."
                );
            } else if (error.request) {
                // Network error
                throw new Error(
                    "Unable to connect to server. Please check your internet connection."
                );
            } else {
                // Other errors
                throw new Error(
                    error.message || "An unexpected error occurred."
                );
            }
        }
    },
};

export default businessService;
