#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔔 Notification System Debug Report\n');

// Check files for notification issues
const issues = [];
const fixes = [];

// Check PushNotificationService
console.log('📱 Checking Push Notification Service...');
const pushServicePath = path.join(__dirname, '..', 'services', 'PushNotificationService.js');
if (fs.existsSync(pushServicePath)) {
    const content = fs.readFileSync(pushServicePath, 'utf8');
    
    if (content.includes('projectId: Constants.expoConfig?.extra?.eas?.projectId')) {
        console.log('✅ Push token uses correct project ID');
    } else {
        issues.push('Push token might not be using correct project ID');
    }
    
    if (content.includes('shouldShowAlert: true')) {
        console.log('✅ Notifications configured to show alerts');
    }
} else {
    issues.push('PushNotificationService.js not found');
}

// Check app.config.js for notification plugin
console.log('\n📋 Checking App Configuration...');
const appConfigPath = path.join(__dirname, '..', 'app.config.js');
if (fs.existsSync(appConfigPath)) {
    const content = fs.readFileSync(appConfigPath, 'utf8');
    
    if (content.includes('expo-notifications')) {
        console.log('✅ expo-notifications plugin configured');
    } else {
        issues.push('Missing expo-notifications plugin in app.config.js');
        fixes.push('Add "expo-notifications" to plugins array in app.config.js');
    }
}

// Check UserContext for push token handling
console.log('\n👤 Checking User Context...');
const userContextPath = path.join(__dirname, '..', 'context', 'UserContext.js');
if (fs.existsSync(userContextPath)) {
    const content = fs.readFileSync(userContextPath, 'utf8');
    
    if (content.includes('setupPushNotificationsForUser')) {
        console.log('✅ Push notification setup function exists');
    }
    
    if (content.includes('sendPushTokenToBackend')) {
        console.log('✅ Push token backend sync function exists');
    }
}

// Check for common issues
console.log('\n🔍 Common Issues Check...');

// Check if NotificationSettings uses correct API
const notifSettingsPath = path.join(__dirname, '..', 'components', 'NotificationSettings.js');
if (fs.existsSync(notifSettingsPath)) {
    const content = fs.readFileSync(notifSettingsPath, 'utf8');
    if (content.includes('YOUR_API_ENDPOINT')) {
        issues.push('NotificationSettings.js still has placeholder API URL');
        fixes.push('Replace YOUR_API_ENDPOINT with ${API_URL}');
    } else {
        console.log('✅ NotificationSettings uses correct API URL');
    }
}

// Summary
console.log('\n📊 Summary:');
if (issues.length === 0) {
    console.log('✅ No issues found!');
} else {
    console.log(`❌ Found ${issues.length} issues:\n`);
    issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
    });
}

if (fixes.length > 0) {
    console.log('\n💡 Recommended Fixes:');
    fixes.forEach((fix, i) => {
        console.log(`   ${i + 1}. ${fix}`);
    });
}

console.log('\n🧪 Testing Steps:');
console.log('1. Enable push notifications in Settings');
console.log('2. Check device logs for push token registration');
console.log('3. Verify token is sent to backend (check network logs)');
console.log('4. Test receiving a notification');
console.log('\n📱 iOS Specific:');
console.log('- Ensure push notification capability is enabled in Xcode');
console.log('- Check Apple Developer account for push certificate');
console.log('- Test on real device (not simulator)');