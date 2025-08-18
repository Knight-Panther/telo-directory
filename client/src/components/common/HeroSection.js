// client/src/components/common/HeroSection.js
import React from "react";
import "../../styles/hero-backgrounds.css";

const HeroSection = ({
    title,
    description,
    backgroundType = "construction", // 'construction', 'gradient', 'none'
    overlayType = "dark", // 'dark', 'light'
    className = "",
    children,
}) => {
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

    return (
        <section
            className={`${getBackgroundClass()} ${overlayClass} ${className}`}
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
