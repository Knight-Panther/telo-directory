// client/src/components/forms/CityMultiSelect.js
import React, { useState, useRef, useEffect } from 'react';

const CityMultiSelect = ({
    cities = [],
    selectedCities = [],
    onChange,
    error,
    required = true,
    classNames = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Filter cities based on search term
    const filteredCities = cities.filter(city =>
        city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle city selection/deselection
    const handleCityToggle = (cityName) => {
        let newSelectedCities;

        if (selectedCities.includes(cityName)) {
            // Remove city
            newSelectedCities = selectedCities.filter(city => city !== cityName);
        } else {
            // Add city (max 10 cities)
            if (selectedCities.length >= 10) {
                return; // Prevent adding more than 10 cities
            }
            newSelectedCities = [...selectedCities, cityName];
        }

        onChange(newSelectedCities);
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

    // Handle city tag removal
    const handleRemoveCity = (cityName, event) => {
        event.stopPropagation();
        const newSelectedCities = selectedCities.filter(city => city !== cityName);
        onChange(newSelectedCities);
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
        <div className={classNames.container || "cities-multiselect-container"} ref={containerRef}>
            {/* Trigger */}
            <div
                className={`${classNames.trigger || "cities-multiselect-trigger"} ${isOpen ? (classNames.open || 'open') : ''} ${error ? (classNames.error || 'error') : ''}`}
                onClick={handleToggleDropdown}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="button"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={`Select cities. ${selectedCities.length} selected`}
            >
                <div className={`${classNames.selectedDisplay || "cities-selected-display"} ${selectedCities.length === 0 ? (classNames.empty || 'empty') : ''}`}>
                    {selectedCities.length === 0 ? (
                        <span>
                            Select cities where you operate{required && ' *'}
                        </span>
                    ) : (
                        selectedCities.map(city => (
                            <div key={city} className={classNames.cityTag || "city-tag"}>
                                <span>{city}</span>
                                <button
                                    type="button"
                                    className={classNames.cityTagRemove || "city-tag-remove"}
                                    onClick={(e) => handleRemoveCity(city, e)}
                                    aria-label={`Remove ${city}`}
                                    tabIndex={-1}
                                >
                                    ×
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className={classNames.dropdownArrow || "cities-dropdown-arrow"}>
                    ▼
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={classNames.dropdown || "cities-dropdown"}
                    role="listbox"
                    aria-label="City options"
                >
                    {/* Search */}
                    <div className={classNames.search || "cities-search"}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className={classNames.searchInput || "cities-search-input"}
                            placeholder="Search cities..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Search cities"
                        />
                    </div>

                    {/* Cities list */}
                    <div className={classNames.list || "cities-list"}>
                        {filteredCities.length === 0 ? (
                            <div className={classNames.cityOption || "city-option"} style={{ color: '#999', fontStyle: 'italic' }}>
                                {searchTerm ? 'No cities found' : 'No cities available'}
                            </div>
                        ) : (
                            filteredCities.map(city => {
                                const isSelected = selectedCities.includes(city);
                                const isMaxReached = selectedCities.length >= 10 && !isSelected;

                                return (
                                    <div
                                        key={city}
                                        className={`${classNames.cityOption || "city-option"} ${isSelected ? (classNames.selected || 'selected') : ''} ${isMaxReached ? (classNames.disabled || 'disabled') : ''}`}
                                        onClick={() => !isMaxReached && handleCityToggle(city)}
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
                                            className={classNames.cityCheckbox || "city-checkbox"}
                                            checked={isSelected}
                                            onChange={() => {}} // Handled by parent onClick
                                            tabIndex={-1}
                                            disabled={isMaxReached}
                                            aria-hidden="true"
                                        />
                                        <span>{city}</span>
                                        {isMaxReached && (
                                            <span style={{ fontSize: '0.7rem', marginLeft: '8px' }}>
                                                (Max 10)
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer info */}
                    {selectedCities.length > 0 && (
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
                            {selectedCities.length} of 10 cities selected
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
            {!error && selectedCities.length === 0 && (
                <div style={{
                    fontSize: '0.8rem',
                    color: '#6c757d',
                    marginTop: '6px',
                    fontStyle: 'italic'
                }}>
                    You can select up to 10 cities where your business operates
                </div>
            )}

            {/* Selected count helper */}
            {!error && selectedCities.length > 0 && (
                <div style={{
                    fontSize: '0.8rem',
                    color: selectedCities.length >= 8 ? '#ffc107' : '#28a745',
                    marginTop: '6px',
                    textAlign: 'right'
                }}>
                    {selectedCities.length}/10 cities selected
                    {selectedCities.length >= 8 && selectedCities.length < 10 && ' (almost at limit)'}
                    {selectedCities.length === 10 && ' (maximum reached)'}
                </div>
            )}
        </div>
    );
};

export default CityMultiSelect;