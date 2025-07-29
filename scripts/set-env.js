#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const environment = process.argv[2] || 'development';
const envFile = environment === 'development' ? '.env' : `.env.${environment}`;
const envPath = path.join(__dirname, '..', envFile);
const targetPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.error(`Environment file ${envFile} does not exist!`);
  process.exit(1);
}

// Copy the environment file to .env
fs.copyFileSync(envPath, targetPath);
console.log(`Environment set to: ${environment}`);
console.log(`Copied ${envFile} to .env`);