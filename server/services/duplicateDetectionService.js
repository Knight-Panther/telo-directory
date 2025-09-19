// server/services/duplicateDetectionService.js
const Business = require('../models/Business');
const BusinessSubmission = require('../models/BusinessSubmission');

/**
 * Duplicate Detection Service
 * Detects potential duplicates between submissions and existing businesses
 * Based on: business name, mobile, email, social links
 */
class DuplicateDetectionService {

    /**
     * Find duplicate businesses for a given submission
     * @param {Object|String} submissionData - Submission object or submission ID
     * @returns {Object} { hasDuplicates: boolean, matches: [{ field, value, businessId, businessName }] }
     */
    async findDuplicates(submissionData) {
        try {
            let submission = submissionData;

            // If ID provided, fetch the submission
            if (typeof submissionData === 'string') {
                submission = await BusinessSubmission.findById(submissionData).lean();
                if (!submission) {
                    throw new Error('Submission not found');
                }
            }

            const matches = [];

            // 1. Check business name (exact match, case insensitive)
            if (submission.businessName) {
                const nameMatches = await Business.find({
                    businessName: new RegExp(`^${this.escapeRegex(submission.businessName)}$`, 'i')
                }).select('_id businessName').lean();

                nameMatches.forEach(business => {
                    matches.push({
                        field: 'businessName',
                        value: submission.businessName,
                        businessId: business._id,
                        businessName: business.businessName,
                        matchType: 'exact'
                    });
                });
            }

            // 2. Check mobile number (exact match)
            if (submission.mobile) {
                const mobileMatches = await Business.find({
                    mobile: submission.mobile
                }).select('_id businessName mobile').lean();

                mobileMatches.forEach(business => {
                    matches.push({
                        field: 'mobile',
                        value: submission.mobile,
                        businessId: business._id,
                        businessName: business.businessName,
                        matchType: 'exact'
                    });
                });
            }

            // 3. Check submitter email against business emails
            if (submission.submitterEmail) {
                const emailMatches = await Business.find({
                    email: submission.submitterEmail
                }).select('_id businessName email').lean();

                emailMatches.forEach(business => {
                    matches.push({
                        field: 'email',
                        value: submission.submitterEmail,
                        businessId: business._id,
                        businessName: business.businessName,
                        matchType: 'exact'
                    });
                });
            }

            // 4. Check social links (Facebook & Instagram)
            if (submission.socialLinks) {
                // Facebook URL check
                if (submission.socialLinks.facebook) {
                    const normalizedFbUrl = this.normalizeSocialUrl(submission.socialLinks.facebook);
                    if (normalizedFbUrl) {
                        const fbMatches = await Business.find({
                            'socialLinks.facebook': { $regex: this.escapeRegex(normalizedFbUrl), $options: 'i' }
                        }).select('_id businessName socialLinks.facebook').lean();

                        fbMatches.forEach(business => {
                            matches.push({
                                field: 'socialLinks.facebook',
                                value: submission.socialLinks.facebook,
                                businessId: business._id,
                                businessName: business.businessName,
                                matchType: 'social_url'
                            });
                        });
                    }
                }

                // Instagram URL check
                if (submission.socialLinks.instagram) {
                    const normalizedIgUrl = this.normalizeSocialUrl(submission.socialLinks.instagram);
                    if (normalizedIgUrl) {
                        const igMatches = await Business.find({
                            'socialLinks.instagram': { $regex: this.escapeRegex(normalizedIgUrl), $options: 'i' }
                        }).select('_id businessName socialLinks.instagram').lean();

                        igMatches.forEach(business => {
                            matches.push({
                                field: 'socialLinks.instagram',
                                value: submission.socialLinks.instagram,
                                businessId: business._id,
                                businessName: business.businessName,
                                matchType: 'social_url'
                            });
                        });
                    }
                }
            }

            // Remove duplicate matches (same business matched on multiple fields)
            const uniqueMatches = this.deduplicateMatches(matches);

            return {
                hasDuplicates: uniqueMatches.length > 0,
                matchCount: uniqueMatches.length,
                matches: uniqueMatches,
                checkedFields: {
                    businessName: !!submission.businessName,
                    mobile: !!submission.mobile,
                    email: !!submission.submitterEmail,
                    facebook: !!(submission.socialLinks?.facebook),
                    instagram: !!(submission.socialLinks?.instagram)
                }
            };

        } catch (error) {
            console.error('Error in duplicate detection:', error);
            throw new Error(`Duplicate detection failed: ${error.message}`);
        }
    }

