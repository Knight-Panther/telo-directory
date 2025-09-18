// client/src/utils/imageHelper.js

/**
 * Image URL Helper - Cloudinary Migration Ready
 *
 * This helper centralizes all image URL generation in one place.
 * When we migrate to Cloudinary later, we only need to change this file
 * instead of hunting down image URLs throughout the entire codebase.
 *
 * Future Cloudinary Integration Benefits:
 * - Automatic image optimization
 * - Multiple format delivery (WebP, AVIF)
 * - Responsive image sizing
 * - CDN delivery for faster loading
 */

// Configuration object for easy switching between environments
const IMAGE_CONFIG = {
    // Current local development setup
    LOCAL: {
        baseUrl: process.env.REACT_APP_IMAGE_BASE_URL || "http://localhost:3000",
        fallbackImage: "/placeholder-business.png",
    },

    // Future Cloudinary configuration (commented out for now)
    // CLOUDINARY: {
    //     cloudName: 'your-cloud-name',
    //     baseUrl: `https://res.cloudinary.com/your-cloud-name/image/upload`,
    //     transformations: {
    //         thumbnail: 'c_fill,w_150,h_150,q_auto,f_auto',
    //         card: 'c_fill,w_300,h_200,q_auto,f_auto',
    //         detail: 'c_fill,w_600,h_400,q_auto,f_auto'
    //     }
    // }
};

// Current environment - switch this when migrating to Cloudinary
const CURRENT_ENV = "LOCAL";

/**
 * Generates the appropriate image URL based on current environment
 *
 * @param {string} imagePath - The image path from database (e.g., "/uploads/businesses/image.jpg")
 * @param {string} size - Image size variant ('thumbnail', 'card', 'detail')
 * @returns {string} - Complete image URL ready for use in <img> tags
 */
export const getImageUrl = (imagePath, size = "card") => {
    // Handle missing or empty image paths
    if (!imagePath || imagePath.trim() === "") {
        return getFallbackImageUrl();
    }

    // Current local implementation
    if (CURRENT_ENV === "LOCAL") {
        return `${IMAGE_CONFIG.LOCAL.baseUrl}${imagePath}`;
    }

    // Future Cloudinary implementation (ready to uncomment)
    // if (CURRENT_ENV === 'CLOUDINARY') {
    //     const transformation = IMAGE_CONFIG.CLOUDINARY.transformations[size] || IMAGE_CONFIG.CLOUDINARY.transformations.card;
    //     // Extract filename from path for Cloudinary
    //     const filename = imagePath.split('/').pop().split('.')[0];
    //     return `${IMAGE_CONFIG.CLOUDINARY.baseUrl}/${transformation}/${filename}`;
    // }

    // Fallback to local if environment not recognized
    return `${IMAGE_CONFIG.LOCAL.baseUrl}${imagePath}`;
};

/**
 * Returns the fallback/placeholder image URL
 * Used when business has no profile image
 */
export const getFallbackImageUrl = () => {
    if (CURRENT_ENV === "LOCAL") {
        return IMAGE_CONFIG.LOCAL.fallbackImage;
    }

    // Future Cloudinary fallback
    // return `${IMAGE_CONFIG.CLOUDINARY.baseUrl}/c_fill,w_300,h_200,q_auto,f_auto/placeholder-business`;

    return IMAGE_CONFIG.LOCAL.fallbackImage;
};

/**
 * Generates a placeholder based on business name initial
 * This creates a colored background with the first letter of business name
 *
 * @param {string} businessName - Name of the business
 * @returns {object} - Object with background color and letter for CSS styling
 */
export const getPlaceholderData = (businessName) => {
    if (!businessName) return { letter: "?", backgroundColor: "#6c757d" };

    const letter = businessName.charAt(0).toUpperCase();

    // Generate consistent color based on first letter
    // This ensures same business always gets same color
    const colors = [
        "#007bff",
        "#28a745",
        "#17a2b8",
        "#ffc107",
        "#dc3545",
        "#6f42c1",
        "#fd7e14",
        "#20c997",
    ];

    const colorIndex = letter.charCodeAt(0) % colors.length;

    return {
        letter,
        backgroundColor: colors[colorIndex],
    };
};

/**
 * Utility function to handle image loading errors
 * Call this in onError handlers to switch to fallback
 *
 * @param {Event} event - The error event from img onError
 * @param {string} businessName - Business name for placeholder generation
 */
export const handleImageError = (event, businessName = "") => {
    // Prevent infinite error loops
    if (event.target.src !== getFallbackImageUrl()) {
        event.target.src = getFallbackImageUrl();
    }

    // Add a data attribute to indicate this image failed
    // This can be useful for analytics or debugging
    event.target.setAttribute("data-image-failed", "true");

    console.warn(`Image failed to load for business: ${businessName}`);
};

/**
 * Migration helper function for future Cloudinary switch
 * Call this function when ready to migrate to Cloudinary
 */
export const switchToCloudinary = (cloudName) => {
    console.warn(
        "Cloudinary migration helper called. Uncomment Cloudinary configuration in imageHelper.js"
    );
    // This is where we'll add the migration logic when ready
    // For now, it just logs a warning to remind us about the manual steps needed
};
