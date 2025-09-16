// client/src/assets/images/hero/index.js
// Image exports for Webpack processing

// AVIF images
import constructionHero800Avif from './construction-hero-800.avif';
import constructionHero1600Avif from './construction-hero-1600.avif';
import constructionHero2400Avif from './construction-hero-2400.avif';

// WebP images
import constructionHero800Webp from './construction-hero-800.webp';
import constructionHero1600Webp from './construction-hero-1600.webp';
import constructionHero2400Webp from './construction-hero-2400.webp';
// Export image maps for easy access
export const heroImages = {
  'construction-hero': {
    avif: {
      '800': constructionHero800Avif,
      '1600': constructionHero1600Avif,
      '2400': constructionHero2400Avif
    },
    webp: {
      '800': constructionHero800Webp,
      '1600': constructionHero1600Webp,
      '2400': constructionHero2400Webp
    }
  }
};

// Helper function to get image URL
export const getImageUrl = (imageName, format, size) => {
  const imageSet = heroImages[imageName];
  if (!imageSet) return null;

  if (format === 'avif' && imageSet.avif && imageSet.avif[size]) {
    return imageSet.avif[size];
  }

  if (format === 'webp' && imageSet.webp && imageSet.webp[size]) {
    return imageSet.webp[size];
  }

  return null;
};