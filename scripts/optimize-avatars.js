#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🖼️  Avatar Optimization Script');
console.log('================================\n');

const assetsDir = path.join(__dirname, '..', 'assets');
const avatarFiles = fs.readdirSync(assetsDir)
    .filter(file => file.match(/^(Avatar|Weird)\d+\.jpg$/));

console.log(`Found ${avatarFiles.length} avatar files:\n`);

let totalSize = 0;
const largeFiles = [];

avatarFiles.forEach(file => {
    const filePath = path.join(assetsDir, file);
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    totalSize += stats.size;
    
    console.log(`${file}: ${sizeMB} MB`);
    
    if (stats.size > 500 * 1024) { // Files larger than 500KB
        largeFiles.push({ file, size: sizeMB });
    }
});

console.log(`\n📊 Summary:`);
console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Average size: ${(totalSize / avatarFiles.length / 1024 / 1024).toFixed(2)} MB`);

if (largeFiles.length > 0) {
    console.log(`\n⚠️  Large files (>500KB) that should be optimized:`);
    largeFiles.forEach(({ file, size }) => {
        console.log(`   - ${file}: ${size} MB`);
    });
}

console.log('\n💡 Recommendations:');
console.log('1. Install sharp-cli: npm install -g sharp-cli');
console.log('2. Run this command to optimize all avatars:');
console.log('   for file in assets/Avatar*.jpg assets/Weird*.jpg; do');
console.log('     sharp -i "$file" -o "$file" resize 200 200 -- jpeg quality=85');
console.log('   done');
console.log('\n3. Or use ImageOptim app on macOS for batch optimization');
console.log('\n4. Target size: <100KB per avatar (200x200px, 85% quality)');