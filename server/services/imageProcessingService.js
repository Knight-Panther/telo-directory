// server/services/imageProcessingService.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * Image Processing Service for Business Submissions
 *
 * Features:
 * - Immediate processing on upload
 * - Multi-format optimization (WebP + AVIF)
 * - Consistent sizing and quality
 * - Error handling and validation
 * - Secure filename generation
 */

// Configuration
const PROCESSING_CONFIG = {
    // Output dimensions (maintaining aspect ratio)
    width: 800,
    height: 600,
    fit: 'cover',
    position: 'center',

    // Quality settings
    webp: {
        quality: 85,
        effort: 4, // Balance between speed and compression
    },
    avif: {
        quality: 80,
        effort: 4, // AVIF typically has better compression
    },

    // File size limits (in bytes)
    maxInputSize: 10 * 1024 * 1024, // 10MB max input
    maxOutputSize: 2 * 1024 * 1024,  // 2MB max output per format

    // Supported input formats
    supportedFormats: ['jpeg', 'jpg', 'png', 'webp', 'avif', 'tiff', 'gif'],

    // Upload directories
    submissionsDir: 'uploads/submissions',
    tempDir: 'uploads/temp',
};

/**
 * Ensure upload directories exist
 */
const ensureDirectories = async () => {
    const dirs = [
        path.join(__dirname, '..', PROCESSING_CONFIG.submissionsDir),
        path.join(__dirname, '..', PROCESSING_CONFIG.tempDir),
    ];

    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            console.error(`Failed to create directory ${dir}:`, error);
            throw error;
        }
    }
};

/**
 * Generate secure filename
 */
const generateSecureFilename = (submissionId, extension) => {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `submission-${submissionId}-${timestamp}-${random}.${extension}`;
};

/**
 * Validate uploaded image
 */
const validateImage = async (imageBuffer) => {
    try {
        // Check file size
        if (imageBuffer.length > PROCESSING_CONFIG.maxInputSize) {
            throw new Error(`Image too large. Maximum size: ${PROCESSING_CONFIG.maxInputSize / 1024 / 1024}MB`);
        }

        // Get image metadata using Sharp
        const metadata = await sharp(imageBuffer).metadata();

        // Check format
        if (!PROCESSING_CONFIG.supportedFormats.includes(metadata.format)) {
            throw new Error(`Unsupported format: ${metadata.format}. Supported: ${PROCESSING_CONFIG.supportedFormats.join(', ')}`);
        }

        // Check dimensions (prevent extremely large images)
        if (metadata.width > 10000 || metadata.height > 10000) {
            throw new Error('Image dimensions too large. Maximum: 10000x10000px');
        }

        // Check for potential issues
        if (!metadata.width || !metadata.height) {
            throw new Error('Invalid image: Could not read dimensions');
        }

        return {
            valid: true,
            metadata: {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                size: imageBuffer.length,
                hasAlpha: metadata.hasAlpha,
                colorspace: metadata.space,
            }
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message,
        };
    }
};

/**
 * Process image to WebP format
 */
const processToWebP = async (imageBuffer, outputPath) => {
    try {
        const webpBuffer = await sharp(imageBuffer)
            .resize(
                PROCESSING_CONFIG.width,
                PROCESSING_CONFIG.height,
                {
                    fit: PROCESSING_CONFIG.fit,
                    position: PROCESSING_CONFIG.position,
                    withoutEnlargement: true, // Don't upscale small images
                }
            )
            .webp(PROCESSING_CONFIG.webp)
            .toBuffer();

        // Check output size
        if (webpBuffer.length > PROCESSING_CONFIG.maxOutputSize) {
            console.warn(`WebP output size (${webpBuffer.length}) exceeds limit, reducing quality...`);

            // Retry with lower quality
            const retryBuffer = await sharp(imageBuffer)
                .resize(PROCESSING_CONFIG.width, PROCESSING_CONFIG.height, {
                    fit: PROCESSING_CONFIG.fit,
                    position: PROCESSING_CONFIG.position,
                    withoutEnlargement: true,
                })
                .webp({ ...PROCESSING_CONFIG.webp, quality: 70 })
                .toBuffer();

            await fs.writeFile(outputPath, retryBuffer);
            return { success: true, size: retryBuffer.length, quality: 70 };
        }

        await fs.writeFile(outputPath, webpBuffer);
        return { success: true, size: webpBuffer.length, quality: PROCESSING_CONFIG.webp.quality };

    } catch (error) {
        console.error('WebP processing error:', error);
        throw new Error(`WebP processing failed: ${error.message}`);
    }
};

/**
 * Process image to AVIF format
 */
const processToAVIF = async (imageBuffer, outputPath) => {
    try {
        const avifBuffer = await sharp(imageBuffer)
            .resize(
                PROCESSING_CONFIG.width,
                PROCESSING_CONFIG.height,
                {
                    fit: PROCESSING_CONFIG.fit,
                    position: PROCESSING_CONFIG.position,
                    withoutEnlargement: true,
                }
            )
            .avif(PROCESSING_CONFIG.avif)
            .toBuffer();

        // Check output size
        if (avifBuffer.length > PROCESSING_CONFIG.maxOutputSize) {
            console.warn(`AVIF output size (${avifBuffer.length}) exceeds limit, reducing quality...`);

            // Retry with lower quality
            const retryBuffer = await sharp(imageBuffer)
                .resize(PROCESSING_CONFIG.width, PROCESSING_CONFIG.height, {
                    fit: PROCESSING_CONFIG.fit,
                    position: PROCESSING_CONFIG.position,
                    withoutEnlargement: true,
                })
                .avif({ ...PROCESSING_CONFIG.avif, quality: 65 })
                .toBuffer();

            await fs.writeFile(outputPath, retryBuffer);
            return { success: true, size: retryBuffer.length, quality: 65 };
        }

        await fs.writeFile(outputPath, avifBuffer);
        return { success: true, size: avifBuffer.length, quality: PROCESSING_CONFIG.avif.quality };

    } catch (error) {
        console.error('AVIF processing error:', error);
        throw new Error(`AVIF processing failed: ${error.message}`);
    }
};

