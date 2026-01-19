// Script to generate .ico file for .roo file association
// Requires: npm install sharp to-ico

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, 'src-tauri', 'icons');
const svgPath = path.join(iconsDir, 'roo-key.svg');

async function generateRooIcon() {
  try {
    // Dynamic imports to handle optional dependencies
    const sharp = (await import('sharp')).default;
    const toIco = (await import('to-ico')).default;
    
    console.log('Generating .roo key icon...');
    
    // Check if SVG exists
    if (!fs.existsSync(svgPath)) {
      console.error(`SVG file not found: ${svgPath}`);
      console.log('Please create the SVG file first.');
      return;
    }
    
    // Read the SVG
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate PNG buffers at multiple sizes for .ico
    const sizes = [16, 32, 48, 256];
    const pngBuffers = [];
    
    for (const size of sizes) {
      const buffer = await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer();
      pngBuffers.push(buffer);
      console.log(`Generated ${size}x${size} PNG`);
    }
    
    // Generate ICO file
    const icoBuffer = await toIco(pngBuffers);
    const icoPath = path.join(iconsDir, 'roo-key.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    console.log('Generated roo-key.ico');
    
    console.log('Icon generation complete!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('Missing dependencies. Install with:');
      console.error('  npm install --save-dev sharp to-ico');
    } else {
      console.error('Error generating icon:', error);
    }
  }
}

generateRooIcon();
