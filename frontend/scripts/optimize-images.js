const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Directories to process
const directories = [
  path.join(__dirname, '../public/images'),
  path.join(__dirname, '../public')
];

// File extensions to process
const extensionsToProcess = ['.png', '.jpg', '.jpeg', '.gif'];

// Process favicon files separately with appropriate settings
const processFavicons = async () => {
  console.log('Processing favicons...');
  const publicDir = path.join(__dirname, '../public');
  
  const faviconFiles = [
    'favicon-32x32.png',
    'favicon-16x16.png',
    'apple-touch-icon.png',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png'
  ];
  
  for (const file of faviconFiles) {
    const filePath = path.join(publicDir, file);
    if (fs.existsSync(filePath)) {
      try {
        // Generate WebP version
        await sharp(filePath)
          .webp({ quality: 90 })
          .toFile(filePath.replace(/\.[^.]+$/, '.webp'));
        
        console.log(`✓ Generated WebP for favicon: ${file}`);
      } catch (err) {
        console.error(`Error processing favicon ${file}:`, err);
      }
    }
  }
};

// Process each directory
const processDirectory = async (dir) => {
  console.log(`Processing directory: ${dir}`);
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Recursively process subdirectories
        await processDirectory(filePath);
      } else {
        const ext = path.extname(file).toLowerCase();
        
        // Skip if file is already WebP or AVIF or not in our list
        if (['.webp', '.avif'].includes(ext) || !extensionsToProcess.includes(ext)) {
          continue;
        }
        
        try {
          const fileBaseName = path.basename(file, ext);
          const img = sharp(filePath);
          const metadata = await img.metadata();
          
          // Skip small images (usually icons, etc.)
          if (metadata.width < 50 || metadata.height < 50) {
            continue;
          }
          
          console.log(`Processing: ${file} (${metadata.width}x${metadata.height})`);
          
          // Generate AVIF version with high quality for hero and important images
          await img
            .avif({ quality: 80 })
            .toFile(path.join(dir, `${fileBaseName}.avif`));
          
          // Generate WebP version with good quality
          await img
            .webp({ quality: 85 })
            .toFile(path.join(dir, `${fileBaseName}.webp`));
          
          console.log(`✓ Generated optimized versions for: ${file}`);
        } catch (err) {
          console.error(`Error processing ${file}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }
};

// Main function
const main = async () => {
  console.log('Starting image optimization...');
  
  // Process favicons first
  await processFavicons();
  
  // Process each directory
  for (const dir of directories) {
    if (fs.existsSync(dir)) {
      await processDirectory(dir);
    } else {
      console.warn(`Directory doesn't exist: ${dir}`);
    }
  }
  
  console.log('Image optimization complete!');
};

// Run the optimization
main().catch(err => {
  console.error('Image optimization failed:', err);
  process.exit(1);
}); 