// client/src/components/forms/BusinessInfoSection.js
import React from 'react';
import GenericMultiSelect from './GenericMultiSelect';

const BusinessInfoSection = ({
    formData,
    errors,
    handleInputChange,
    handleCategoriesChange,
    handleCitiesChange,
    categories,
    cities,
    descriptionCount,
    styles
}) => {
    return (
        <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>
                <span className={styles.formSectionIcon}>🏢</span>
                Business Information
            </h3>

            <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.half}`}>
                    <label htmlFor="businessName" className={`${styles.formLabel} ${styles.required}`}>
                        Business Name
                    </label>
                    <input
                        type="text"
                        id="businessName"
                        name="businessName"
                        className={`${styles.formInput} ${errors.businessName ? styles.error : ''}`}
                        value={formData.businessName}
                        onChange={handleInputChange}
                        placeholder="Enter your business name"
                        maxLength="100"
                        aria-describedby={errors.businessName ? 'businessName-error' : undefined}
                    />
                    {errors.businessName && (
                        <div id="businessName-error" className={styles.fieldError}>
                            <span className={styles.fieldErrorIcon}>⚠</span>
                            {errors.businessName}
                        </div>
                    )}
                </div>

                <div className={`${styles.formGroup} ${styles.half}`}>
                    <label className={`${styles.formLabel} ${styles.required}`}>
                        Business Categories
                    </label>
                    <GenericMultiSelect
                        items={categories}
                        selectedItems={formData.categories}
                        onChange={handleCategoriesChange}
                        error={errors.categories}
                        maxItems={5}
                        placeholder="Select business categories"
                        searchPlaceholder="Search categories..."
                        itemName="category"
                        classNames={{
                            container: styles.categoriesMultiselectContainer,
                            trigger: styles.categoriesMultiselectTrigger,
                            open: styles.open,
                            error: styles.error,
                            selectedDisplay: styles.categoriesSelectedDisplay,
                            empty: styles.empty,
                            itemTag: styles.categoryTag,
                            itemTagRemove: styles.categoryTagRemove,
                            dropdownArrow: styles.categoriesDropdownArrow,
                            dropdown: styles.categoriesDropdown,
                            search: styles.categoriesSearch,
                            searchInput: styles.categoriesSearchInput,
                            list: styles.categoriesList,
                            itemOption: styles.categoryOption,
                            selected: styles.selected,
                            disabled: styles.disabled,
                            itemCheckbox: styles.categoryCheckbox,
                            fieldError: styles.fieldError,
                            fieldErrorIcon: styles.fieldErrorIcon
                        }}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.half}`}>
                    <label htmlFor="businessType" className={`${styles.formLabel} ${styles.required}`}>
                        Business Type
                    </label>
                    <select
                        id="businessType"
                        name="businessType"
                        className={`${styles.formSelect} ${errors.businessType ? styles.error : ''}`}
                        value={formData.businessType}
                        onChange={handleInputChange}
                        aria-describedby={errors.businessType ? 'businessType-error' : undefined}
                    >
                        <option value="individual">Individual</option>
                        <option value="company">Company</option>
                    </select>
                    {errors.businessType && (
                        <div id="businessType-error" className={styles.fieldError}>
                            <span className={styles.fieldErrorIcon}>⚠</span>
                            {errors.businessType}
                        </div>
                    )}
                </div>

                <div className={`${styles.formGroup} ${styles.half}`}>
                    <label htmlFor="mobile" className={`${styles.formLabel} ${styles.required}`}>
                        Mobile Number
                    </label>
                    <div className={styles.mobileInputContainer}>
                        <input
                            type="tel"
                            id="mobile"
                            name="mobile"
                            className={`${styles.formInput} ${styles.mobileInput} ${errors.mobile ? styles.error : ''}`}
                            value={formData.mobile}
                            onChange={handleInputChange}
                            placeholder="+995XXXXXXXXX"
                            maxLength="13"
                            aria-describedby={errors.mobile ? 'mobile-error' : 'mobile-hint'}
                        />
                    </div>
                    <div id="mobile-hint" className={styles.mobileFormatHint}>
                        Format: +995XXXXXXXXX
                    </div>
                    {errors.mobile && (
                        <div id="mobile-error" className={styles.fieldError}>
                            <span className={styles.fieldErrorIcon}>⚠</span>
                            {errors.mobile}
                        </div>
                    )}
                </div>
            </div>

            {/* Cities Selection */}
            <div className={styles.formGroup}>
                <label className={`${styles.formLabel} ${styles.required}`}>
                    Service Areas
                </label>
                <GenericMultiSelect
                    items={cities}
                    selectedItems={formData.cities}
                    onChange={handleCitiesChange}
                    error={errors.cities}
                    maxItems={10}
                    placeholder="Select cities where you operate (or 'All Georgia')"
                    searchPlaceholder="Search cities..."
                    itemName="city"
                    classNames={{
                        container: styles.citiesMultiselectContainer,
                        trigger: styles.citiesMultiselectTrigger,
                        open: styles.open,
                        error: styles.error,
                        selectedDisplay: styles.citiesSelectedDisplay,
                        empty: styles.empty,
                        itemTag: styles.cityTag,
                        itemTagRemove: styles.cityTagRemove,
                        dropdownArrow: styles.citiesDropdownArrow,
                        dropdown: styles.citiesDropdown,
                        search: styles.citiesSearch,
                        searchInput: styles.citiesSearchInput,
                        list: styles.citiesList,
                        itemOption: styles.cityOption,
                        selected: styles.selected,
                        disabled: styles.disabled,
                        itemCheckbox: styles.cityCheckbox,
                        fieldError: styles.fieldError,
                        fieldErrorIcon: styles.fieldErrorIcon
                    }}
                />
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
                <label htmlFor="shortDescription" className={styles.formLabel}>
                    Business Description
                </label>
                <textarea
                    id="shortDescription"
                    name="shortDescription"
                    className={`${styles.formTextarea} ${errors.shortDescription ? styles.error : ''}`}
                    value={formData.shortDescription}
                    onChange={handleInputChange}
                    placeholder="Briefly describe your business, services, and what makes you unique..."
                    maxLength="200"
                    rows="4"
                    aria-describedby={errors.shortDescription ? 'shortDescription-error' : 'shortDescription-count'}
                />
                <div
                    id="shortDescription-count"
                    className={`${styles.characterCounter} ${descriptionCount.isError ? styles.error : descriptionCount.isWarning ? styles.warning : ''}`}
                >
                    {descriptionCount.current}/200 characters
                </div>
                {errors.shortDescription && (
                    <div id="shortDescription-error" className={styles.fieldError}>
                        <span className={styles.fieldErrorIcon}>⚠</span>
                        {errors.shortDescription}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BusinessInfoSection;