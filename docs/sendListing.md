# Send Listing - Implementation Architecture

## Overview
Implementation of user-submitted business listings functionality with separate model approach, email notifications, and immediate image processing.

## Architecture Decision
**Separate Model Approach**: Create `BusinessSubmission` model independent of existing `Business` model to avoid breaking current functionality.

## Technical Specifications

### 1. Data Model Structure

#### BusinessSubmission Schema
```javascript
// server/models/BusinessSubmission.js
const businessSubmissionSchema = new mongoose.Schema({
    // Basic Business Information
    businessName: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true
    },
    businessType: {
        type: String,
        enum: ["individual", "company"],
        required: true
    },
    cities: [{
        type: String,
        required: true
    }], // Multiple cities array
    mobile: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^\+995\s\d{3}\s\d{3}\s\d{3}$/.test(v);
            },
            message: 'Mobile must be in format: +995 XXX XXX XXX'
        }
    },

    // Enhanced Fields
    shortDescription: {
        type: String,
        maxlength: 200
    },
    hasCertificate: {
        type: Boolean,
        default: false
    },
    certificateDescription: {
        type: String,
        maxlength: 50,
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
        facebook: { type: String, default: "" },
        instagram: { type: String, default: "" },
        tiktok: { type: String, default: "" },
        youtube: { type: String, default: "" }
    },

    // Submission Workflow
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: Date,
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: String,

    // Submitter Contact Information
    submitterEmail: {
        type: String,
        required: true
    },
    submitterName: {
        type: String,
        required: true
    },
    submitterIp: String, // For tracking/security

    // Auto-generated ID for easy reference
    submissionId: {
        type: String,
        unique: true,
        default: () => nanoid(8)
    }
}, {
    timestamps: true
});
```

### 2. Cities Configuration

#### Static Cities Array
```javascript
// server/config/cities.js
const GEORGIAN_CITIES = [
    'Tbilisi',      // Capital
    'Batumi',       // Adjara region capital
    'Kutaisi',      // Historical capital
    'Rustavi',      // Industrial city
    'Gori',         // Shida Kartli region
    'Zugdidi',      // Samegrelo region
    'Poti',         // Port city
    'Kobuleti',     // Coastal resort
    'Khashuri',     // Railway junction
    'Samtredia',    // Regional center
    'Senaki',       // Military base city
    'Zestaponi',    // Industrial center
    'Marneuli',     // Agricultural center
    'Telavi',       // Kakheti region capital
    'Akhalkalaki',  // Samtskhe region
    'Ozurgeti',     // Guria region capital
    'Ambrolauri',   // Racha region capital
    'Lagodekhi',    // Border town
    'Bolnisi',      // Historical city
    'Gardabani'     // Industrial city
];

module.exports = { GEORGIAN_CITIES };
```

### 3. Image Processing Strategy

#### Immediate Processing with Sharp
```javascript
// server/services/imageProcessingService.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const processSubmissionImage = async (imageBuffer, submissionId) => {
    const uploadsDir = path.join(__dirname, '../uploads/submissions');

    // Ensure directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    const baseFilename = `submission-${submissionId}`;

    // Generate optimized versions
    const webpPath = path.join(uploadsDir, `${baseFilename}.webp`);
    const avifPath = path.join(uploadsDir, `${baseFilename}.avif`);

    // Create WebP version (800x600, quality 85)
    await sharp(imageBuffer)
        .resize(800, 600, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toFile(webpPath);

    // Create AVIF version (800x600, quality 80)
    await sharp(imageBuffer)
        .resize(800, 600, { fit: 'cover', position: 'center' })
        .avif({ quality: 80 })
        .toFile(avifPath);

    return {
        webpPath: `submissions/${baseFilename}.webp`,
        avifPath: `submissions/${baseFilename}.avif`,
        processedAt: new Date()
    };
};
```

### 4. Email Templates

