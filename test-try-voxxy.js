#!/usr/bin/env node

/**
 * Test script for Try Voxxy flow
 * This tests the integration between frontend and backend
 */

const fetch = require('node-fetch');

// Test configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_SESSION_TOKEN = `mobile-${Date.now()}-test123`;

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

async function testSessionTokenValidation() {
    log('\n🔍 Testing session token validation...', 'blue');
    
    // Test with invalid token
    try {
        const response = await fetch(`${API_URL}/try_voxxy_cached`, {
            headers: {
                'X-Session-Token': 'invalid-token'
            }
        });
        
        if (response.status === 401) {
            log('✅ Invalid token correctly rejected', 'green');
        } else {
            log(`❌ Invalid token accepted (status: ${response.status})`, 'red');
        }
    } catch (error) {
        log(`❌ Error testing invalid token: ${error.message}`, 'red');
    }
    
    // Test with valid token
    try {
        const response = await fetch(`${API_URL}/try_voxxy_cached`, {
            headers: {
                'X-Session-Token': TEST_SESSION_TOKEN
            }
        });
        
        if (response.status === 200) {
            const data = await response.json();
            log(`✅ Valid token accepted (cached: ${data.has_cached})`, 'green');
        } else {
            log(`❌ Valid token rejected (status: ${response.status})`, 'red');
        }
    } catch (error) {
        log(`❌ Error testing valid token: ${error.message}`, 'red');
    }
}

async function testRecommendationsFlow() {
    log('\n🔍 Testing recommendations flow...', 'blue');
    
    const requestData = {
        responses: "Italian food, romantic atmosphere, mid-range budget",
        activity_location: "San Francisco, CA",
        date_notes: "Dinner"
    };
    
    try {
        const response = await fetch(`${API_URL}/try_voxxy_recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': TEST_SESSION_TOKEN
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (response.status === 200 && data.recommendations) {
            log(`✅ Got ${data.recommendations.length} recommendations`, 'green');
            if (data.recommendations.length > 0) {
                log(`   Sample: ${data.recommendations[0].name}`, 'blue');
            }
        } else if (response.status === 429) {
            log(`⚠️  Rate limited (retry after: ${data.retry_after}s)`, 'yellow');
            if (data.recommendations) {
                log(`   But got cached recommendations: ${data.recommendations.length}`, 'green');
            }
        } else {
            log(`❌ Failed to get recommendations: ${data.error}`, 'red');
        }
    } catch (error) {
        log(`❌ Error getting recommendations: ${error.message}`, 'red');
    }
}

async function testRateLimiting() {
    log('\n🔍 Testing rate limiting...', 'blue');
    
    // Make multiple requests to test rate limiting
    const token = `mobile-${Date.now()}-ratelimit`;
    
    for (let i = 1; i <= 3; i++) {
        try {
            const response = await fetch(`${API_URL}/try_voxxy_recommendations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Token': token
                },
                body: JSON.stringify({
                    responses: `Test request ${i}`,
                    activity_location: "Test Location",
                    date_notes: "Test"
                })
            });
            
            if (i === 1 && response.status === 200) {
                log(`✅ First request succeeded`, 'green');
            } else if (i > 1 && response.status === 429) {
                log(`✅ Request ${i} correctly rate limited`, 'green');
            } else if (i > 1 && response.status === 200) {
                const data = await response.json();
                if (data.rate_limited) {
                    log(`✅ Request ${i} returned cached data (rate limited)`, 'green');
                } else {
                    log(`⚠️  Request ${i} not rate limited as expected`, 'yellow');
                }
            }
        } catch (error) {
            log(`❌ Error in request ${i}: ${error.message}`, 'red');
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function testCachedEndpoint() {
    log('\n🔍 Testing cached endpoint...', 'blue');
    
    const token = `mobile-${Date.now()}-cached`;
    
    // First, make a request to generate recommendations
    try {
        await fetch(`${API_URL}/try_voxxy_recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': token
            },
            body: JSON.stringify({
                responses: "Test for caching",
                activity_location: "Cache City",
                date_notes: "Lunch"
            })
        });
        
        // Now check if cached
        const cachedResponse = await fetch(`${API_URL}/try_voxxy_cached`, {
            headers: {
                'X-Session-Token': token
            }
        });
        
        const cachedData = await cachedResponse.json();
        
        if (cachedData.has_cached && cachedData.recommendations.length > 0) {
            log(`✅ Cached recommendations retrieved successfully`, 'green');
        } else {
            log(`⚠️  No cached recommendations found`, 'yellow');
        }
    } catch (error) {
        log(`❌ Error testing cache: ${error.message}`, 'red');
    }
}

async function runAllTests() {
    log('\n🚀 Starting Try Voxxy Integration Tests', 'blue');
    log(`   API URL: ${API_URL}`, 'blue');
    log('=' .repeat(50), 'blue');
    
    await testSessionTokenValidation();
    await testRecommendationsFlow();
    await testRateLimiting();
    await testCachedEndpoint();
    
    log('\n' + '=' .repeat(50), 'blue');
    log('✨ Tests completed!', 'green');
}

// Run tests
runAllTests().catch(error => {
    log(`\n💥 Fatal error: ${error.message}`, 'red');
    process.exit(1);
});