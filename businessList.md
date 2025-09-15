# Business Listing Cards - Implementation Guide

## Overview
This guide provides step-by-step implementation standards for business listing cards and related UI components. Follow this guide to ensure consistent performance, accessibility, and maintainability.

## 🔴 CRITICAL FIXES (Must Implement First)

### 1. Performance Optimization

#### 1.1 Memoize BusinessCard Component
**File:** `client/src/components/business/BusinessCard.js`
**Priority:** Critical
**Impact:** 60-80% performance improvement on large lists

```javascript
// BEFORE (lines 14-41)
const BusinessCard = ({ business }) => {
    const [isFavorited, setIsFavorited] = useState(false);

    useEffect(() => {
        if (user && user.favorites) {
            setIsFavorited(user.favorites.includes(_id));
        }
    }, [user, _id]); // ❌ Runs on every user change

// AFTER - Implementation Steps:
import React, { useState, useEffect, Suspense, memo, useMemo } from "react";

const BusinessCard = memo(({ business }) => {
    // Step 1: Replace useEffect with useMemo
    const isFavorited = useMemo(() => {
        return user && user.favorites ? user.favorites.includes(_id) : false;
    }, [user?.favorites, _id]); // ✅ Only runs when favorites or _id changes

    // Step 2: Remove useState for isFavorited (line 34)
    // const [isFavorited, setIsFavorited] = useState(false); // ❌ Remove this

    // Step 3: Update favorite handlers to use local state
    const [localFavoriteState, setLocalFavoriteState] = useState(null);
    const displayFavorited = localFavoriteState !== null ? localFavoriteState : isFavorited;
});

// Step 4: Add displayName for debugging
BusinessCard.displayName = 'BusinessCard';

export default BusinessCard;
```

#### 1.2 Optimize Sample Rating Calculation
**File:** `client/src/components/business/BusinessCard.js` (line 125)
**Priority:** Critical

```javascript
// BEFORE
const sampleRating = Math.random() < 0.3 ? null : Math.random() * 3 + 7; // ❌ Calculated on every render

// AFTER - Move outside component or memoize
const generateSampleRating = (businessId) => {
    // Use business ID as seed for consistent rating
    const seed = businessId.charCodeAt(businessId.length - 1);
    const random1 = (seed * 9301 + 49297) % 233280 / 233280;
    const random2 = (seed * 9301 + 49297 + 1) % 233280 / 233280;
    return random1 < 0.3 ? null : random2 * 3 + 7;
};

// Inside component
const sampleRating = useMemo(() => generateSampleRating(_id), [_id]); // ✅ Cached per business
```

#### 1.3 Implement Business List Virtualization
**File:** `client/src/components/business/BusinessList.js`
**Priority:** Critical (for >50 items)

```javascript
// Install dependency first: npm install react-window react-window-infinite-loader

import { FixedSizeGrid as Grid } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

// Add to BusinessList component
const ITEM_HEIGHT = 200; // Height of each business card
const ITEMS_PER_ROW = window.innerWidth >= 1200 ? 4 : window.innerWidth >= 768 ? 2 : 1;

const VirtualizedBusinessGrid = ({ businesses, hasNextPage, loadMoreItems }) => {
    const itemCount = hasNextPage ? businesses.length + 1 : businesses.length;

    const isItemLoaded = index => index < businesses.length;

    const Item = ({ columnIndex, rowIndex, style }) => {
        const index = rowIndex * ITEMS_PER_ROW + columnIndex;
        if (index >= businesses.length) return <div style={style} />;

        return (
            <div style={style}>
                <BusinessCard business={businesses[index]} />
            </div>
        );
    };

    return (
        <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadMoreItems}
        >
            {({ onItemsRendered, ref }) => (
                <Grid
                    ref={ref}
                    columnCount={ITEMS_PER_ROW}
                    columnWidth={300}
                    height={600}
                    rowCount={Math.ceil(itemCount / ITEMS_PER_ROW)}
                    rowHeight={ITEM_HEIGHT}
                    onItemsRendered={onItemsRendered}
                >
                    {Item}
                </Grid>
            )}
        </InfiniteLoader>
    );
};
```

### 2. Accessibility Fixes

