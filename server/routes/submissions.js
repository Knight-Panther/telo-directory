// server/routes/submissions.js
const express = require('express');
const multer = require('multer');
const BusinessSubmission = require('../models/BusinessSubmission');
const { GEORGIAN_CITIES, validateCities } = require('../config/cities');
const { processSubmissionImage } = require('../services/imageProcessingService');
const { sendBusinessSubmissionNotification, sendSubmissionConfirmation } = require('../services/emailService');
const Category = require('../models/Category');

const router = express.Router();

// Configure multer for image uploads (memory storage for immediate processing)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1, // Only one file
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/avif',
            'image/tiff',
            'image/gif'
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed: ${allowedMimeTypes.join(', ')}`), false);
        }
    }
});

// Validation middleware
const validateSubmissionData = (req, res, next) => {
    const {
        businessName,
        category,
        businessType,
        cities,
        mobile,
        shortDescription,
        hasCertificate,
        certificateDescription,
        submitterEmail,
        submitterName,
        socialLinks
    } = req.body;

    const errors = [];

    // Required fields validation
    if (!businessName?.trim()) errors.push('Business name is required');
    if (!category?.trim()) errors.push('Category is required');
    if (!businessType || !['individual', 'company'].includes(businessType)) {
        errors.push('Business type must be either "individual" or "company"');
    }
    if (!submitterEmail?.trim()) errors.push('Submitter email is required');
    if (!submitterName?.trim()) errors.push('Submitter name is required');
    if (!mobile?.trim()) errors.push('Mobile number is required');

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (submitterEmail && !emailRegex.test(submitterEmail)) {
        errors.push('Invalid email format');
    }

    // Georgian mobile format validation: +995XXXXXXXXX (must be exactly 13 characters)
    if (mobile && mobile.trim()) {
        const georgianMobileRegex = /^\+995[0-9]{9}$/;
        if (!georgianMobileRegex.test(mobile.trim())) {
            errors.push('Mobile number must be in Georgian format: +995XXXXXXXXX (example: +995599304009)');
        }
    }

    // Cities validation
    let parsedCities = [];
    try {
        parsedCities = Array.isArray(cities) ? cities : JSON.parse(cities || '[]');
    } catch (e) {
        errors.push('Cities must be a valid array');
    }

    const cityValidation = validateCities(parsedCities);
    if (!cityValidation.valid) {
        errors.push(cityValidation.error);
    }

    // Description length validation
    if (shortDescription && shortDescription.length > 200) {
        errors.push('Description cannot exceed 200 characters');
    }

    // Certificate validation
    const certStatus = hasCertificate === 'true' || hasCertificate === true;
    if (certStatus && (!certificateDescription || certificateDescription.trim().length === 0)) {
        errors.push('Certificate description is required when certificate is selected');
    }
    if (certificateDescription && certificateDescription.length > 50) {
        errors.push('Certificate description cannot exceed 50 characters');
    }

    // Social links validation
    let parsedSocialLinks = {};
    try {
        parsedSocialLinks = typeof socialLinks === 'string'
            ? JSON.parse(socialLinks || '{}')
            : socialLinks || {};
    } catch (e) {
        errors.push('Social links must be valid JSON');
    }

    // Check if at least one Facebook or Instagram link is provided
    const hasFacebook = parsedSocialLinks.facebook?.trim();
    const hasInstagram = parsedSocialLinks.instagram?.trim();

    if (!hasFacebook && !hasInstagram) {
        errors.push('At least one Facebook or Instagram link is required');
    }

    // URL validation for social links
    const urlRegex = /^https?:\/\/.+/;
    ['facebook', 'instagram', 'tiktok', 'youtube'].forEach(platform => {
        const url = parsedSocialLinks[platform];
        if (url && url.trim() && !urlRegex.test(url.trim())) {
            errors.push(`${platform} URL must be a valid HTTP/HTTPS URL`);
        }
    });

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }

    // Add validated data to request
    req.validatedData = {
        businessName: businessName.trim(),
        category: category.trim(),
        businessType,
        cities: cityValidation.cities,
        mobile: mobile.trim(),
        shortDescription: shortDescription?.trim() || '',
        hasCertificate: certStatus,
        certificateDescription: certStatus ? certificateDescription?.trim() : '',
        submitterEmail: submitterEmail.toLowerCase().trim(),
        submitterName: submitterName.trim(),
        socialLinks: {
            facebook: parsedSocialLinks.facebook?.trim() || '',
            instagram: parsedSocialLinks.instagram?.trim() || '',
            tiktok: parsedSocialLinks.tiktok?.trim() || '',
            youtube: parsedSocialLinks.youtube?.trim() || '',
        },
        submitterIp: req.ip || req.connection.remoteAddress
    };

    next();
};

/**
 * GET /api/submissions/cities
 * Returns list of available Georgian cities
 */
router.get('/cities', (req, res) => {
    try {
        res.json({
            success: true,
            cities: GEORGIAN_CITIES,
            count: GEORGIAN_CITIES.length
        });
    } catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cities'
        });
    }
});

/**
 * GET /api/submissions/categories
 * Returns list of available categories from business service
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json({
            success: true,
            categories: categories.map(cat => ({
                _id: cat._id,
                name: cat.name
            })),
            count: categories.length
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories'
        });
    }
});

/**
 * POST /api/submissions/create
 * Creates a new business submission
 */
router.post('/create', upload.single('profileImage'), validateSubmissionData, async (req, res) => {
    console.log('📝 New business submission request received');

    try {
        const validatedData = req.validatedData;
        const imageFile = req.file;

        // Check if image was uploaded
        if (!imageFile) {
            return res.status(400).json({
                success: false,
                error: 'Profile image is required'
            });
        }

        // Create the submission record first (to get submission ID)
        const submission = new BusinessSubmission(validatedData);
        await submission.save();

        console.log(`✅ Submission created with ID: ${submission.submissionId}`);

        let imageProcessingResult = null;

        try {
            // Process the image immediately
            console.log(`🖼️ Processing image for submission: ${submission.submissionId}`);

            imageProcessingResult = await processSubmissionImage(
                imageFile.buffer,
                submission.submissionId,
                imageFile.originalname
            );

            // Update submission with image paths
            submission.originalImage = imageFile.originalname;
            submission.profileImageWebp = imageProcessingResult.webp.filename;
            submission.profileImageAvif = imageProcessingResult.avif.filename;
            submission.imageProcessedAt = imageProcessingResult.processedAt;

            await submission.save();

            console.log(`✅ Image processing completed for submission: ${submission.submissionId}`);

        } catch (imageError) {
            console.error(`❌ Image processing failed for submission ${submission.submissionId}:`, imageError);

            // Delete the submission if image processing fails
            await BusinessSubmission.findByIdAndDelete(submission._id);

            return res.status(500).json({
                success: false,
                error: 'Image processing failed',
                details: imageError.message || 'Unknown image processing error'
            });
        }

        // Send email notifications concurrently
        try {
            console.log(`📧 Sending email notifications for submission: ${submission.submissionId}`);

            await Promise.all([
                sendBusinessSubmissionNotification(submission, req.ip),
                sendSubmissionConfirmation(submission)
            ]);

            console.log(`✅ Email notifications sent for submission: ${submission.submissionId}`);

        } catch (emailError) {
            console.error(`⚠️ Email notification failed for submission ${submission.submissionId}:`, emailError);
            // Don't fail the request if email fails - submission is still valid
        }

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Business submission received successfully',
            submission: {
                id: submission.submissionId,
                businessName: submission.businessName,
                category: submission.category,
                cities: submission.cities,
                status: submission.status,
                submittedAt: submission.submittedAt,
                hasImage: !!submission.profileImageWebp,
            }
        });

        console.log(`🎉 Business submission completed successfully: ${submission.submissionId}`);

    } catch (error) {
        console.error('❌ Business submission failed:', error);

        // Determine error type and status code
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: Object.values(error.errors).map(err => err.message)
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: 'Duplicate submission detected'
            });
        }

        // Generic server error
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
});

/**
 * GET /api/submissions/status/:submissionId
 * Check status of a specific submission (for user follow-up)
 */
router.get('/status/:submissionId', async (req, res) => {
    try {
        const { submissionId } = req.params;

        const submission = await BusinessSubmission.findOne(
            { submissionId },
            'submissionId businessName status submittedAt reviewedAt rejectionReason'
        );

        if (!submission) {
            return res.status(404).json({
                success: false,
                error: 'Submission not found'
            });
        }

        res.json({
            success: true,
            submission: {
                id: submission.submissionId,
                businessName: submission.businessName,
                status: submission.status,
                submittedAt: submission.submittedAt,
                reviewedAt: submission.reviewedAt,
                rejectionReason: submission.rejectionReason || null
            }
        });

    } catch (error) {
        console.error('Error fetching submission status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch submission status'
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size: 10MB'
            });
        }

        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Too many files. Only one image allowed'
            });
        }

        return res.status(400).json({
            success: false,
            error: `Upload error: ${error.message}`
        });
    }

    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }

    // Pass to default error handler
    next(error);
});

module.exports = router;