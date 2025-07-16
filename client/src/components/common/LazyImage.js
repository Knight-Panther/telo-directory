// client/src/components/common/LazyImage.js - CREATE NEW FILE
import React, { useState, useRef, useEffect } from "react";

const LazyImage = ({
    src,
    alt,
    className = "",
    placeholder = null,
    onError = null,
    style = {},
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef();

    // Intersection Observer for viewport detection
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect(); // Only trigger once
                }
            },
            {
                // Advanced configuration for different screen sizes
                root: null,
                rootMargin: getResponsiveRootMargin(),
                threshold: 0.1,
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Responsive root margin based on screen size
    function getResponsiveRootMargin() {
        const width = window.innerWidth;

        if (width <= 480) {
            // Mobile: Load images 200px before they appear
            return "200px 0px 200px 0px";
        } else if (width <= 768) {
            // Tablet: Load images 400px before they appear
            return "400px 0px 400px 0px";
        } else if (width <= 1200) {
            // Small desktop: Load images 600px before
            return "600px 0px 600px 0px";
        } else {
            // Large desktop: Load images 800px before
            return "800px 0px 800px 0px";
        }
    }

    // Handle image load success
    const handleLoad = () => {
        setIsLoaded(true);
    };

    // Handle image load error
    const handleError = (e) => {
        setHasError(true);
        if (onError) {
            onError(e);
        }
    };

    // Don't render img until in view
    if (!isInView) {
        return (
            <div
                ref={imgRef}
                className={`lazy-image-placeholder ${className}`}
                style={{
                    ...style,
                    backgroundColor: "#f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: style.height || "200px",
                }}
                {...props}
            >
                {placeholder || (
                    <div className="lazy-loading-indicator">
                        <div className="lazy-loading-shimmer"></div>
                    </div>
                )}
            </div>
        );
    }

    // Render actual image when in view
    return (
        <div className={`lazy-image-container ${className}`} style={style}>
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                loading="lazy" // Native browser lazy loading as fallback
                onLoad={handleLoad}
                onError={handleError}
                className={`lazy-image ${isLoaded ? "loaded" : "loading"} ${
                    hasError ? "error" : ""
                }`}
                style={{
                    opacity: isLoaded ? 1 : 0,
                    transition: "opacity 0.3s ease",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                }}
                {...props}
            />

            {/* Loading shimmer effect while image loads */}
            {!isLoaded && !hasError && (
                <div className="lazy-loading-overlay">
                    <div className="lazy-loading-shimmer"></div>
                </div>
            )}
        </div>
    );
};

export default LazyImage;