#### Admin Notification Template
```javascript
// server/services/emailService.js - New template
const createBusinessSubmissionEmailTemplate = (submission) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>New Business Submission - TELO Directory</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f8f9fa; }
            .field { margin-bottom: 15px; }
            .field label { font-weight: bold; color: #495057; }
            .field-value { margin-top: 5px; padding: 8px; background: white; border-radius: 4px; }
            .cities-list { display: flex; flex-wrap: wrap; gap: 5px; }
            .city-tag { background: #007bff; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; }
            .certificate-yes { color: #28a745; font-weight: bold; }
            .certificate-no { color: #6c757d; }
            .copy-section { background: #e9ecef; padding: 15px; border-radius: 6px; margin-top: 20px; }
            .copy-title { font-weight: bold; margin-bottom: 10px; color: #495057; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 New Business Submission</h1>
                <p>Submission ID: ${submission.submissionId}</p>
            </div>

            <div class="content">
                <div class="field">
                    <label>Business Name:</label>
                    <div class="field-value">${submission.businessName}</div>
                </div>

                <div class="field">
                    <label>Category:</label>
                    <div class="field-value">${submission.category}</div>
                </div>

                <div class="field">
                    <label>Business Type:</label>
                    <div class="field-value">${submission.businessType}</div>
                </div>

                <div class="field">
                    <label>Cities:</label>
                    <div class="field-value">
                        <div class="cities-list">
                            ${submission.cities.map(city => `<span class="city-tag">${city}</span>`).join('')}
                        </div>
                    </div>
                </div>

                <div class="field">
                    <label>Mobile:</label>
                    <div class="field-value">${submission.mobile}</div>
                </div>

                <div class="field">
                    <label>Description:</label>
                    <div class="field-value">${submission.shortDescription || 'N/A'}</div>
                </div>

                <div class="field">
                    <label>Certificate:</label>
                    <div class="field-value">
                        <span class="${submission.hasCertificate ? 'certificate-yes' : 'certificate-no'}">
                            ${submission.hasCertificate ? 'YES' : 'NO'}
                        </span>
                        ${submission.hasCertificate ? `<br><small>${submission.certificateDescription}</small>` : ''}
                    </div>
                </div>

                <div class="field">
                    <label>Social Links:</label>
                    <div class="field-value">
                        ${submission.socialLinks.facebook ? `<div>Facebook: ${submission.socialLinks.facebook}</div>` : ''}
                        ${submission.socialLinks.instagram ? `<div>Instagram: ${submission.socialLinks.instagram}</div>` : ''}
                        ${submission.socialLinks.tiktok ? `<div>TikTok: ${submission.socialLinks.tiktok}</div>` : ''}
                        ${submission.socialLinks.youtube ? `<div>YouTube: ${submission.socialLinks.youtube}</div>` : ''}
                    </div>
                </div>

                <div class="field">
                    <label>Submitter:</label>
                    <div class="field-value">${submission.submitterName} (${submission.submitterEmail})</div>
                </div>

                <div class="copy-section">
                    <div class="copy-title">📋 Copy-Paste Format for Admin Panel:</div>
                    <pre>Business Name: ${submission.businessName}
Category: ${submission.category}
Business Type: ${submission.businessType}
City: ${submission.cities[0]} // Note: Admin panel supports single city only
Mobile: ${submission.mobile}
Description: ${submission.shortDescription || ''}
Facebook: ${submission.socialLinks.facebook || ''}
Instagram: ${submission.socialLinks.instagram || ''}
TikTok: ${submission.socialLinks.tiktok || ''}</pre>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};

#### User Confirmation Template
const createSubmissionConfirmationTemplate = (submission) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Submission Received - TELO Directory</title>
        <!-- Similar styling -->
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Submission Received!</h1>
                <p>Thank you, ${submission.submitterName}</p>
            </div>

            <div class="content">
                <p>Your business listing submission has been received and is under review.</p>
                <p><strong>Submission ID:</strong> ${submission.submissionId}</p>
                <p><strong>Business Name:</strong> ${submission.businessName}</p>
                <p><strong>Status:</strong> Pending Review</p>

                <div style="background: #d1ecf1; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3>What happens next?</h3>
                    <ol>
                        <li>Our team will review your submission within 2-3 business days</li>
                        <li>We may contact you if additional information is needed</li>
                        <li>Once approved, your business will appear in our directory</li>
                        <li>You'll receive a confirmation email when your listing goes live</li>
                    </ol>
                </div>

                <p>If you have any questions, please reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};
```

## Implementation Phases

### Phase 1: Backend Foundation (2-3 hours)
**Priority: High**
- [ ] Create `BusinessSubmission` model
- [ ] Create cities configuration file
- [ ] Set up image processing service
- [ ] Create submission API endpoint
- [ ] Add email templates for submissions
- [ ] Test backend functionality

