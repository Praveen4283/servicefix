/**
 * Manual Profile Test Script
 * 
 * This script tests the profile workflow using a provided JWT token:
 * 1. Fetching user profile data
 * 2. Updating user profile data
 * 3. Fetching the updated data to verify
 * 
 * Run with: node scripts/test-profile-manual.js
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
const API_URL = `${BASE_URL}/api`;

// IMPORTANT: Replace with a valid JWT token from your browser
// To get this token:
// 1. Log in to your app in the browser
// 2. Open browser dev tools (F12)
// 3. Go to Application tab > Local Storage > your site
// 4. Copy the 'authToken' value
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NDVmYTJlYi1hYmYwLTQ0ODgtYjQ5My05MzRhZWM3ZTU3N2QiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDI1ODE4MTksImV4cCI6MTc0MjY2ODIxOX0.Ljn2lBqRuadnEUKhZdZwiYI0l5wGB9WSuxvzzaUpKZk';

// The user ID to test - updated to a valid ID found in the database
const USER_ID = 'ee73f7c8-320c-40b3-918a-368d52d56728';

// Test data for profile update - updated to match actual field names in the database
const PROFILE_UPDATE = {
  firstName: 'Praveen',
  lastName: 'Kumar',
  phone: '9876543210', // Changed field from phoneNumber to phone
  designation: 'Senior Developer' // Changed field from jobTitle to designation
};

// Store original data for comparison and restoration
let originalUserData = null;

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : undefined
  }
});

// Check if token is set
function checkToken() {
  if (!AUTH_TOKEN) {
    console.error('\n❌ ERROR: No JWT token provided!');
    console.error('Please update the AUTH_TOKEN variable in the script with a valid JWT token.');
    console.error('You can obtain this token from your browser\'s Local Storage after logging in.');
    return false;
  }
  return true;
}

// Test function for fetching user profile
async function testFetchProfile() {
  try {
    console.log(`\n🔍 Testing profile fetch for user ID: ${USER_ID}`);
    console.log(`GET ${API_URL}/users/${USER_ID}`);
    
    const response = await api.get(`/users/${USER_ID}`);
    console.log(`✅ Profile fetch successful, status: ${response.status}`);
    
    originalUserData = response.data;
    console.log('User profile data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Profile fetch failed:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    }
    return null;
  }
}

// Test function for updating user profile
async function testUpdateProfile() {
  try {
    console.log(`\n🔍 Testing profile update for user ID: ${USER_ID}`);
    console.log(`PUT ${API_URL}/users/${USER_ID}`);
    console.log('Update data:', PROFILE_UPDATE);
    
    const response = await api.put(`/users/${USER_ID}`, PROFILE_UPDATE);
    console.log(`✅ Profile update successful, status: ${response.status}`);
    
    console.log('Updated profile data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Profile update failed:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    }
    return null;
  }
}

// Test function to verify the update worked
async function testVerifyUpdate() {
  try {
    console.log(`\n🔍 Verifying profile update for user ID: ${USER_ID}`);
    console.log(`GET ${API_URL}/users/${USER_ID}`);
    
    const response = await api.get(`/users/${USER_ID}`);
    console.log(`✅ Verification fetch successful, status: ${response.status}`);
    
    const updatedData = response.data;
    console.log('Latest profile data:');
    console.log(JSON.stringify(updatedData, null, 2));
    
    // Verify changes
    const updates = Object.keys(PROFILE_UPDATE);
    const verificationResults = updates.map(field => {
      const expected = PROFILE_UPDATE[field];
      const actual = updatedData[field];
      const matches = expected === actual;
      
      return {
        field,
        expected,
        actual,
        matches
      };
    });
    
    console.log('\n🔍 Update verification:');
    verificationResults.forEach(result => {
      console.log(`${result.field}: ${result.matches ? '✅ MATCH' : '❌ MISMATCH'} (Expected: "${result.expected}", Got: "${result.actual}")`);
    });
    
    const allMatch = verificationResults.every(result => result.matches);
    return allMatch;
  } catch (error) {
    console.error('❌ Update verification failed:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    }
    return false;
  }
}

// Restore original profile data (cleanup)
async function restoreOriginalProfile() {
  if (!originalUserData) return false;
  
  try {
    console.log('\n🔄 Restoring original profile data...');
    
    // Extract only the fields we modified
    const restoreData = {
      firstName: originalUserData.firstName,
      lastName: originalUserData.lastName,
      phone: originalUserData.phone,
      designation: originalUserData.designation
    };
    
    console.log('Restore data:', restoreData);
    
    const response = await api.put(`/users/${USER_ID}`, restoreData);
    console.log(`✅ Profile restoration successful, status: ${response.status}`);
    return true;
  } catch (error) {
    console.error('❌ Profile restoration failed:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    }
    return false;
  }
}

// Main function
async function runTests() {
  console.log('🧪 Starting manual profile workflow test...');
  
  // Verify token is set
  if (!checkToken()) {
    return {
      fetch: false,
      update: false,
      verify: false,
      restore: false
    };
  }
  
  let results = {
    fetch: false,
    update: false,
    verify: false,
    restore: false
  };
  
  try {
    // Step 1: Fetch original profile
    const profileData = await testFetchProfile();
    results.fetch = !!profileData;
    if (!results.fetch) {
      console.error('❌ Profile fetch failed, aborting remaining tests');
      console.error('⚠️ Check if your JWT token is valid and not expired');
      return results;
    }
    
    // Step 2: Update profile
    const updateResult = await testUpdateProfile();
    results.update = !!updateResult;
    if (!results.update) {
      console.error('❌ Profile update failed, aborting remaining tests');
      // Try to restore original data anyway
      await restoreOriginalProfile();
      return results;
    }
    
    // Step 3: Verify update
    results.verify = await testVerifyUpdate();
    
    // Step 4: Restore original data
    results.restore = await restoreOriginalProfile();
    
  } catch (error) {
    console.error('⚠️ Unexpected error during tests:', error.message);
  } finally {
    // Results summary
    console.log('\n📊 Test Results:');
    console.log(`Fetch Profile: ${results.fetch ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Update Profile: ${results.update ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Verify Update: ${results.verify ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Restore Original: ${results.restore ? '✅ PASS' : '❌ FAIL'}`);
    
    if (Object.values(results).every(r => r)) {
      console.log('\n✅✅✅ ALL TESTS PASSED! The profile functionality is working perfectly.');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED. Please check the logs for details.');
      
      if (!AUTH_TOKEN) {
        console.log('\nSuggestion: Please set a valid JWT token in the script');
      } else if (results.fetch === false) {
        console.log('\nSuggestion: Your token may be expired. Try logging in again and getting a fresh token.');
      }
    }
  }
  
  return results;
}

// Run the tests
runTests(); 