// client/src/components/forms/ImageUpload.js
import React, { useState, useRef, useCallback } from 'react';
import submissionService from '../../services/submissionService';

const ImageUpload = ({
    onImageChange,
    error,
    required = true,
    maxSize = 10, // MB
    acceptedFormats = ['JPEG', 'JPG', 'PNG', 'WebP', 'AVIF', 'TIFF', 'GIF']
}) => {
    const [dragOver, setDragOver] = useState(false);
    const [preview, setPreview] = useState(null);
    const [fileInfo, setFileInfo] = useState(null);
    const [validationError, setValidationError] = useState('');
    const fileInputRef = useRef(null);

    // Handle file selection
    const handleFileSelect = useCallback((file) => {
        if (!file) {
            clearImage();
            return;
        }

        // Validate file
        const validation = submissionService.validateImageFile(file);

        if (!validation.isValid) {
            setValidationError(validation.errors.join(', '));
            clearImage();
            return;
        }

        setValidationError('');

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target.result);
            setFileInfo(validation.fileInfo);
            onImageChange(file);
        };

        reader.onerror = () => {
            setValidationError('Failed to read image file');
            clearImage();
        };

        reader.readAsDataURL(file);
    }, [onImageChange]);

    // Clear image
    const clearImage = useCallback(() => {
        setPreview(null);
        setFileInfo(null);
        setValidationError('');
        onImageChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [onImageChange]);

    // Handle file input change
    const handleInputChange = (e) => {
        const file = e.target.files?.[0];
        handleFileSelect(file);
    };

    // Handle drag and drop
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Only remove drag over if we're leaving the container
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOver(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    // Handle click to upload
    const handleClick = () => {
        fileInputRef.current?.click();
    };

    // Handle keyboard interaction
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    const displayError = error || validationError;

    return (
        <div className="image-upload-wrapper">
            {!preview ? (
                /* Upload Area */
                <div
                    className={`image-upload-container ${dragOver ? 'dragover' : ''} ${displayError ? 'error' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    role="button"
                    aria-label="Upload profile image"
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="image-upload-input"
                        accept="image/*"
                        onChange={handleInputChange}
                        aria-hidden="true"
                    />

                    <div className="image-upload-content">
                        <div className="image-upload-icon">
                            📷
                        </div>

                        <div className="image-upload-text">
                            <strong>Click to upload</strong> or drag and drop
                        </div>

                        <div className="image-upload-hint">
                            {acceptedFormats.join(', ')} up to {maxSize}MB
                            {required && (
                                <div style={{ marginTop: '4px', color: 'var(--danger-red)' }}>
                                    * Required
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* Preview Area */
                <div className="image-preview">
                    <img
                        src={preview}
                        alt="Business profile preview"
                        className="image-preview-img"
                    />

                    <div className="image-preview-info">
                        <div style={{ marginBottom: '8px' }}>
                            <strong>📁 {fileInfo?.name}</strong>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '8px',
                            fontSize: '0.8rem',
                            color: '#6c757d'
                        }}>
                            <div>
                                <strong>Size:</strong> {fileInfo?.sizeFormatted}
                            </div>
                            <div>
                                <strong>Type:</strong> {fileInfo?.type?.split('/')[1]?.toUpperCase()}
                            </div>
                        </div>

                        <div style={{
                            marginTop: '8px',
                            padding: '8px',
                            background: '#e8f5e9',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            color: '#2e7d32'
                        }}>
                            ✅ Image will be automatically optimized for web performance
                        </div>
                    </div>

                    <button
                        type="button"
                        className="image-preview-remove"
                        onClick={clearImage}
                        aria-label="Remove selected image"
                    >
                        🗑️ Remove Image
                    </button>
                </div>
            )}

            {/* Error Messages */}
            {displayError && (
                <div className="field-error" style={{ marginTop: '8px' }}>
                    <span className="field-error-icon">⚠</span>
                    {displayError}
                </div>
            )}

            {/* Help Text */}
            {!displayError && !preview && (
                <div style={{
                    fontSize: '0.8rem',
                    color: '#6c757d',
                    marginTop: '8px',
                    textAlign: 'center',
                    fontStyle: 'italic'
                }}>
                    Your image will be automatically resized and optimized
                </div>
            )}

            {/* Processing Info */}
            {!displayError && preview && (
                <div style={{
                    fontSize: '0.8rem',
                    color: '#17a2b8',
                    marginTop: '8px',
                    textAlign: 'center',
                    background: '#d1ecf1',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #b3d4fc'
                }}>
                    💡 <strong>Processing Info:</strong> Your image will be automatically converted to modern formats (WebP & AVIF) and resized to 800x600px for optimal performance across all devices.
                </div>
            )}
        </div>
    );
};

export default ImageUpload;