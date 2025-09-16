// server/models/BusinessSubmission.js
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const businessSubmissionSchema = new mongoose.Schema(
    {
        // Auto-generated submission ID for easy reference
        submissionId: {
            type: String,
            unique: true,
            default: () => nanoid(8),
        },

        // Basic Business Information
        businessName: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
        },
        businessType: {
            type: String,
            enum: ["individual", "company"],
            required: true,
        },
        cities: [{
            type: String,
            required: true,
            trim: true,
        }], // Multiple cities array
        mobile: {
            type: String,
            required: true,
            trim: true,
        },

        // Enhanced Fields
        shortDescription: {
            type: String,
            maxlength: 200,
            trim: true,
        },
        hasCertificate: {
            type: Boolean,
            default: false,
        },
        certificateDescription: {
            type: String,
            maxlength: 50,
            trim: true,
            required: function() {
                return this.hasCertificate === true;
            }
        },

        // Image Storage (processed immediately)
        originalImage: String,           // Original uploaded filename
        profileImageWebp: String,        // Optimized WebP version
        profileImageAvif: String,        // Optimized AVIF version
        imageProcessedAt: Date,

        // Enhanced Social Links
        socialLinks: {
            facebook: { type: String, default: "", trim: true },
            instagram: { type: String, default: "", trim: true },
            tiktok: { type: String, default: "", trim: true },
            youtube: { type: String, default: "", trim: true },
        },

        // Submission Workflow
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
        reviewedAt: Date,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        rejectionReason: {
            type: String,
            maxlength: 500,
        },

        // Submitter Contact Information
        submitterEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            validate: {
                validator: function(v) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: 'Invalid email format'
            }
        },
        submitterName: {
            type: String,
            required: true,
            trim: true,
        },
        submitterIp: String, // For tracking/security
    },
    {
        timestamps: true,
        // Index for better query performance
        index: {
            status: 1,
            submittedAt: -1,
            category: 1,
        }
    }
);

// Indexes for efficient querying
businessSubmissionSchema.index({ status: 1, submittedAt: -1 });
businessSubmissionSchema.index({ submissionId: 1 }, { unique: true });
businessSubmissionSchema.index({ submitterEmail: 1 });
businessSubmissionSchema.index({ category: 1 });
businessSubmissionSchema.index({ cities: 1 });

// Virtual for formatted submission date
businessSubmissionSchema.virtual('formattedSubmissionDate').get(function() {
    return this.submittedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Pre-save middleware to clean up data
businessSubmissionSchema.pre('save', function(next) {
    // Remove empty social links
    const socialKeys = ['facebook', 'instagram', 'tiktok', 'youtube'];
    socialKeys.forEach(key => {
        if (this.socialLinks[key] && !this.socialLinks[key].trim()) {
            this.socialLinks[key] = '';
        }
    });

    // Clean up cities array (remove duplicates and empty values)
    if (this.cities && Array.isArray(this.cities)) {
        this.cities = [...new Set(this.cities.filter(city => city && city.trim()))];
    }

    next();
});

module.exports = mongoose.model("BusinessSubmission", businessSubmissionSchema);