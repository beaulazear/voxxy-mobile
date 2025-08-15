#!/usr/bin/env node

// Test script to verify neighborhood search is working
// Run with: node test-places-api.js

const API_URL = 'http://localhost:3000'; // Update with your Rails API URL

async function testPlacesSearch(query, types) {
  const url = `${API_URL}/api/places/search?query=${encodeURIComponent(query)}&types=${encodeURIComponent(types)}`;
  
  console.log(`\nTesting: ${query} with types=${types}`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      console.log(`✅ Found ${data.results.length} results:`);
      data.results.slice(0, 3).forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.description}`);
        console.log(`     Types: ${result.types ? result.types.join(', ') : 'N/A'}`);
      });
    } else {
      console.log('❌ No results found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing Google Places API with neighborhood support\n');
  console.log('=' .repeat(50));
  
  // Test with geocode (should return neighborhoods)
  await testPlacesSearch('Bushwick', 'geocode');
  await testPlacesSearch('Williamsburg Brooklyn', 'geocode');
  await testPlacesSearch('Upper East Side', 'geocode');
  
  // Test with cities (should NOT return neighborhoods)
  await testPlacesSearch('Brooklyn', '(cities)');
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✨ If you see neighborhood results above, it\'s working!');
}

runTests();