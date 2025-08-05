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

    deleteBusinessImage: async (id) => {
        const response = await api.delete(`/admin/businesses/${id}/image`);
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

    // ENHANCED: Update category (returns migration info)
    updateCategory: async (id, data) => {
        const response = await api.put(`/admin/categories/${id}`, data);
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

    // NEW: Reports Management API Calls
    // These functions follow the same patterns as existing admin service calls,
    // providing consistent error handling and request formatting.

    // Get reports with pagination and filtering
    getReports: async (params = {}) => {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);
        if (params.status) queryParams.append("status", params.status);
        if (params.issueType) queryParams.append("issueType", params.issueType);
        if (params.search) queryParams.append("search", params.search);
        if (params.dateFrom) queryParams.append("dateFrom", params.dateFrom);
        if (params.dateTo) queryParams.append("dateTo", params.dateTo);

        const response = await api.get(
            `/admin/reports?${queryParams.toString()}`
        );
        return response.data;
    },

    // Get single report details
    getReport: async (id) => {
        const response = await api.get(`/admin/reports/${id}`);
        return response.data;
    },

    // Get reports statistics for dashboard
    getReportsStats: async () => {
        const response = await api.get("/admin/reports/stats");
        return response.data;
    },

    // Update report status (resolve, dismiss, etc.)
    updateReportStatus: async (id, statusData) => {
        const response = await api.patch(
            `/admin/reports/${id}/status`,
            statusData
        );
        return response.data;
    },

    // Delete report permanently
    deleteReport: async (id) => {
        const response = await api.delete(`/admin/reports/${id}`);
        return response.data;
    },

    // Get all reports for a specific business
    getBusinessReports: async (businessId) => {
        const response = await api.get(`/admin/reports/business/${businessId}`);
        return response.data;
    },
};

export default adminService;
