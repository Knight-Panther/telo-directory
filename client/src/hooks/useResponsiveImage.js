// client/src/hooks/useResponsiveImage.js
// Custom hook for responsive image loading with format support for hero sections

import { useState, useEffect, useCallback } from "react";
import {
    supportsImageFormat,
    getOptimalImageSize,
    getResponsiveImageUrl,
    preloadImage,
} from "../utils/imageUtils";

/**
 * Custom hook for managing responsive images with format fallbacks
 * @param {string} imageName - Base image name (e.g., 'construction-hero')
 * @param {Object} options - Configuration options
 * @returns {Object} - Hook state and utilities
 */
export const useResponsiveImage = (imageName, options = {}) => {
    const { preload = true, fallbackToJpeg = true, debounceMs = 100 } = options;

    // State management
    const [formatSupport, setFormatSupport] = useState({
        avif: false,
        webp: false,
        checked: false,
    });
    const [screenWidth, setScreenWidth] = useState(
        typeof window !== "undefined" ? window.innerWidth : 1200
    );
    const [currentImageUrl, setCurrentImageUrl] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Debounced resize handler for better performance
    const handleResize = useCallback(() => {
        let timeoutId;

        const debouncedResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setScreenWidth(window.innerWidth);
            }, debounceMs);
        };

        return debouncedResize;
    }, [debounceMs]);

    // Check format support on mount
    useEffect(() => {
        const checkFormats = async () => {
            try {
                const [avifSupported, webpSupported] = await Promise.all([
                    supportsImageFormat("avif"),
                    supportsImageFormat("webp"),
                ]);

                setFormatSupport({
                    avif: avifSupported,
                    webp: webpSupported,
                    checked: true,
                });
            } catch (err) {
                console.warn("Format detection failed:", err);
                setFormatSupport({
                    avif: false,
                    webp: false,
                    checked: true,
                });
            }
        };

        checkFormats();
    }, []);

    // Set up resize listener
    useEffect(() => {
        if (typeof window === "undefined") return;

        const resizeHandler = handleResize();
        window.addEventListener("resize", resizeHandler, { passive: true });

        return () => {
            window.removeEventListener("resize", resizeHandler);
        };
    }, [handleResize]);

    // Update image URL when dependencies change
    useEffect(() => {
        if (!formatSupport.checked || !imageName) return;

        const updateImage = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const size = getOptimalImageSize(screenWidth);

                // getResponsiveImageUrl now returns a Promise
                let imageUrl = await getResponsiveImageUrl(
                    imageName,
                    size,
                    formatSupport
                );

                if (!imageUrl) {
                    throw new Error("No suitable image format found");
                }

                // If we should preload, try loading the image first
                if (preload) {
                    try {
                        await preloadImage(imageUrl);
                    } catch (preloadError) {
                        // If preload fails and fallback is enabled, try WebP fallback
                        if (
                            fallbackToJpeg &&
                            (formatSupport.avif || formatSupport.webp)
                        ) {
                            console.warn(
                                `Failed to load ${imageUrl}, falling back to WebP fallback`
                            );
                            imageUrl = await getResponsiveImageUrl(
                                imageName,
                                size,
                                { avif: false, webp: true }
                            );
                            if (imageUrl) {
                                await preloadImage(imageUrl);
                            } else {
                                throw preloadError;
                            }
                        } else {
                            throw preloadError;
                        }
                    }
                }

                setCurrentImageUrl(imageUrl);
            } catch (err) {
                setError(`Failed to load image: ${err.message}`);
                console.error("Image loading error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        updateImage();
    }, [imageName, formatSupport, screenWidth, preload, fallbackToJpeg]);

    // Get CSS custom properties for the current image
    const getCSSProperties = useCallback(() => {
        if (!currentImageUrl) return {};

        return {
            "--hero-bg-image": `url("${currentImageUrl}")`,
            "--hero-image-loaded": isLoading ? "0" : "1",
        };
    }, [currentImageUrl, isLoading]);

    // Manual refresh function
    const refresh = useCallback(() => {
        setScreenWidth(window.innerWidth);
    }, []);

    return {
        // Image state
        imageUrl: currentImageUrl,
        isLoading,
        error,

        // Format and size info
        formatSupport,
        screenWidth,
        optimalSize: getOptimalImageSize(screenWidth),

        // Utilities
        getCSSProperties,
        refresh,

        // Status flags
        isReady: formatSupport.checked && !isLoading && !error,
        hasError: !!error,
    };
};
