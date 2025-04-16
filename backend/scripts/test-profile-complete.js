/**
 * Complete Profile Test Script
 * 
 * This script tests the entire profile workflow:
 * 1. Authentication (login)
 * 2. Fetching user profile data
 * 3. Updating user profile data
 * 4. Fetching the updated data to verify
 * 
 * Run with: node scripts/test-profile-complete.js
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
const API_URL = `${BASE_URL}/api`;

// Test user credentials (update these with valid credentials)
const TEST_CREDENTIALS = {
  email: 'abc@test.com', // Update with a valid user email
  password: 'password123' // Update with the correct password
};

// The user ID to test (this will be set after login)
let USER_ID = '645fa2eb-abf0-4488-b493-934aec7e577d';
let AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NDVmYTJlYi1hYmYwLTQ0ODgtYjQ5My05MzRhZWM3ZTU3N2QiLCJpYXQiOjE3NDI1NzUzNTMsImV4cCI6MTc0MzE4MDE1M30.VAY1_Y6QPF2THDTZ_0D7sLhY1bVECqZ8ix598TbQcug';

// Test data for profile update
const PROFILE_UPDATE = {
  firstName: 'Praveen',
  lastName: 'Kumar',
  phoneNumber: '9876543210', // Changed phone number to verify update
  jobTitle: 'Senior Developer' // Changed job title to verify update
};

// Store original data for comparison and restoration
let originalUserData = null;

// Create axios instance with auth header management
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Update auth token dynamically
function setAuthToken(token) {
  AUTH_TOKEN = token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('🔑 Auth token set successfully');
}

// Test function for login
async function testLogin() {
  try {
    console.log('\n🔍 Testing login...');
    console.log(`POST ${API_URL}/auth/login`);
    
    const response = await api.post('/auth/login', TEST_CREDENTIALS);
    console.log(`✅ Login successful, status: ${response.status}`);
    
    // Extract and set token for subsequent requests
    const { token, user } = response.data;
    if (token) {
      setAuthToken(token);
      if (user && user.id) {
        USER_ID = user.id;
        console.log(`🆔 User ID detected: ${USER_ID}`);
      }
      return true;
    } else {
      console.error('❌ Login response missing token');
      return false;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    }
    return false;
  }
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
      phoneNumber: originalUserData.phoneNumber,
      jobTitle: originalUserData.jobTitle
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

// Main test function
async function runTests() {
  console.log('🧪 Starting complete profile workflow test...');
  
  let results = {
    login: false,
    fetch: false,
    update: false,
    verify: false,
    restore: false
  };
  
  try {
    // Step 1: Login
    results.login = await testLogin();
    if (!results.login) {
      console.error('❌ Login failed, aborting remaining tests');
      return results;
    }
    
    // Step 2: Fetch original profile
    const profileData = await testFetchProfile();
    results.fetch = !!profileData;
    if (!results.fetch) {
      console.error('❌ Profile fetch failed, aborting remaining tests');
      return results;
    }
    
    // Step 3: Update profile
    const updateResult = await testUpdateProfile();
    results.update = !!updateResult;
    if (!results.update) {
      console.error('❌ Profile update failed, aborting remaining tests');
      // Try to restore original data anyway
      await restoreOriginalProfile();
      return results;
    }
    
    // Step 4: Verify update
    results.verify = await testVerifyUpdate();
    
    // Step 5: Restore original data
    results.restore = await restoreOriginalProfile();
    
  } catch (error) {
    console.error('⚠️ Unexpected error during tests:', error.message);
  } finally {
    // Results summary
    console.log('\n📊 Test Results:');
    console.log(`Login: ${results.login ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Fetch Profile: ${results.fetch ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Update Profile: ${results.update ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Verify Update: ${results.verify ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Restore Original: ${results.restore ? '✅ PASS' : '❌ FAIL'}`);
    
    if (Object.values(results).every(r => r)) {
      console.log('\n✅✅✅ ALL TESTS PASSED! The profile functionality is working perfectly.');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED. Please check the logs for details.');
    }
  }
  
  return results;
}

// Run the tests
runTests(); 