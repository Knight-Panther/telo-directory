// client/src/services/businessService.js
import api from "./api";

export const businessService = {
    // Get businesses with filters and pagination
    getBusinesses: async (params = {}) => {
        const response = await api.get("/businesses", { params });
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
};

export default businessService;