#### 2.1 Improve ARIA Labels and Keyboard Navigation
**File:** `client/src/components/business/BusinessCard.js`
**Priority:** Critical (Legal compliance)

```javascript
// BEFORE (lines 171-177)
aria-label={`${isLoading ? "Updating" : isFavorited ? "Remove" : "Add"} ${businessName} ${isFavorited ? "from" : "to"} favorites`} // ❌ Too verbose

// AFTER - Implementation Steps:

// Step 1: Create proper ARIA labels
const getFavoriteAriaLabel = () => {
    if (isLoading) return "Updating favorites";
    return isFavorited
        ? `Remove ${businessName} from favorites`
        : `Add ${businessName} to favorites`;
};

const getReportAriaLabel = () => `Report issue with ${businessName}`;

// Step 2: Add keyboard navigation to card container
<div
    className="business-card business-card-mobile-horizontal"
    role="article"
    tabIndex="0"
    onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            // Navigate to business detail page
            window.location.href = `/business/${_id}`;
        }
    }}
    aria-label={`${businessName} business listing`}
>

// Step 3: Improve button accessibility
<button
    className={`favorite-btn-overlay ${isFavorited ? "favorited" : ""} ${isLoading ? "loading" : ""}`}
    onClick={handleFavoriteClick}
    disabled={isLoading}
    aria-label={getFavoriteAriaLabel()}
    aria-pressed={isFavorited}
    type="button"
>
    <span aria-hidden="true">
        {isLoading ? "⏳" : isFavorited ? "❤️" : "🤍"}
    </span>
</button>

// Step 4: Add focus management
const cardRef = useRef(null);
const handleFocusManagement = () => {
    // Ensure focus is visible and managed properly
    if (cardRef.current) {
        cardRef.current.focus();
    }
};
```

#### 2.2 Add Skip Links and Screen Reader Support
**File:** `client/src/components/business/BusinessList.js`

```javascript
// Add to BusinessList component
const BusinessList = ({ searchTerm, filters }) => {
    return (
        <div className="business-list">
            {/* Skip link for screen readers */}
            <a href="#business-grid" className="sr-only-focusable skip-to-content">
                Skip to business listings
            </a>

            {/* Announce results to screen readers */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {isLoading
                    ? "Loading businesses..."
                    : `${totalResults} businesses found`
                }
            </div>

            {/* Main content with proper landmark */}
            <main id="business-grid" role="main" tabIndex="-1">
                <div className="business-grid" role="list">
                    {businesses.map((business) => (
                        <div key={business._id} role="listitem">
                            <BusinessCard business={business} />
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};
```

## 🟡 MEDIUM PRIORITY (Implement Second)

### 3. Code Quality Improvements

#### 3.1 Extract Duplicate Button Components
**File:** `client/src/components/business/ActionButtons.js` (Create New)

```javascript
// Create new reusable component
import React, { memo } from 'react';

const ActionButton = memo(({
    type, // 'favorite' | 'report'
    isActive = false,
    isLoading = false,
    onClick,
    className = '',
    businessName,
    size = 'medium' // 'small' | 'medium' | 'large'
}) => {
    const getIcon = () => {
        if (type === 'favorite') {
            return isLoading ? "⏳" : isActive ? "❤️" : "🤍";
        }
        return "🚩";
    };

    const getAriaLabel = () => {
        if (type === 'favorite') {
            if (isLoading) return "Updating favorites";
            return isActive
                ? `Remove ${businessName} from favorites`
                : `Add ${businessName} to favorites`;
        }
        return `Report issue with ${businessName}`;
    };

    const baseClassName = `action-btn ${type}-btn-${size}`;
    const stateClasses = [
        isActive && 'active',
        isLoading && 'loading',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={`${baseClassName} ${stateClasses}`}
            onClick={onClick}
            disabled={isLoading}
            aria-label={getAriaLabel()}
            aria-pressed={type === 'favorite' ? isActive : undefined}
            type="button"
        >
            <span aria-hidden="true">{getIcon()}</span>
        </button>
    );
});

ActionButton.displayName = 'ActionButton';

export default ActionButton;
```

#### 3.2 Environment Configuration
**File:** `client/src/utils/config.js` (Create New)

