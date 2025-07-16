// client/src/services/authService.js
import api from "./api";

export const authService = {
    // Admin login
    login: async (credentials) => {
        const response = await api.post("/admin/auth/login", credentials);
        const { token } = response.data;
        localStorage.setItem("adminToken", token);
        return response.data;
    },

    // Logout
    logout: () => {
        localStorage.removeItem("adminToken");
    },

    // Check if admin is authenticated
    isAuthenticated: () => {
        return !!localStorage.getItem("adminToken");
    },

    // Get stored token
    getToken: () => {
        return localStorage.getItem("adminToken");
    },
};

export default authService;
