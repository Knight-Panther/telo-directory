// client/src/components/forms/CategoryMultiSelect.js
import React, { useState, useRef, useEffect } from 'react';

const CategoryMultiSelect = ({
    categories = [],
    selectedCategories = [],
    onChange,
    error,
    required = true,
    classNames = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Filter categories based on search term
    const filteredCategories = categories.filter(category =>
        category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle category selection/deselection
    const handleCategoryToggle = (categoryName) => {
        let newSelectedCategories;

        if (selectedCategories.includes(categoryName)) {
            // Remove category
            newSelectedCategories = selectedCategories.filter(category => category !== categoryName);
        } else {
            // Add category (max 5 categories)
            if (selectedCategories.length >= 5) {
                return; // Prevent adding more than 5 categories
            }
            newSelectedCategories = [...selectedCategories, categoryName];
        }

        onChange(newSelectedCategories);
    };

    // Handle dropdown toggle
    const handleToggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // Focus search input when opening
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    };

    // Handle category tag removal
    const handleRemoveCategory = (categoryName, event) => {
        event.stopPropagation();
        const newSelectedCategories = selectedCategories.filter(category => category !== categoryName);
        onChange(newSelectedCategories);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm(''); // Reset search when closing
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    // Clear search when dropdown closes
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    return (
        <div className={classNames.container || "categories-multiselect-container"} ref={containerRef}>
            {/* Trigger */}
            <div
                className={`${classNames.trigger || "categories-multiselect-trigger"} ${isOpen ? (classNames.open || 'open') : ''} ${error ? (classNames.error || 'error') : ''}`}
                onClick={handleToggleDropdown}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="button"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={`Select categories. ${selectedCategories.length} selected`}
            >
                <div className={`${classNames.selectedDisplay || "categories-selected-display"} ${selectedCategories.length === 0 ? (classNames.empty || 'empty') : ''}`}>
                    {selectedCategories.length === 0 ? (
                        <span>
                            Select business categories{required && ' *'}
                        </span>
                    ) : (
                        selectedCategories.map(category => (
                            <div key={category} className={classNames.categoryTag || "category-tag"}>
                                <span>{category}</span>
                                <button
                                    type="button"
                                    className={classNames.categoryTagRemove || "category-tag-remove"}
                                    onClick={(e) => handleRemoveCategory(category, e)}
                                    aria-label={`Remove ${category}`}
                                    tabIndex={-1}
                                >
                                    ×
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className={classNames.dropdownArrow || "categories-dropdown-arrow"}>
                    ▼
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={classNames.dropdown || "categories-dropdown"}
                    role="listbox"
                    aria-label="Category options"
                >
                    {/* Search */}
                    <div className={classNames.search || "categories-search"}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className={classNames.searchInput || "categories-search-input"}
                            placeholder="Search categories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Search categories"
                        />
                    </div>

                    {/* Categories list */}
                    <div className={classNames.list || "categories-list"}>
                        {filteredCategories.length === 0 ? (
                            <div className={classNames.categoryOption || "category-option"} style={{ color: '#999', fontStyle: 'italic' }}>
                                {searchTerm ? 'No categories found' : 'No categories available'}
                            </div>
                        ) : (
                            filteredCategories.map(category => {
                                const isSelected = selectedCategories.includes(category);
                                const isMaxReached = selectedCategories.length >= 5 && !isSelected;

                                return (
                                    <div
                                        key={category}
                                        className={`${classNames.categoryOption || "category-option"} ${isSelected ? (classNames.selected || 'selected') : ''} ${isMaxReached ? (classNames.disabled || 'disabled') : ''}`}
                                        onClick={() => !isMaxReached && handleCategoryToggle(category)}
                                        role="option"
                                        aria-selected={isSelected}
                                        style={isMaxReached ? {
                                            opacity: 0.5,
                                            cursor: 'not-allowed',
                                            color: '#999'
                                        } : {}}
                                    >
                                        <input
                                            type="checkbox"
                                            className={classNames.categoryCheckbox || "category-checkbox"}
                                            checked={isSelected}
                                            onChange={() => {}} // Handled by parent onClick
                                            tabIndex={-1}
                                            disabled={isMaxReached}
                                            aria-hidden="true"
                                        />
                                        <span>{category}</span>
                                        {isMaxReached && (
                                            <span style={{ fontSize: '0.7rem', marginLeft: '8px' }}>
                                                (Max 5)
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer info */}
                    {selectedCategories.length > 0 && (
                        <div
                            style={{
                                padding: '8px 12px',
                                background: '#f8f9fa',
                                borderTop: '1px solid #e9ecef',
                                fontSize: '0.8rem',
                                color: '#6c757d',
                                textAlign: 'center'
                            }}
                        >
                            {selectedCategories.length} of 5 categories selected
                        </div>
                    )}
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className={classNames.fieldError || "field-error"}>
                    <span className={classNames.fieldErrorIcon || "field-error-icon"}>⚠</span>
                    {error}
                </div>
            )}

            {/* Helper text */}
            {!error && selectedCategories.length === 0 && (
                <div style={{
                    fontSize: '0.8rem',
                    color: '#6c757d',
                    marginTop: '6px',
                    fontStyle: 'italic'
                }}>
                    You can select up to 5 categories that best describe your business
                </div>
            )}

            {/* Selected count helper */}
            {!error && selectedCategories.length > 0 && (
                <div style={{
                    fontSize: '0.8rem',
                    color: selectedCategories.length >= 4 ? '#ffc107' : '#28a745',
                    marginTop: '6px',
                    textAlign: 'right'
                }}>
                    {selectedCategories.length}/5 categories selected
                    {selectedCategories.length >= 4 && selectedCategories.length < 5 && ' (almost at limit)'}
                    {selectedCategories.length === 5 && ' (maximum reached)'}
                </div>
            )}
        </div>
    );
};

export default CategoryMultiSelect;