```javascript
// Create configuration utility
const config = {
    API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
    IMAGE_BASE_URL: process.env.REACT_APP_IMAGE_URL || 'http://localhost:3000',
    ENABLE_SAMPLE_RATINGS: process.env.REACT_APP_SAMPLE_RATINGS !== 'false',
};

export const getImageUrl = (imagePath, size = 'medium') => {
    if (!imagePath) return null;

    // Handle different image sizes
    const sizeParams = {
        small: '?w=100&h=100&fit=crop',
        medium: '?w=200&h=200&fit=crop',
        large: '?w=400&h=400&fit=crop',
        detail: '?w=800&h=600&fit=crop'
    };

    const params = sizeParams[size] || sizeParams.medium;
    return `${config.IMAGE_BASE_URL}${imagePath}${params}`;
};

export default config;
```

#### 3.3 Standardize Loading States
**File:** `client/src/components/business/BusinessCard.js`

```javascript
// Replace emoji loading with consistent spinner
import LoadingSpinner from '../common/LoadingSpinner';

// BEFORE
{isLoading ? "⏳" : isFavorited ? "❤️" : "🤍"}

// AFTER
{isLoading ? (
    <LoadingSpinner size="small" color="white" />
) : (
    <span aria-hidden="true">
        {isFavorited ? "❤️" : "🤍"}
    </span>
)}
```

### 4. CSS Architecture Improvements

#### 4.1 Extract CSS Custom Properties
**File:** `client/src/styles/business-cards.css` (Create New)

```css
/* Business Card Variables */
:root {
    /* Card Dimensions */
    --card-image-size-mobile: 75px;
    --card-image-size-mobile-plus: 88px;
    --card-image-size-tablet: 100px;
    --card-image-size-desktop: 120px;
    --card-image-size-large: 140px;

    /* Card Spacing */
    --card-padding-mobile: var(--spacing-md);
    --card-padding-tablet: var(--spacing-lg);
    --card-gap: var(--spacing-md);

    /* Action Button Sizes */
    --action-btn-small: 28px;
    --action-btn-medium: 32px;
    --action-btn-large: 34px;

    /* Card Layout */
    --card-min-height-mobile: 160px;
    --card-min-height-desktop: 280px;
}

/* Responsive Card Dimensions */
@media (min-width: 375px) {
    :root {
        --card-image-size: var(--card-image-size-mobile-plus);
    }
}

@media (min-width: 768px) {
    :root {
        --card-image-size: var(--card-image-size-tablet);
        --card-padding: var(--card-padding-tablet);
    }
}

@media (min-width: 1024px) {
    :root {
        --card-image-size: var(--card-image-size-desktop);
    }
}

@media (min-width: 1200px) {
    :root {
        --card-image-size: var(--card-image-size-large);
    }
}
```

#### 4.2 Component-Specific CSS Structure
**File Organization:**
```
client/src/styles/
├── components/
│   ├── business-card.css      # BusinessCard specific styles
│   ├── business-list.css      # BusinessList specific styles
│   ├── action-buttons.css     # ActionButton specific styles
│   └── lazy-image.css         # LazyImage specific styles
├── layouts/
│   ├── grid-systems.css       # Responsive grids
│   └── card-layouts.css       # Card layout patterns
└── utilities/
    ├── accessibility.css      # A11y utilities
    └── performance.css        # Performance optimizations
```

## 🟢 LOW PRIORITY (Implement Last)

### 5. Enhanced Features

#### 5.1 Image Optimization
**File:** `client/src/components/common/LazyImage.js`

```javascript
// Add WebP support and progressive loading
const LazyImage = ({ src, alt, ...props }) => {
    const [imageFormat, setImageFormat] = useState('original');

    useEffect(() => {
        // Feature detection for WebP
        const checkWebPSupport = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            return canvas.toDataURL('image/webp').indexOf('webp') > -1;
        };

        if (checkWebPSupport()) {
            setImageFormat('webp');
        }
    }, []);

    const getOptimizedSrc = (originalSrc) => {
        if (!originalSrc) return originalSrc;

        if (imageFormat === 'webp') {
            return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }

        return originalSrc;
    };

    return (
        <picture>
            {imageFormat === 'webp' && (
                <source srcSet={getOptimizedSrc(src)} type="image/webp" />
            )}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                {...props}
            />
        </picture>
    );
};
```

