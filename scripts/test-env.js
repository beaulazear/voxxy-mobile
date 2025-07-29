#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Environment Setup...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').filter(line => line && !line.startsWith('#'));
  console.log(`   Found ${lines.length} environment variables`);
} else {
  console.log('❌ .env file missing');
}

// Check TypeScript config
const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  console.log('✅ tsconfig.json exists');
} else {
  console.log('❌ tsconfig.json missing');
}

// Check logger utility
const loggerPath = path.join(__dirname, '..', 'utils', 'logger.js');
if (fs.existsSync(loggerPath)) {
  console.log('✅ Logger utility exists');
} else {
  console.log('❌ Logger utility missing');
}

// Check version consistency
const packageJson = require('../package.json');
const appConfig = require('../app.config.js');

console.log('\n📦 Version Check:');
console.log(`   package.json: ${packageJson.version}`);
console.log(`   app.config.js: ${appConfig.expo.version}`);

if (packageJson.version === appConfig.expo.version) {
  console.log('   ✅ Versions match');
} else {
  console.log('   ❌ Version mismatch!');
}

console.log('\n✨ Environment setup test complete!');