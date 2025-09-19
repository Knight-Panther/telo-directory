// client/src/constants/formData.js
// Static data for SendListing form

export const GEORGIAN_CITIES = [
    // Special Option
    'All Georgia',      // 🇬🇪 Nationwide service coverage

    // Major Cities
    'Tbilisi',          // Capital - largest business hub
    'Batumi',           // Adjara region capital - port & tourism
    'Kutaisi',          // Historical capital - western Georgia
    'Rustavi',          // Industrial city near Tbilisi

    // Regional Centers
    'Gori',             // Shida Kartli region
    'Zugdidi',          // Samegrelo region capital
    'Poti',             // Major port city
    'Telavi',           // Kakheti region capital - wine region
    'Ozurgeti',         // Guria region capital
    'Ambrolauri',       // Racha region capital

    // Important Towns
    'Kobuleti',         // Coastal resort town
    'Khashuri',         // Railway junction
    'Samtredia',        // Regional center
    'Senaki',           // Military base city
    'Zestaponi',        // Industrial center
    'Marneuli',         // Agricultural center
    'Akhalkalaki',      // Samtskhe region
    'Lagodekhi',        // Border town with Azerbaijan
    'Bolnisi',          // Historical city
    'Gardabani',        // Industrial city

    // Additional Cities
    'Akhaltsikhe',      // Samtskhe-Javakheti region
    'Mtskheta',         // Ancient capital
    'Kaspi',            // Regional town
    'Kvareli',          // Wine region
    'Sighnaghi',        // Tourism - "City of Love"
    'Gurjaani',         // Kakheti region
    'Dusheti',          // Mountain region
    'Tianeti',          // Mountain region
    'Kareli',           // Shida Kartli
    'Khoni',            // Imereti region
];

// BUSINESS_CATEGORIES removed - now fetched dynamically from API
// Categories are managed through the admin panel and fetched from /api/submissions/categories
// This ensures admin control over which categories are available for submissions