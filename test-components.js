#!/usr/bin/env node

/**
 * Component validation test for Try Voxxy flow
 * This validates that all components are properly structured
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Components to test
const componentsToTest = [
    {
        name: 'TryVoxxy.js',
        path: './components/TryVoxxy.js',
        requiredImports: [
            'React',
            'AsyncStorage',
            'TryVoxxyChat',
            'LinearGradient'
        ],
        requiredFunctions: [
            'getOrCreateSessionToken',
            'handleSwipeRight',
            'handleSwipeLeft',
            'SwipeableCard'
        ],
        requiredState: [
            'chatVisible',
            'showSwipeModal',
            'recs',
            'likedRecommendations',
            'signupVisible'
        ]
    },
    {
        name: 'TryVoxxyChat.js',
        path: './components/TryVoxxyChat.js',
        requiredImports: [
            'React',
            'AsyncStorage',
            'Location',
            'Alert',
            'ActivityIndicator'
        ],
        requiredFunctions: [
            'handleSubmit',
            'useCurrentLocation',
            'getOrCreateSessionToken',
            'toggleCuisine',
            'toggleVibe'
        ],
        requiredState: [
            'step',
            'location',
            'selectedOutingType',
            'selectedCuisines',
            'selectedVibes',
            'selectedBudget',
            'isSubmitting'
        ]
    }
];

function testComponent(component) {
    log(`\n🔍 Testing ${component.name}...`, 'blue');
    
    try {
        // Check if file exists
        if (!fs.existsSync(component.path)) {
            log(`❌ File not found: ${component.path}`, 'red');
            return false;
        }
        
        // Read file content
        const content = fs.readFileSync(component.path, 'utf8');
        
        // Check for required imports
        log('  Checking imports...', 'yellow');
        let importsPassed = true;
        for (const importName of component.requiredImports) {
            if (content.includes(`import`) && content.includes(importName)) {
                log(`    ✅ ${importName}`, 'green');
            } else {
                log(`    ❌ Missing import: ${importName}`, 'red');
                importsPassed = false;
            }
        }
        
        // Check for required functions
        log('  Checking functions...', 'yellow');
        let functionsPassed = true;
        for (const funcName of component.requiredFunctions) {
            const funcPatterns = [
                `function ${funcName}`,
                `const ${funcName} =`,
                `${funcName}:`
            ];
            
            if (funcPatterns.some(pattern => content.includes(pattern))) {
                log(`    ✅ ${funcName}`, 'green');
            } else {
                log(`    ❌ Missing function: ${funcName}`, 'red');
                functionsPassed = false;
            }
        }
        
        // Check for required state variables
        log('  Checking state variables...', 'yellow');
        let statePassed = true;
        for (const stateName of component.requiredState) {
            const statePatterns = [
                `const [${stateName}`,
                `useState(`,
                `set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}`
            ];
            
            if (content.includes(stateName)) {
                log(`    ✅ ${stateName}`, 'green');
            } else {
                log(`    ❌ Missing state: ${stateName}`, 'red');
                statePassed = false;
            }
        }
        
        // Check for error handling
        log('  Checking error handling...', 'yellow');
        const hasErrorHandling = content.includes('try') && content.includes('catch');
        const hasAlerts = content.includes('Alert.alert');
        const hasLogging = content.includes('logger') || content.includes('console');
        
        if (hasErrorHandling) {
            log(`    ✅ Try/catch blocks present`, 'green');
        } else {
            log(`    ⚠️  Limited error handling`, 'yellow');
        }
        
        if (hasAlerts) {
            log(`    ✅ User alerts present`, 'green');
        }
        
        if (hasLogging) {
            log(`    ✅ Logging present`, 'green');
        }
        
        // Check for cleanup
        log('  Checking cleanup...', 'yellow');
        const hasCleanup = content.includes('return () =>') || content.includes('removeAllListeners');
        if (hasCleanup) {
            log(`    ✅ Cleanup code present`, 'green');
        } else {
            log(`    ⚠️  No explicit cleanup found`, 'yellow');
        }
        
        // Overall status
        const passed = importsPassed && functionsPassed && statePassed;
        if (passed) {
            log(`  ✅ ${component.name} validation passed!`, 'green');
        } else {
            log(`  ❌ ${component.name} has issues`, 'red');
        }
        
        return passed;
        
    } catch (error) {
        log(`  ❌ Error testing ${component.name}: ${error.message}`, 'red');
        return false;
    }
}

function checkAPIConfiguration() {
    log('\n🔍 Checking API configuration...', 'blue');
    
    try {
        const configPath = './config.js';
        if (fs.existsSync(configPath)) {
            const config = fs.readFileSync(configPath, 'utf8');
            
            if (config.includes('API_URL')) {
                log('  ✅ API_URL configured', 'green');
                
                // Extract API URL
                const urlMatch = config.match(/API_URL\s*=\s*['"]([^'"]+)['"]/);
                if (urlMatch) {
                    log(`  📍 API URL: ${urlMatch[1]}`, 'blue');
                }
            } else {
                log('  ❌ API_URL not found in config', 'red');
            }
        } else {
            log('  ❌ config.js not found', 'red');
        }
    } catch (error) {
        log(`  ❌ Error checking config: ${error.message}`, 'red');
    }
}

function checkPackageDependencies() {
    log('\n🔍 Checking package dependencies...', 'blue');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        const requiredDeps = [
            'react',
            'react-native',
            'expo',
            'expo-location',
            '@react-native-async-storage/async-storage',
            'expo-linear-gradient',
            'react-native-feather'
        ];
        
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        for (const dep of requiredDeps) {
            if (deps[dep]) {
                log(`  ✅ ${dep}: ${deps[dep]}`, 'green');
            } else {
                log(`  ❌ Missing dependency: ${dep}`, 'red');
            }
        }
    } catch (error) {
        log(`  ❌ Error checking dependencies: ${error.message}`, 'red');
    }
}

async function runAllTests() {
    log('\n🚀 Starting Try Voxxy Component Validation', 'blue');
    log('=' .repeat(50), 'blue');
    
    // Check dependencies
    checkPackageDependencies();
    
    // Check API configuration
    checkAPIConfiguration();
    
    // Test each component
    let allPassed = true;
    for (const component of componentsToTest) {
        const passed = testComponent(component);
        if (!passed) {
            allPassed = false;
        }
    }
    
    log('\n' + '=' .repeat(50), 'blue');
    
    if (allPassed) {
        log('✨ All component validations passed!', 'green');
    } else {
        log('⚠️  Some validations failed - please review above', 'yellow');
    }
}

// Run tests
runAllTests().catch(error => {
    log(`\n💥 Fatal error: ${error.message}`, 'red');
    process.exit(1);
});