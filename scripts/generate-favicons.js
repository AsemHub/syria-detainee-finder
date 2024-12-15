const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateFavicons() {
  const inputSvg = path.join(__dirname, '../public/icon.svg');
  const publicDir = path.join(__dirname, '../public');

  // Sizes for different favicon versions
  const sizes = {
    'favicon-16x16.png': 16,
    'favicon-32x32.png': 32,
    'apple-touch-icon.png': 180,
    'android-chrome-192x192.png': 192,
    'android-chrome-512x512.png': 512,
  };

  try {
    const svgBuffer = await fs.readFile(inputSvg);

    // Generate each favicon size
    for (const [filename, size] of Object.entries(sizes)) {
      const outputPath = path.join(publicDir, filename);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Generated ${filename}`);
    }

    // For favicon.ico, we'll use the 32x32 PNG directly
    // This works because modern browsers support PNG favicons
    const faviconPath = path.join(publicDir, 'favicon-32x32.png');
    const faviconDestPath = path.join(publicDir, 'favicon.png');
    await fs.copyFile(faviconPath, faviconDestPath);
    console.log('Generated favicon.png');

    console.log('All favicons generated successfully!');
  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

generateFavicons();
