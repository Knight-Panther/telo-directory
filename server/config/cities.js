// server/config/cities.js
// Georgian cities configuration for business submissions
// Organized by regions for better management

const GEORGIAN_CITIES = [
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

// City metadata for potential future enhancements
const CITY_METADATA = {
    'Tbilisi': {
        region: 'Tbilisi',
        type: 'capital',
        population: 'large',
        businessHub: true,
        coordinates: { lat: 41.7151, lng: 44.8271 }
    },
    'Batumi': {
        region: 'Adjara',
        type: 'regional_capital',
        population: 'large',
        businessHub: true,
        coordinates: { lat: 41.6168, lng: 41.6367 }
    },
    'Kutaisi': {
        region: 'Imereti',
        type: 'major_city',
        population: 'medium',
        businessHub: true,
        coordinates: { lat: 42.2679, lng: 42.7041 }
    },
    'Rustavi': {
        region: 'Kvemo Kartli',
        type: 'industrial',
        population: 'medium',
        businessHub: true,
        coordinates: { lat: 41.5492, lng: 44.9936 }
    }
    // Note: Only major cities included for now
    // Can be expanded later for advanced features
};

// Regions for potential future organization
const GEORGIAN_REGIONS = [
    'Tbilisi',
    'Adjara',
    'Guria',
    'Imereti',
    'Kakheti',
    'Kvemo Kartli',
    'Mtskheta-Mtianeti',
    'Racha-Lechkhumi',
    'Samegrelo-Zemo Svaneti',
    'Samtskhe-Javakheti',
    'Shida Kartli'
];

// Helper functions
const getCitiesByRegion = (region) => {
    // Future enhancement: return cities filtered by region
    return GEORGIAN_CITIES;
};

const getCityMetadata = (cityName) => {
    return CITY_METADATA[cityName] || null;
};

const isValidCity = (cityName) => {
    return GEORGIAN_CITIES.includes(cityName);
};

const validateCities = (cities) => {
    if (!Array.isArray(cities)) {
        return { valid: false, error: 'Cities must be an array' };
    }

    if (cities.length === 0) {
        return { valid: false, error: 'At least one city must be selected' };
    }

    // Special validation for "All Georgia"
    const hasAllGeorgia = cities.includes('All Georgia');
    if (hasAllGeorgia && cities.length > 1) {
        return {
            valid: false,
            error: '"All Georgia" cannot be combined with specific cities'
        };
    }

    // Regular max limit check (skip if "All Georgia" is selected)
    if (!hasAllGeorgia && cities.length > 10) {
        return { valid: false, error: 'Maximum 10 cities allowed' };
    }

    const invalidCities = cities.filter(city => !isValidCity(city));
    if (invalidCities.length > 0) {
        return {
            valid: false,
            error: `Invalid cities: ${invalidCities.join(', ')}`
        };
    }

    // Remove duplicates
    const uniqueCities = [...new Set(cities)];

    return {
        valid: true,
        cities: uniqueCities,
        count: uniqueCities.length,
        isNationwide: hasAllGeorgia
    };
};

module.exports = {
    GEORGIAN_CITIES,
    CITY_METADATA,
    GEORGIAN_REGIONS,
    getCitiesByRegion,
    getCityMetadata,
    isValidCity,
    validateCities,
};