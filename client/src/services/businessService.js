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
};

export default businessService;
