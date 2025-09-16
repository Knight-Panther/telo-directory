// client/src/components/forms/GenericMultiSelect.js
import React, { useState, useRef, useEffect } from 'react';

const GenericMultiSelect = ({
    items = [],
    selectedItems = [],
    onChange,
    error,
    required = true,
    maxItems = 10,
    placeholder = "Select items",
    searchPlaceholder = "Search...",
    itemName = "item",
    classNames = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Calculate warning threshold (80% of max)
    const warningThreshold = Math.floor(maxItems * 0.8);

    // Filter items based on search term
    const filteredItems = items.filter(item =>
        item.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle item selection/deselection
    const handleItemToggle = (itemName) => {
        let newSelectedItems;

        if (selectedItems.includes(itemName)) {
            // Remove item
            newSelectedItems = selectedItems.filter(item => item !== itemName);
        } else {
            // Add item (respect max limit)
            if (selectedItems.length >= maxItems) {
                return; // Prevent adding more than max items
            }
            newSelectedItems = [...selectedItems, itemName];
        }

        onChange(newSelectedItems);
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

    // Handle item tag removal
    const handleRemoveItem = (itemName, event) => {
        event.stopPropagation();
        const newSelectedItems = selectedItems.filter(item => item !== itemName);
        onChange(newSelectedItems);
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
        <div className={classNames.container || "multiselect-container"} ref={containerRef}>
            {/* Trigger */}
            <div
                className={`${classNames.trigger || "multiselect-trigger"} ${isOpen ? (classNames.open || 'open') : ''} ${error ? (classNames.error || 'error') : ''}`}
                onClick={handleToggleDropdown}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="button"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={`Select ${itemName}. ${selectedItems.length} selected`}
            >
                <div className={`${classNames.selectedDisplay || "selected-display"} ${selectedItems.length === 0 ? (classNames.empty || 'empty') : ''}`}>
                    {selectedItems.length === 0 ? (
                        <span>
                            {placeholder}{required && ' *'}
                        </span>
                    ) : (
                        selectedItems.map(item => (
                            <div key={item} className={classNames.itemTag || "item-tag"}>
                                <span>{item}</span>
                                <button
                                    type="button"
                                    className={classNames.itemTagRemove || "item-tag-remove"}
                                    onClick={(e) => handleRemoveItem(item, e)}
                                    aria-label={`Remove ${item}`}
                                    tabIndex={-1}
                                >
                                    ×
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className={classNames.dropdownArrow || "dropdown-arrow"}>
                    ▼
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={classNames.dropdown || "dropdown"}
                    role="listbox"
                    aria-label={`${itemName} options`}
                >
                    {/* Search */}
                    <div className={classNames.search || "search"}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className={classNames.searchInput || "search-input"}
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Search ${itemName}`}
                        />
                    </div>

                    {/* Items list */}
                    <div className={classNames.list || "list"}>
                        {filteredItems.length === 0 ? (
                            <div className={classNames.itemOption || "item-option"} style={{ color: '#999', fontStyle: 'italic' }}>
                                {searchTerm ? `No ${itemName} found` : `No ${itemName} available`}
                            </div>
                        ) : (
                            filteredItems.map(item => {
                                const isSelected = selectedItems.includes(item);
                                const isMaxReached = selectedItems.length >= maxItems && !isSelected;

                                return (
                                    <div
                                        key={item}
                                        className={`${classNames.itemOption || "item-option"} ${isSelected ? (classNames.selected || 'selected') : ''} ${isMaxReached ? (classNames.disabled || 'disabled') : ''}`}
                                        onClick={() => !isMaxReached && handleItemToggle(item)}
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
                                            className={classNames.itemCheckbox || "item-checkbox"}
                                            checked={isSelected}
                                            onChange={() => {}} // Handled by parent onClick
                                            tabIndex={-1}
                                            disabled={isMaxReached}
                                            aria-hidden="true"
                                        />
                                        <span>{item}</span>
                                        {isMaxReached && (
                                            <span style={{ fontSize: '0.7rem', marginLeft: '8px' }}>
                                                (Max {maxItems})
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer info */}
                    {selectedItems.length > 0 && (
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
                            {selectedItems.length} of {maxItems} {itemName} selected
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
            {!error && selectedItems.length === 0 && (
                <div style={{
                    fontSize: '0.8rem',
                    color: '#6c757d',
                    marginTop: '6px',
                    fontStyle: 'italic'
                }}>
                    You can select up to {maxItems} {itemName} that best describe your business
                </div>
            )}

            {/* Selected count helper */}
            {!error && selectedItems.length > 0 && (
                <div style={{
                    fontSize: '0.8rem',
                    color: selectedItems.length >= warningThreshold ? '#ffc107' : '#28a745',
                    marginTop: '6px',
                    textAlign: 'right'
                }}>
                    {selectedItems.length}/{maxItems} {itemName} selected
                    {selectedItems.length >= warningThreshold && selectedItems.length < maxItems && ' (almost at limit)'}
                    {selectedItems.length === maxItems && ' (maximum reached)'}
                </div>
            )}
        </div>
    );
};

export default GenericMultiSelect;