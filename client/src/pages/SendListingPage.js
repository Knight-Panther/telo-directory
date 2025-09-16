// client/src/pages/SendListingPage.js
import React, { useState } from 'react';
import CityMultiSelect from '../components/forms/CityMultiSelect';
import ImageUpload from '../components/forms/ImageUpload';
import submissionService from '../services/submissionService';
import styles from '../styles/send-listing.module.css';

// Static data arrays
const GEORGIAN_CITIES = [
    'Tbilisi', 'Batumi', 'Kutaisi', 'Rustavi', 'Gori', 'Zugdidi', 'Poti', 'Telavi',
    'Ozurgeti', 'Ambrolauri', 'Kobuleti', 'Khashuri', 'Samtredia', 'Senaki',
    'Zestaponi', 'Marneuli', 'Akhalkalaki', 'Lagodekhi', 'Bolnisi', 'Gardabani',
    'Akhaltsikhe', 'Mtskheta', 'Kaspi', 'Kvareli', 'Sighnaghi', 'Gurjaani',
    'Dusheti', 'Tianeti', 'Kareli', 'Khoni'
];

const BUSINESS_CATEGORIES = [
    'General Construction', 'Kitchen Renovation', 'Bathroom Renovation', 'Painting',
    'Electrical Work', 'Plumbing', 'Flooring', 'Roofing', 'Windows & Doors',
    'Interior Design', 'Landscaping', 'Cleaning Services', 'Renovation'
];

