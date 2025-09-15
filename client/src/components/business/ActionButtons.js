// client/src/components/business/ActionButtons.js
import React, { memo } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

const ActionButton = memo(({
    type, // 'favorite' | 'report'
    isActive = false,
    isLoading = false,
    onClick,
    className = '',
    businessName,
    size = 'medium', // 'small' | 'medium' | 'large'
    disabled = false
}) => {
    const getIcon = () => {
        if (type === 'favorite') {
            return isLoading ? null : isActive ? "❤️" : "🤍";
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

    const getTitle = () => {
        if (type === 'favorite') {
            if (isLoading) return "Updating...";
            return isActive ? "Remove from favorites" : "Add to favorites";
        }
        return "Report an issue with this listing";
    };

    const baseClassName = `action-btn ${type}-btn-${size === 'large' ? 'overlay' : size === 'medium' ? 'overlay' : 'small'}`;
    const stateClasses = [
        isActive && type === 'favorite' && 'favorited',
        isLoading && 'loading',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={`${baseClassName} ${stateClasses}`.trim()}
            onClick={onClick}
            disabled={isLoading || disabled}
            aria-label={getAriaLabel()}
            aria-pressed={type === 'favorite' ? isActive : undefined}
            type="button"
            title={getTitle()}
        >
            {isLoading ? (
                <LoadingSpinner size="small" color="white" />
            ) : (
                <span aria-hidden="true">
                    {getIcon()}
                </span>
            )}
        </button>
    );
});

ActionButton.displayName = 'ActionButton';

export default ActionButton;