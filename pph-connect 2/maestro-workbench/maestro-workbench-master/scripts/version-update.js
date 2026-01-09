#!/usr/bin/env node

/**
 * Version Update Script
 * 
 * This script helps update the version number and automatically
 * updates the VERSION_HISTORY.md file with the new version entry.
 * 
 * Usage:
 *   node scripts/version-update.js [version] [description]
 * 
 * Examples:
 *   node scripts/version-update.js 0.1.1 "Fixed task assignment bug"
 *   node scripts/version-update.js 0.2.0 "Added analytics dashboard"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
const newVersion = args[0];
const description = args[1] || '';

if (!newVersion) {
  console.error('Usage: node scripts/version-update.js [version] [description]');
  console.error('Example: node scripts/version-update.js 0.1.1 "Fixed bug"');
  process.exit(1);
}

// Validate version format (semantic versioning)
const versionRegex = /^\d+\.\d+\.\d+$/;
if (!versionRegex.test(newVersion)) {
  console.error('Error: Version must be in format X.Y.Z (e.g., 0.1.1)');
  process.exit(1);
}

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionHistoryPath = path.join(__dirname, '..', 'VERSION_HISTORY.md');

try {
  // Read and update package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const oldVersion = packageJson.version;
  
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`✅ Updated package.json: ${oldVersion} → ${newVersion}`);
  
  // Read and update VERSION_HISTORY.md
  const versionHistory = fs.readFileSync(versionHistoryPath, 'utf8');
  
  // Create new version entry
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const newVersionEntry = `## Version ${newVersion} - ${description || 'Update'}
**Date:** ${today}

### Changes
${description ? `- ${description}` : '- General improvements and bug fixes'}

---

`;

  // Insert new version entry after the title
  const updatedHistory = versionHistory.replace(
    /(# Version History\n\n)/,
    `$1${newVersionEntry}`
  );
  
  fs.writeFileSync(versionHistoryPath, updatedHistory);
  
  console.log(`✅ Updated VERSION_HISTORY.md with version ${newVersion}`);
  console.log(`📝 Description: ${description || 'General improvements and bug fixes'}`);
  
  console.log('\n🎉 Version update complete!');
  console.log('\nNext steps:');
  console.log('1. Review the changes');
  console.log('2. Commit with: git add . && git commit -m "Bump version to ' + newVersion + '"');
  console.log('3. Tag the release: git tag v' + newVersion);
  console.log('4. Push: git push origin main --tags');
  
} catch (error) {
  console.error('Error updating version:', error.message);
  process.exit(1);
}