**Deliverables:**
- `server/models/BusinessSubmission.js`
- `server/config/cities.js`
- `server/services/imageProcessingService.js`
- `server/routes/submissions.js`
- Email templates in `emailService.js`

### Phase 2: Frontend Form (3-4 hours)
**Priority: High**
- [ ] Create `SendListingPage` component
- [ ] Implement multi-city selector
- [ ] Add mobile number formatting (+995 XXX XXX XXX)
- [ ] Create certificate conditional fields
- [ ] Add image upload with preview
- [ ] Implement form validation
- [ ] Connect to backend API
- [ ] Add success/error handling

**Deliverables:**
- `client/src/pages/SendListingPage.js`
- `client/src/components/common/CityMultiSelect.js`
- Updated navigation to include Send Listing link

### Phase 3: Navigation & Integration (1 hour)
**Priority: Medium**
- [ ] Add "Send Listing" to main navigation
- [ ] Update routing configuration
- [ ] Add responsive design for mobile
- [ ] Test complete user flow

**Deliverables:**
- Updated `Header.js` with new nav link
- Updated `App.js` routing
- CSS styling for new components

### Phase 4: Admin Review Panel (Future - Phase 4)
**Priority: Low**
- [ ] Admin dashboard for submissions
- [ ] Approval/rejection workflow
- [ ] One-click migration to Business model
- [ ] Submission analytics
- [ ] Email notifications to users

**Deliverables:**
- Admin submission management interface
- Workflow management system
- Migration utilities

## Development Guidelines

### Code Organization
```
server/
├── models/
│   └── BusinessSubmission.js       # New model
├── routes/
│   └── submissions.js              # Submission endpoints
├── services/
│   ├── imageProcessingService.js   # Image optimization
│   └── emailService.js             # Updated with new templates
├── config/
│   └── cities.js                   # Static cities array
└── middleware/
    └── submissionValidation.js     # Form validation

client/
├── src/
│   ├── pages/
│   │   └── SendListingPage.js      # Main form component
│   ├── components/
│   │   ├── forms/
│   │   │   ├── CityMultiSelect.js  # Multi-city selector
│   │   │   ├── CertificateField.js # Certificate conditional field
│   │   │   └── ImageUpload.js      # Enhanced image upload
│   │   └── common/
│   ├── services/
│   │   └── submissionService.js    # API calls
│   └── styles/
│       └── send-listing.css        # Component styles
```

### API Endpoints
```javascript
POST /api/submissions/create
  - Creates new business submission
  - Processes image immediately
  - Sends email notifications
  - Returns submission ID

GET /api/submissions/cities
  - Returns available cities array

POST /api/submissions/:id/resend-confirmation
  - Resends confirmation email to user

// Future admin endpoints
GET /api/admin/submissions
  - List all submissions with filters

PATCH /api/admin/submissions/:id/approve
  - Approve submission and migrate to Business

PATCH /api/admin/submissions/:id/reject
  - Reject submission with reason
```

### Security Considerations
- Rate limiting for submission endpoint
- Image file type validation
- File size limits (max 5MB)
- IP address tracking for abuse prevention
- Input sanitization and validation
- Email rate limiting

### Performance Optimizations
- Image processing in background (immediate but non-blocking)
- Proper indexing on submission status
- Efficient image storage structure
- CDN-ready image paths

### Testing Strategy
- Unit tests for image processing
- Integration tests for submission flow
- Email template testing
- Form validation testing
- End-to-end submission testing

## Maintenance & Scaling

### Future Enhancements
1. **Auto-approval system** based on criteria
2. **Bulk submission management**
3. **Advanced image editing** (crop, rotate)
4. **Multi-language support**
5. **Integration with payment system** (featured listings)
6. **Advanced analytics** and reporting

### Migration Path
When ready to merge enhanced fields into main Business model:
1. Update Business schema with new fields
2. Create migration script from approved submissions
3. Update frontend components gradually
4. Maintain backward compatibility during transition

### Monitoring & Analytics
- Submission success/failure rates
- Image processing performance
- Email delivery tracking
- User feedback collection
- Conversion from submission to approved business

---

**Next Steps:**
1. Review and approve this architecture
2. Begin Phase 1 implementation
3. Set up development environment
4. Create initial backend components
5. Test submission flow before frontend development