#### 5.2 Error Boundary Implementation
**File:** `client/src/components/common/BusinessCardErrorBoundary.js` (Create New)

```javascript
import React from 'react';

class BusinessCardErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Business card error:', error, errorInfo);

        // Log to monitoring service
        if (process.env.NODE_ENV === 'production') {
            // logError(error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="business-card-error">
                    <div className="error-content">
                        <span className="error-icon">⚠️</span>
                        <p>Unable to load business listing</p>
                        <button
                            onClick={() => this.setState({ hasError: false })}
                            className="retry-button"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Usage in BusinessList
{businesses.map((business) => (
    <BusinessCardErrorBoundary key={business._id}>
        <BusinessCard business={business} />
    </BusinessCardErrorBoundary>
))}
```

## Implementation Checklist

### Phase 1: Critical Performance & Accessibility
- [ ] Implement React.memo for BusinessCard
- [ ] Add useMemo for computed values
- [ ] Optimize rating calculations
- [ ] Add proper ARIA labels
- [ ] Implement keyboard navigation
- [ ] Add focus management
- [ ] Test with screen readers

### Phase 2: Code Quality & Consistency
- [ ] Extract ActionButton component
- [ ] Create environment configuration
- [ ] Standardize loading states
- [ ] Split CSS into modules
- [ ] Add CSS custom properties
- [ ] Update all hardcoded values

### Phase 3: Enhanced Features
- [ ] Implement virtualization (if needed)
- [ ] Add error boundaries
- [ ] Optimize images with WebP
- [ ] Add progressive loading
- [ ] Implement micro-animations
- [ ] Add TypeScript (optional)

## Testing Requirements

### Performance Testing
```javascript
// Add to tests/performance/BusinessCard.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import { performance } from 'perf_hooks';

test('BusinessCard renders within performance budget', () => {
    const start = performance.now();
    render(<BusinessCard business={mockBusiness} />);
    const end = performance.now();

    expect(end - start).toBeLessThan(16); // 60fps budget
});
```

### Accessibility Testing
```javascript
// Add to tests/a11y/BusinessCard.test.js
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('BusinessCard has no accessibility violations', async () => {
    const { container } = render(<BusinessCard business={mockBusiness} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
});
```

## Maintenance Guidelines

### When Adding New Features
1. **Always check performance impact** - Use React DevTools Profiler
2. **Test accessibility** - Use axe-core and screen readers
3. **Follow established patterns** - Use existing component structure
4. **Update this guide** - Keep documentation current
5. **Test across devices** - Mobile-first approach

### Code Review Checklist
- [ ] Component is memoized if it receives complex props
- [ ] All interactive elements have proper ARIA labels
- [ ] No hardcoded values (use config/CSS variables)
- [ ] Loading states are consistent
- [ ] Error states are handled
- [ ] CSS follows established patterns
- [ ] Performance impact is acceptable

### Performance Monitoring
```javascript
// Add to monitoring/performance.js
export const trackBusinessCardPerformance = () => {
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                if (entry.name.includes('BusinessCard')) {
                    console.log('BusinessCard performance:', entry.duration);
                }
            });
        });

        observer.observe({ entryTypes: ['measure'] });
    }
};
```

## Troubleshooting Common Issues

### Performance Issues
**Problem:** Slow scrolling with many cards
**Solution:** Implement virtualization and ensure proper memoization

**Problem:** Cards re-rendering unnecessarily
**Solution:** Check for reference equality in props and use React.memo

### Accessibility Issues
**Problem:** Screen reader announces too much information
**Solution:** Use proper ARIA labels and aria-hidden for decorative elements

**Problem:** Keyboard navigation doesn't work
**Solution:** Add proper tabindex and onKeyDown handlers

### Responsive Issues
**Problem:** Cards don't layout properly on different screens
**Solution:** Use CSS Grid with proper breakpoints and CSS custom properties

---

**Remember:** This guide should be updated whenever business card functionality changes. Always test performance and accessibility after implementing any changes.