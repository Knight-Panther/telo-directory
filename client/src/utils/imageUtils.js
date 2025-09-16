// client/src/utils/imageUtils.js
// Utility functions for responsive image loading with format support

/**
 * Detects if a specific image format is supported by the browser
 * @param {string} format - The image format to test ('avif', 'webp')
 * @returns {Promise<boolean>} - Promise resolving to support status
 */
export const supportsImageFormat = (format) => {
    return new Promise((resolve) => {
        const testImages = {
            avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAAFmF1eEMAAAAAdXJuOm1wZWc6bXBlZ0I6Y2ljcAAAAA5hdjFDgQ0MAAAAABNjb2xybmNseAABAA0ABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMgkQAAAAB0IyNCgAAAAABE4gAAAAAA==',
            webp: 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
        };

        if (!testImages[format]) {
            resolve(false);
            return;
        }

        const img = new Image();
        img.onload = () => resolve(img.width > 0 && img.height > 0);
        img.onerror = () => resolve(false);
        img.src = testImages[format];
    });
};

/**
 * Gets the optimal image size based on screen width
 * @param {number} screenWidth - Current screen width
 * @returns {string} - Image size ('800', '1600', or '2400')
 */
export const getOptimalImageSize = (screenWidth) => {
    if (screenWidth <= 768) return '800';
    if (screenWidth <= 1440) return '1600';
    return '2400';
};

/**
 * Generates responsive image URL with format fallback
 * @param {string} baseName - Base image name without extension (e.g., 'construction-hero')
 * @param {string} size - Image size ('800', '1600', '2400')
 * @param {Object} formatSupport - Object with format support flags
 * @returns {string|null} - Optimal image URL or null if not found
 */
export const getResponsiveImageUrl = (baseName, size, formatSupport) => {
    // Dynamic import for image URLs (handled by Webpack)
    return new Promise(async (resolve) => {
        try {
            const { getImageUrl } = await import('../assets/images/hero');

            // Try AVIF first (best compression)
            if (formatSupport.avif) {
                const avifUrl = getImageUrl(baseName, 'avif', size);
                if (avifUrl) {
                    resolve(avifUrl);
                    return;
                }
            }

            // Fall back to WebP (good compression)
            if (formatSupport.webp) {
                const webpUrl = getImageUrl(baseName, 'webp', size);
                if (webpUrl) {
                    resolve(webpUrl);
                    return;
                }
            }

            // No suitable image found
            resolve(null);
        } catch (error) {
            console.warn('Failed to load image:', error);
            resolve(null);
        }
    });
};

/**
 * Preloads critical images for better performance
 * @param {string} imageUrl - URL of image to preload
 * @returns {Promise<void>} - Promise resolving when image is loaded
 */
export const preloadImage = (imageUrl) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to preload: ${imageUrl}`));
        img.src = imageUrl;
    });
};

/**
 * Checks if all required responsive images exist
 * @param {string} baseName - Base image name
 * @param {Array<string>} sizes - Array of sizes to check
 * @param {Array<string>} formats - Array of formats to check
 * @returns {Promise<Object>} - Object with availability status
 */
export const checkImageAvailability = async (baseName, sizes = ['800', '1600', '2400'], formats = ['avif', 'webp']) => {
    const results = {};

    try {
        const { getImageUrl } = await import('../assets/images/hero');

        for (const format of formats) {
            results[format] = {};
            for (const size of sizes) {
                try {
                    const imageUrl = getImageUrl(baseName, format, size);
                    if (imageUrl) {
                        await preloadImage(imageUrl);
                        results[format][size] = true;
                    } else {
                        results[format][size] = false;
                    }
                } catch {
                    results[format][size] = false;
                }
            }
        }
    } catch (error) {
        console.warn('Failed to check image availability:', error);
        // Return all false if import fails
        for (const format of formats) {
            results[format] = {};
            for (const size of sizes) {
                results[format][size] = false;
            }
        }
    }

    return results;
};