/**
 * Main function: Process submission image
 */
const processSubmissionImage = async (imageBuffer, submissionId, originalFilename = 'image') => {
    console.log(`🖼️ Processing image for submission: ${submissionId}`);

    try {
        // Ensure directories exist
        await ensureDirectories();

        // Validate the image
        const validation = await validateImage(imageBuffer);
        if (!validation.valid) {
            throw new Error(`Image validation failed: ${validation.error}`);
        }

        console.log(`✅ Image validation passed:`, validation.metadata);

        // Generate secure filenames
        const webpFilename = generateSecureFilename(submissionId, 'webp');
        const avifFilename = generateSecureFilename(submissionId, 'avif');

        const webpPath = path.join(__dirname, '..', PROCESSING_CONFIG.submissionsDir, webpFilename);
        const avifPath = path.join(__dirname, '..', PROCESSING_CONFIG.submissionsDir, avifFilename);

        // Process both formats concurrently
        console.log(`🔄 Processing to WebP and AVIF formats...`);

        const [webpResult, avifResult] = await Promise.all([
            processToWebP(imageBuffer, webpPath),
            processToAVIF(imageBuffer, avifPath),
        ]);

        console.log(`✅ Image processing completed:`);
        console.log(`   WebP: ${webpFilename} (${webpResult.size} bytes, quality: ${webpResult.quality})`);
        console.log(`   AVIF: ${avifFilename} (${avifResult.size} bytes, quality: ${avifResult.quality})`);

        return {
            success: true,
            originalMetadata: validation.metadata,
            webp: {
                filename: webpFilename,
                path: `${PROCESSING_CONFIG.submissionsDir}/${webpFilename}`,
                size: webpResult.size,
                quality: webpResult.quality,
            },
            avif: {
                filename: avifFilename,
                path: `${PROCESSING_CONFIG.submissionsDir}/${avifFilename}`,
                size: avifResult.size,
                quality: avifResult.quality,
            },
            processedAt: new Date(),
            submissionId,
            originalFilename,
        };

    } catch (error) {
        console.error(`❌ Image processing failed for submission ${submissionId}:`, error);

        // Clean up any partial files
        const webpFilename = generateSecureFilename(submissionId, 'webp');
        const avifFilename = generateSecureFilename(submissionId, 'avif');

        const webpPath = path.join(__dirname, '..', PROCESSING_CONFIG.submissionsDir, webpFilename);
        const avifPath = path.join(__dirname, '..', PROCESSING_CONFIG.submissionsDir, avifFilename);

        try {
            await Promise.all([
                fs.unlink(webpPath).catch(() => {}), // Ignore if file doesn't exist
                fs.unlink(avifPath).catch(() => {}),
            ]);
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
        }

        throw {
            success: false,
            error: error.message,
            submissionId,
            timestamp: new Date(),
        };
    }
};

/**
 * Get optimized image URL for frontend
 */
const getSubmissionImageUrl = (filename, baseUrl = '') => {
    if (!filename) return null;

    const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${cleanBaseUrl}/${PROCESSING_CONFIG.submissionsDir}/${filename}`;
};

/**
 * Delete submission images
 */
const deleteSubmissionImages = async (webpFilename, avifFilename) => {
    const deletions = [];

    if (webpFilename) {
        const webpPath = path.join(__dirname, '..', PROCESSING_CONFIG.submissionsDir, webpFilename);
        deletions.push(fs.unlink(webpPath).catch(err => console.warn(`Failed to delete WebP: ${err.message}`)));
    }

    if (avifFilename) {
        const avifPath = path.join(__dirname, '..', PROCESSING_CONFIG.submissionsDir, avifFilename);
        deletions.push(fs.unlink(avifPath).catch(err => console.warn(`Failed to delete AVIF: ${err.message}`)));
    }

    await Promise.all(deletions);
    console.log(`🗑️ Cleaned up submission images: ${webpFilename}, ${avifFilename}`);
};

/**
 * Get processing statistics (for monitoring)
 */
const getProcessingStats = () => {
    return {
        config: PROCESSING_CONFIG,
        supportedFormats: PROCESSING_CONFIG.supportedFormats,
        maxInputSize: `${PROCESSING_CONFIG.maxInputSize / 1024 / 1024}MB`,
        maxOutputSize: `${PROCESSING_CONFIG.maxOutputSize / 1024 / 1024}MB`,
        outputDimensions: `${PROCESSING_CONFIG.width}x${PROCESSING_CONFIG.height}`,
    };
};

module.exports = {
    processSubmissionImage,
    getSubmissionImageUrl,
    deleteSubmissionImages,
    getProcessingStats,
    validateImage,
    PROCESSING_CONFIG,
};