    /**
     * Check for duplicates across multiple submissions (batch processing)
     * @param {Array} submissionIds - Array of submission IDs
     * @returns {Object} Map of submissionId -> duplicate info
     */
    async batchCheckDuplicates(submissionIds) {
        try {
            const results = {};

            // Process in batches to avoid overwhelming the database
            const batchSize = 10;
            for (let i = 0; i < submissionIds.length; i += batchSize) {
                const batch = submissionIds.slice(i, i + batchSize);

                const batchPromises = batch.map(async (submissionId) => {
                    try {
                        const duplicateInfo = await this.findDuplicates(submissionId);
                        return { submissionId, duplicateInfo };
                    } catch (error) {
                        console.error(`Error checking duplicates for submission ${submissionId}:`, error);
                        return { submissionId, duplicateInfo: { hasDuplicates: false, matches: [] } };
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach(({ submissionId, duplicateInfo }) => {
                    results[submissionId] = duplicateInfo;
                });
            }

            return results;
        } catch (error) {
            console.error('Error in batch duplicate check:', error);
            throw new Error(`Batch duplicate check failed: ${error.message}`);
        }
    }

    /**
     * Normalize social media URLs for comparison
     * Removes protocol, www, trailing slashes, and query parameters
     * @param {String} url - Social media URL
     * @returns {String} Normalized URL or null if invalid
     */
    normalizeSocialUrl(url) {
        if (!url || typeof url !== 'string') return null;

        try {
            // Remove protocol and www
            let normalized = url.toLowerCase()
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '');

            // Remove trailing slash and query parameters
            normalized = normalized.split('?')[0].replace(/\/$/, '');

            // Only proceed if it looks like a Facebook or Instagram URL
            if (normalized.includes('facebook.com/') || normalized.includes('instagram.com/')) {
                return normalized;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Escape special regex characters
     * @param {String} string - String to escape
     * @returns {String} Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Remove duplicate matches (same business matched on multiple fields)
     * Keep the "strongest" match type per business
     * @param {Array} matches - Array of match objects
     * @returns {Array} Deduplicated matches
     */
    deduplicateMatches(matches) {
        const businessMatchMap = new Map();

        // Priority order: exact name match > mobile > email > social
        const fieldPriority = {
            'businessName': 1,
            'mobile': 2,
            'email': 3,
            'socialLinks.facebook': 4,
            'socialLinks.instagram': 5
        };

        matches.forEach(match => {
            const businessId = match.businessId.toString();
            const existingMatch = businessMatchMap.get(businessId);

            if (!existingMatch || fieldPriority[match.field] < fieldPriority[existingMatch.field]) {
                businessMatchMap.set(businessId, match);
            }
        });

        return Array.from(businessMatchMap.values());
    }

    /**
     * Get duplicate statistics for dashboard
     * @returns {Object} Statistics about duplicate detection
     */
    async getDuplicateStats() {
        try {
            const totalSubmissions = await BusinessSubmission.countDocuments();

            // This is a rough estimate - for exact numbers, we'd need to check each submission
            const recentSubmissions = await BusinessSubmission.find({
                submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
            }).limit(100).lean();

            let duplicatesFound = 0;
            for (const submission of recentSubmissions) {
                const result = await this.findDuplicates(submission);
                if (result.hasDuplicates) {
                    duplicatesFound++;
                }
            }

            return {
                totalSubmissionsChecked: recentSubmissions.length,
                duplicatesFound,
                duplicateRate: recentSubmissions.length > 0
                    ? Math.round((duplicatesFound / recentSubmissions.length) * 100)
                    : 0
            };
        } catch (error) {
            console.error('Error getting duplicate stats:', error);
            return {
                totalSubmissionsChecked: 0,
                duplicatesFound: 0,
                duplicateRate: 0
            };
        }
    }
}

module.exports = new DuplicateDetectionService();