const SendListingPage = () => {
    // Form state
    const [formData, setFormData] = useState({
        businessName: '',
        category: '',
        businessType: 'individual',
        cities: [],
        mobile: '+995',
        shortDescription: '',
        hasCertificate: false,
        certificateDescription: '',
        profileImage: null,
        socialLinks: {
            facebook: '',
            instagram: '',
            tiktok: '',
            youtube: ''
        },
        submitterEmail: '',
        submitterName: ''
    });

    // UI state
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error'
    const [submitMessage, setSubmitMessage] = useState('');

    // Use static data arrays
    const cities = GEORGIAN_CITIES;
    const categories = BUSINESS_CATEGORIES;
    const citiesLoading = false;
    const categoriesLoading = false;

    // Handle form field changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'mobile') {
            // Format mobile number as user types
            const formatted = submissionService.formatMobileNumber(value);
            setFormData(prev => ({ ...prev, mobile: formatted }));
        } else if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: checked }));

            // Clear certificate description if unchecked
            if (name === 'hasCertificate' && !checked) {
                setFormData(prev => ({ ...prev, certificateDescription: '' }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // Clear field error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Handle social links changes
    const handleSocialLinkChange = (platform, value) => {
        setFormData(prev => ({
            ...prev,
            socialLinks: {
                ...prev.socialLinks,
                [platform]: value
            }
        }));

        // Clear social links errors
        if (errors.socialLinks?.[platform]) {
            setErrors(prev => ({
                ...prev,
                socialLinks: {
                    ...prev.socialLinks,
                    [platform]: ''
                }
            }));
        }
    };

    // Handle cities change
    const handleCitiesChange = (selectedCities) => {
        setFormData(prev => ({ ...prev, cities: selectedCities }));

        if (errors.cities) {
            setErrors(prev => ({ ...prev, cities: '' }));
        }
    };

    // Handle image change
    const handleImageChange = (file) => {
        setFormData(prev => ({ ...prev, profileImage: file }));

        if (errors.profileImage) {
            setErrors(prev => ({ ...prev, profileImage: '' }));
        }
    };

    // Character count helpers
    const getCharacterCount = (text, maxLength) => {
        const currentLength = text?.length || 0;
        return {
            current: currentLength,
            remaining: maxLength - currentLength,
            isWarning: currentLength > maxLength * 0.8,
            isError: currentLength > maxLength
        };
    };

    const descriptionCount = getCharacterCount(formData.shortDescription, 200);
    const certificateCount = getCharacterCount(formData.certificateDescription, 50);

    // Form validation
    const validateForm = () => {
        const validation = submissionService.validateSubmission(formData);
        setErrors(validation.errors);
        return validation.isValid;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear previous status
        setSubmitStatus(null);
        setSubmitMessage('');

        // Validate form
        if (!validateForm()) {
            setSubmitStatus('error');
            setSubmitMessage('Please fix the errors below and try again.');

            // Scroll to first error
            setTimeout(() => {
                const firstError = document.querySelector('.form-input.error, .form-select.error, .form-textarea.error');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstError.focus();
                }
            }, 100);
            return;
        }

        setIsSubmitting(true);

        try {
            console.log('🚀 Submitting business listing...');
            const response = await submissionService.submitBusiness(formData);

            console.log('✅ Submission successful:', response);

            setSubmitStatus('success');
            setSubmitMessage(
                `🎉 Your business listing has been submitted successfully!
                Your submission ID is: ${response.submission.id}.
                You'll receive a confirmation email shortly. We'll review your submission within 2-3 business days.`
            );

            // Reset form
            setFormData({
                businessName: '',
                category: '',
                businessType: 'individual',
                cities: [],
                mobile: '+995',
                shortDescription: '',
                hasCertificate: false,
                certificateDescription: '',
                profileImage: null,
                socialLinks: {
                    facebook: '',
                    instagram: '',
                    tiktok: '',
                    youtube: ''
                },
                submitterEmail: '',
                submitterName: ''
            });
            setErrors({});

            // Scroll to success message
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            console.error('❌ Submission failed:', error);

            setSubmitStatus('error');
            setSubmitMessage(error.message || 'Failed to submit business listing. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle form reset
    const handleReset = () => {
        if (window.confirm('Are you sure you want to clear all form data?')) {
            setFormData({
                businessName: '',
                category: '',
                businessType: 'individual',
                cities: [],
                mobile: '+995',
                shortDescription: '',
                hasCertificate: false,
                certificateDescription: '',
                profileImage: null,
                socialLinks: {
                    facebook: '',
                    instagram: '',
                    tiktok: '',
                    youtube: ''
                },
                submitterEmail: '',
                submitterName: ''
            });
            setErrors({});
            setSubmitStatus(null);
            setSubmitMessage('');
        }
    };

    return (
        <div className={styles.sendListingPage}>
            <div className={styles.sendListingContainer}>
                {/* Header */}
                <div className={styles.sendListingHeader}>
                    <h1>📋 Submit Your Business Listing</h1>
                    <p>Join Georgia's premier business directory and connect with customers across the country</p>
                </div>

                {/* Status Messages */}
                {submitStatus === 'success' && (
                    <div className={styles.successMessage}>
                        {submitMessage.split('\n').map((line, index) => (
                            <div key={index}>{line}</div>
                        ))}
                    </div>
                )}

                {submitStatus === 'error' && (
                    <div className={styles.errorMessage}>
                        {submitMessage}
                    </div>
                )}

                {/* Form */}
                <div className={styles.submissionFormContainer}>
                    <form onSubmit={handleSubmit} className={styles.submissionForm} noValidate>

                        {/* Business Information Section */}
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
                                    <label htmlFor="category" className={`${styles.formLabel} ${styles.required}`}>
                                        Category
                                    </label>
                                    <select
                                        id="category"
                                        name="category"
                                        className={`${styles.formSelect} ${errors.category ? styles.error : ''}`}
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        disabled={categoriesLoading}
                                        aria-describedby={errors.category ? 'category-error' : undefined}
                                    >
                                        <option value="">
                                            {categoriesLoading ? 'Loading categories...' : 'Select category'}
                                        </option>
                                        {categories.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.category && (
                                        <div id="category-error" className={styles.fieldError}>
                                            <span className={styles.fieldErrorIcon}>⚠</span>
                                            {errors.category}
                                        </div>
                                    )}
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
                                <CityMultiSelect
                                    cities={cities}
                                    selectedCities={formData.cities}
                                    onChange={handleCitiesChange}
                                    error={errors.cities}
                                    loading={citiesLoading}
                                    classNames={{
                                        container: styles.citiesMultiselectContainer,
                                        trigger: styles.citiesMultiselectTrigger,
                                        open: styles.open,
                                        error: styles.error,
                                        selectedDisplay: styles.citiesSelectedDisplay,
                                        empty: styles.empty,
                                        cityTag: styles.cityTag,
                                        cityTagRemove: styles.cityTagRemove,
                                        dropdownArrow: styles.citiesDropdownArrow,
                                        dropdown: styles.citiesDropdown,
                                        search: styles.citiesSearch,
                                        searchInput: styles.citiesSearchInput,
                                        list: styles.citiesList,
                                        cityOption: styles.cityOption,
                                        selected: styles.selected,
                                        disabled: styles.disabled,
                                        cityCheckbox: styles.cityCheckbox,
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

                        {/* Certificate Section */}
                        <div className={styles.formSection}>
                            <h3 className={styles.formSectionTitle}>
                                <span className={styles.formSectionIcon}>🏅</span>
                                Professional Certification
                            </h3>

                            <div className={styles.certificateToggle}>
                                <input
                                    type="checkbox"
                                    id="hasCertificate"
                                    name="hasCertificate"
                                    className={styles.certificateCheckbox}
                                    checked={formData.hasCertificate}
                                    onChange={handleInputChange}
                                />
                                <label htmlFor="hasCertificate" className={styles.certificateLabel}>
                                    My business has professional certifications or licenses
                                </label>
                            </div>

                            <div className={`${styles.certificateDescriptionGroup} ${formData.hasCertificate ? styles.visible : ''}`}>
                                <label htmlFor="certificateDescription" className={`${styles.formLabel} ${styles.required}`}>
                                    Certificate Details
                                </label>
                                <textarea
                                    id="certificateDescription"
                                    name="certificateDescription"
                                    className={`${styles.formTextarea} ${errors.certificateDescription ? styles.error : ''}`}
                                    value={formData.certificateDescription}
                                    onChange={handleInputChange}
                                    placeholder="Briefly describe your certifications, licenses, or professional qualifications..."
                                    maxLength="50"
                                    rows="2"
                                    disabled={!formData.hasCertificate}
                                    aria-describedby={errors.certificateDescription ? 'certificateDescription-error' : 'certificateDescription-count'}
                                />
                                <div
                                    id="certificateDescription-count"
                                    className={`${styles.characterCounter} ${certificateCount.isError ? styles.error : certificateCount.isWarning ? styles.warning : ''}`}
                                >
                                    {certificateCount.current}/50 characters
                                </div>
                                {errors.certificateDescription && (
                                    <div id="certificateDescription-error" className={styles.fieldError}>
                                        <span className={styles.fieldErrorIcon}>⚠</span>
                                        {errors.certificateDescription}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Image Upload Section */}
                        <div className={styles.formSection}>
                            <h3 className={styles.formSectionTitle}>
                                <span className={styles.formSectionIcon}>📷</span>
                                Business Profile Image
                            </h3>

                            <ImageUpload
                                onImageChange={handleImageChange}
                                error={errors.profileImage}
                                required={true}
                                maxSize={10}
                                classNames={{
                                    container: styles.imageUploadContainer,
                                    dragover: styles.dragover,
                                    error: styles.error,
                                    input: styles.imageUploadInput,
                                    content: styles.imageUploadContent,
                                    icon: styles.imageUploadIcon,
                                    text: styles.imageUploadText,
                                    hint: styles.imageUploadHint,
                                    preview: styles.imagePreview,
                                    previewImg: styles.imagePreviewImg,
                                    previewInfo: styles.imagePreviewInfo,
                                    previewRemove: styles.imagePreviewRemove,
                                    fieldError: styles.fieldError,
                                    fieldErrorIcon: styles.fieldErrorIcon
                                }}
                            />
                        </div>

                        {/* Social Links Section */}
                        <div className={styles.formSection}>
                            <h3 className={styles.formSectionTitle}>
                                <span className={styles.formSectionIcon}>🌐</span>
                                Social Media & Online Presence
                            </h3>
                            <div style={{
                                background: '#f0f8ff',
                                padding: '12px',
                                borderRadius: '6px',
                                marginBottom: '16px',
                                border: '1px solid #b3d7ff',
                                fontSize: '0.9rem',
                                color: '#0066cc'
                            }}>
                                <strong>📌 Required:</strong> Please provide at least one Facebook or Instagram link to help customers find your business online.
                            </div>

                            <div className={styles.socialLinksGrid}>
                                {[
                                    { platform: 'facebook', icon: '📘', placeholder: 'https://facebook.com/your-business' },
                                    { platform: 'instagram', icon: '📸', placeholder: 'https://instagram.com/your-business' },
                                    { platform: 'tiktok', icon: '🎵', placeholder: 'https://tiktok.com/@your-business' },
                                    { platform: 'youtube', icon: '📺', placeholder: 'https://youtube.com/your-channel' }
                                ].map(({ platform, icon, placeholder }) => (
                                    <div key={platform} className={styles.socialInputGroup}>
                                        <label htmlFor={`social-${platform}`} className={styles.formLabel}>
                                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <span className={`${styles.socialIcon} ${styles[platform]}`}>
                                                {icon}
                                            </span>
                                            <input
                                                type="url"
                                                id={`social-${platform}`}
                                                className={`${styles.formInput} ${styles.socialInput} ${errors.socialLinks?.[platform] ? styles.error : ''}`}
                                                value={formData.socialLinks[platform]}
                                                onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                                                placeholder={placeholder}
                                                aria-describedby={errors.socialLinks?.[platform] ? `social-${platform}-error` : undefined}
                                            />
                                        </div>
                                        {errors.socialLinks?.[platform] && (
                                            <div id={`social-${platform}-error`} className={styles.fieldError}>
                                                <span className={styles.fieldErrorIcon}>⚠</span>
                                                {errors.socialLinks[platform]}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Social links requirement error */}
                            {errors.socialLinks?.required && (
                                <div className={styles.fieldError} style={{ marginTop: '12px' }}>
                                    <span className={styles.fieldErrorIcon}>⚠</span>
                                    {errors.socialLinks.required}
                                </div>
                            )}
                        </div>

                        {/* Contact Information Section */}
                        <div className={styles.formSection}>
                            <h3 className={styles.formSectionTitle}>
                                <span className={styles.formSectionIcon}>📞</span>
                                Contact Information
                            </h3>

                            <div className={styles.formRow}>
                                <div className={`${styles.formGroup} ${styles.half}`}>
                                    <label htmlFor="submitterName" className={`${styles.formLabel} ${styles.required}`}>
                                        Your Name
                                    </label>
                                    <input
                                        type="text"
                                        id="submitterName"
                                        name="submitterName"
                                        className={`${styles.formInput} ${errors.submitterName ? styles.error : ''}`}
                                        value={formData.submitterName}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name"
                                        maxLength="50"
                                        aria-describedby={errors.submitterName ? 'submitterName-error' : undefined}
                                    />
                                    {errors.submitterName && (
                                        <div id="submitterName-error" className={styles.fieldError}>
                                            <span className={styles.fieldErrorIcon}>⚠</span>
                                            {errors.submitterName}
                                        </div>
                                    )}
                                </div>

                                <div className={`${styles.formGroup} ${styles.half}`}>
                                    <label htmlFor="submitterEmail" className={`${styles.formLabel} ${styles.required}`}>
                                        Your Email
                                    </label>
                                    <input
                                        type="email"
                                        id="submitterEmail"
                                        name="submitterEmail"
                                        className={`${styles.formInput} ${errors.submitterEmail ? styles.error : ''}`}
                                        value={formData.submitterEmail}
                                        onChange={handleInputChange}
                                        placeholder="your.email@example.com"
                                        maxLength="100"
                                        aria-describedby={errors.submitterEmail ? 'submitterEmail-error' : undefined}
                                    />
                                    {errors.submitterEmail && (
                                        <div id="submitterEmail-error" className={styles.fieldError}>
                                            <span className={styles.fieldErrorIcon}>⚠</span>
                                            {errors.submitterEmail}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                background: '#f8f9fa',
                                padding: '16px',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                color: '#6c757d',
                                marginTop: '12px'
                            }}>
                                📧 <strong>Privacy Note:</strong> Your email will only be used for submission updates and will not be displayed publicly.
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className={styles.formActions}>
                            <button
                                type="button"
                                onClick={handleReset}
                                className={`${styles.btn} ${styles.btnSecondary}`}
                                disabled={isSubmitting}
                            >
                                🔄 Clear Form
                            </button>

                            <button
                                type="submit"
                                className={`${styles.btn} ${styles.btnPrimary} ${isSubmitting ? styles.btnLoading : ''}`}
                                disabled={isSubmitting || citiesLoading || categoriesLoading}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className={styles.spinner}></span>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        📤 Submit Listing
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SendListingPage;