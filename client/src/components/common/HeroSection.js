// client/src/components/common/HeroSection.js
import React from "react";
import { useResponsiveImage } from "../../hooks/useResponsiveImage";
import "../../styles/hero-backgrounds.css";

const HeroSection = ({
    title,
    description,
    backgroundType = "construction", // 'construction', 'gradient', 'none'
    overlayType = "dark", // 'dark', 'light'
    className = "",
    children,
}) => {
    // Use responsive image hook for construction background
    const shouldUseResponsiveImage = backgroundType === "construction";
    const responsiveImage = useResponsiveImage(
        shouldUseResponsiveImage ? "construction-hero" : null,
        {
            preload: true,
            fallbackToJpeg: true,
            debounceMs: 150
        }
    );

    // Determine background class
    const getBackgroundClass = () => {
        switch (backgroundType) {
            case "construction":
                return "hero-construction-bg";
            case "gradient":
                return "hero-section"; // Your existing gradient hero
            case "none":
                return "hero-basic";
            default:
                return "hero-construction-bg";
        }
    };

    // Determine overlay class
    const overlayClass = overlayType === "light" ? "light-overlay" : "";

    // Get inline styles for responsive image
    const getInlineStyles = () => {
        if (!shouldUseResponsiveImage || !responsiveImage.isReady) {
            return {};
        }
        return responsiveImage.getCSSProperties();
    };

    // Development logging (removed in production)
    if (process.env.NODE_ENV === "development" && shouldUseResponsiveImage) {
        if (responsiveImage.hasError) {
            console.warn("HeroSection image error:", responsiveImage.error);
        }
    }

    return (
        <section
            className={`${getBackgroundClass()} ${overlayClass} ${className}`}
            style={getInlineStyles()}
        >
            <div className="hero-content">
                {title && <h1>{title}</h1>}
                {description && <p>{description}</p>}
                {children}
            </div>
        </section>
    );
};

export default HeroSection;
