// client/src/services/adminService.js
import api from "./api";

export const adminService = {
    // Business management
    getBusinesses: async (params = {}) => {
        const response = await api.get("/admin/businesses", { params });
        return response.data;
    },
    // NEW: Get businesses count for a category
    getCategoryBusinessCount: async (categoryId) => {
        const response = await api.get(
            `/admin/categories/${categoryId}/businesses-count`
        );
        return response.data;
    },

    // ENHANCED: Update category (returns migration info)
    updateCategory: async (id, data) => {
        const response = await api.put(`/admin/categories/${id}`, data);
        return response.data;
    },

    getBusiness: async (id) => {
        const response = await api.get(`/admin/businesses/${id}`);
        return response.data;
    },

    createBusiness: async (formData) => {
        const response = await api.post("/admin/businesses", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    updateBusiness: async (id, formData) => {
        const response = await api.put(`/admin/businesses/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    deleteBusiness: async (id) => {
        const response = await api.delete(`/admin/businesses/${id}`);
        return response.data;
    },

    toggleVerification: async (id) => {
        const response = await api.patch(`/admin/businesses/${id}/verify`);
        return response.data;
    },

    // Category management
    getCategories: async () => {
        const response = await api.get("/admin/categories");
        return response.data;
    },

    createCategory: async (category) => {
        const response = await api.post("/admin/categories", category);
        return response.data;
    },

    updateCategory: async (id, category) => {
        const response = await api.put(`/admin/categories/${id}`, category);
        return response.data;
    },

    toggleCategory: async (id) => {
        const response = await api.patch(`/admin/categories/${id}/toggle`);
        return response.data;
    },

    // Dashboard data
    getDashboardStats: async () => {
        const response = await api.get("/admin/dashboard/stats");
        return response.data;
    },

    getRecentBusinesses: async () => {
        const response = await api.get("/admin/dashboard/recent");
        return response.data;
    },

    getChartData: async () => {
        const response = await api.get("/admin/dashboard/charts");
        return response.data;
    },

    getSystemStatus: async () => {
        const response = await api.get("/admin/dashboard/system");
        return response.data;
    },
};

export default adminService;
