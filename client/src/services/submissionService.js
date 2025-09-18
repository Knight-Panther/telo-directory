// client/src/services/submissionService.js
import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
    baseURL: `${process.env.REACT_APP_API_URL || "http://localhost:3000/api"}/submissions`,
    timeout: 30000, // 30 seconds for file uploads
    headers: {
        'Content-Type': 'multipart/form-data',
    },
});

// Request interceptor for logging
api.interceptors.request.use(
    (config) => {
        console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error('❌ Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
    },
    (error) => {
        console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}:`,
            error.response?.data?.error || error.message);
        return Promise.reject(error);
    }
);

/**
 * Submission Service
 * Handles all business submission related API calls
 */
const submissionService = {
    /**
     * Get available Georgian cities
     */
    getCities: async () => {
        try {
            const response = await api.get('/cities');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to fetch cities');
        }
    },

    /**
     * Get available business categories
     */
    getCategories: async () => {
        try {
            const response = await api.get('/categories');
            return response.data; // Return full response with categories array
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to fetch categories');
        }
    },

    /**
     * Submit business listing
     * @param {Object} formData - Form data including image file
     */
    submitBusiness: async (formData) => {
        try {
            // Create FormData for file upload
            const submitData = new FormData();

            // Append all form fields
            Object.keys(formData).forEach(key => {
                if (key === 'cities' || key === 'categories' || key === 'socialLinks') {
                    // JSON stringify arrays and objects
                    submitData.append(key, JSON.stringify(formData[key]));
                } else if (key === 'profileImage' && formData[key]) {
                    // Handle file upload
                    submitData.append('profileImage', formData[key]);
                } else if (formData[key] !== null && formData[key] !== undefined) {
                    // Append other fields
                    submitData.append(key, formData[key]);
                }
            });

            // Log form data for debugging (excluding file)
            console.log('📝 Submitting business listing:', {
                businessName: formData.businessName,
                categories: formData.categories,
                cities: formData.cities,
                hasImage: !!formData.profileImage
            });

            const response = await api.post('/create', submitData);
            return response.data;
        } catch (error) {
            // Handle specific error types
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout. Please check your connection and try again.');
            }

            if (error.response?.status === 413) {
                throw new Error('File too large. Please choose a smaller image (max 10MB).');
            }

            if (error.response?.data?.details) {
                // Validation errors
                throw new Error(error.response.data.details.join(', '));
            }

            throw new Error(error.response?.data?.error || 'Failed to submit business listing');
        }
    },

    /**
     * Check submission status
     * @param {string} submissionId - The submission ID to check
     */
    checkSubmissionStatus: async (submissionId) => {
        try {
            const response = await api.get(`/status/${submissionId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Submission not found');
            }
            throw new Error(error.response?.data?.error || 'Failed to check submission status');
        }
    },

    /**
     * Validate form data before submission
     * @param {Object} formData - Form data to validate
     */
    validateSubmission: (formData) => {
        const errors = {};

        // Required fields
        if (!formData.businessName?.trim()) {
            errors.businessName = 'Business name is required';
        }

        if (!formData.categories || formData.categories.length === 0) {
            errors.categories = 'At least one business category must be selected';
        }

        if (!formData.businessType) {
            errors.businessType = 'Business type is required';
        }

        if (!formData.cities || formData.cities.length === 0) {
            errors.cities = 'At least one city must be selected';
        } else if (formData.cities.includes('All Georgia') && formData.cities.length > 1) {
            errors.cities = '"All Georgia" cannot be combined with specific cities';
        }

        if (!formData.mobile?.trim()) {
            errors.mobile = 'Mobile number is required';
        } else {
            // Georgian mobile format validation: +995XXXXXXXXX (must be exactly 13 characters)
            const georgianMobileRegex = /^\+995[0-9]{9}$/;
            if (!georgianMobileRegex.test(formData.mobile.trim())) {
                errors.mobile = 'Mobile number must be in Georgian format: +995XXXXXXXXX (example: +995599304009)';
            }
        }

        if (!formData.submitterEmail?.trim()) {
            errors.submitterEmail = 'Email is required';
        } else {
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.submitterEmail)) {
                errors.submitterEmail = 'Invalid email format';
            }
        }

        if (!formData.submitterName?.trim()) {
            errors.submitterName = 'Your name is required';
        }

        if (!formData.profileImage) {
            errors.profileImage = 'Profile image is required';
        }

        // Optional field validations
        if (formData.shortDescription && formData.shortDescription.length > 200) {
            errors.shortDescription = 'Description cannot exceed 200 characters';
        }

        if (formData.hasCertificate && !formData.certificateDescription?.trim()) {
            errors.certificateDescription = 'Certificate description is required';
        }

        if (formData.certificateDescription && formData.certificateDescription.length > 50) {
            errors.certificateDescription = 'Certificate description cannot exceed 50 characters';
        }

        // Social links validation
        const urlRegex = /^https?:\/\/.+/;
        const socialPlatforms = ['facebook', 'instagram', 'tiktok', 'youtube'];

        // Check if at least one Facebook or Instagram link is provided
        const hasFacebook = formData.socialLinks?.facebook?.trim();
        const hasInstagram = formData.socialLinks?.instagram?.trim();

        if (!hasFacebook && !hasInstagram) {
            if (!errors.socialLinks) errors.socialLinks = {};
            errors.socialLinks.required = 'At least one Facebook or Instagram link is required';
        }

        socialPlatforms.forEach(platform => {
            const url = formData.socialLinks?.[platform];
            if (url && url.trim() && !urlRegex.test(url.trim())) {
                if (!errors.socialLinks) errors.socialLinks = {};
                errors.socialLinks[platform] = `${platform.charAt(0).toUpperCase() + platform.slice(1)} URL must be a valid HTTP/HTTPS URL`;
            }
        });

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    /**
     * Format mobile number as user types
     * @param {string} value - Input value
     * @returns {string} - Formatted mobile number
     */
    formatMobileNumber: (value) => {
        // Remove all non-digits
        const numbers = value.replace(/\D/g, '');

        // Always start with +995
        let formatted = '+995';

        // Add the remaining digits without spaces (max 9 digits after +995)
        if (numbers.length > 3) {
            const remaining = numbers.slice(3, 12); // Max 9 digits after 995
            formatted += remaining;
        }

        return formatted;
    },

    /**
     * Clean mobile number for submission
     * @param {string} formatted - Formatted mobile number
     * @returns {string} - Clean mobile number
     */
    cleanMobileNumber: (formatted) => {
        return formatted.replace(/\D/g, '').slice(0, 12); // Max 12 digits (995 + 9 digits)
    },

    /**
     * Get file validation info
     * @param {File} file - File to validate
     * @returns {Object} - Validation result
     */
    validateImageFile: (file) => {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/tiff', 'image/gif'];

        const errors = [];

        if (!file) {
            errors.push('No file selected');
        } else {
            if (file.size > maxSize) {
                errors.push(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
            }

            if (!allowedTypes.includes(file.type)) {
                errors.push(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            fileInfo: file ? {
                name: file.name,
                size: file.size,
                type: file.type,
                sizeFormatted: `${(file.size / 1024 / 1024).toFixed(2)} MB`
            } : null
        };
    }
};

export default submissionService;