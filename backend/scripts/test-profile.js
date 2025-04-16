/**
 * Automated Profile Test Script
 * 
 * This script tests the profile workflow with automatic login:
 * 1. Logging in to get an authentication token
 * 2. Fetching user profile data
 * 3. Updating user profile data
 * 4. Fetching the updated data to verify
 * 
 * Run with: node scripts/test-profile.js
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
const API_URL = `${BASE_URL}/api`;

// Test user credentials - updated with valid user from database
const TEST_USER = {
  email: 'testuser@example.com', // Valid user found in the database
  password: 'password123'         // Default test password, may need to be updated
};

// Test data for profile update - updated to match database field names
const PROFILE_UPDATE = {
  firstName: 'Test',
  lastName: 'User',
  phone: '9876543210', // Changed field from phoneNumber to phone
  designation: 'Quality Assurance' // Changed field from jobTitle to designation
};

// Store original data for comparison and restoration
let originalUserData = null;
let authToken = null;
let userId = null;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Update auth token when available
function updateAuthToken(token) {
  authToken = token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Test function for login
async function testLogin() {
  try {
    console.log('\n🔑 Testing user login');
    console.log(`POST ${API_URL}/auth/login`);
    console.log(`Email: ${TEST_USER.email}`);
    
    const response = await api.post('/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    console.log(`✅ Login successful, status: ${response.status}`);
    
    // Extract token and user ID
    const token = response.data.token;
    updateAuthToken(token);
    
    userId = response.data.user.id;
    console.log(`User ID: ${userId}`);
    
    return {
      token,
      userId
    };
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    }
    return null;
  }
}

// Test function for fetching user profile
async function testFetchProfile() {
  try {
    console.log(`\n🔍 Testing profile fetch for user ID: ${userId}`);
    console.log(`GET ${API_URL}/users/${userId}`);
    
    const response = await api.get(`/users/${userId}`);
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
    console.log(`\n🔍 Testing profile update for user ID: ${userId}`);
    console.log(`PUT ${API_URL}/users/${userId}`);
    console.log('Update data:', PROFILE_UPDATE);
    
    const response = await api.put(`/users/${userId}`, PROFILE_UPDATE);
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
    console.log(`\n🔍 Verifying profile update for user ID: ${userId}`);
    console.log(`GET ${API_URL}/users/${userId}`);
    
    const response = await api.get(`/users/${userId}`);
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
    
    const response = await api.put(`/users/${userId}`, restoreData);
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
  console.log('🧪 Starting automated profile workflow test...');
  
  let results = {
    login: false,
    fetch: false,
    update: false,
    verify: false,
    restore: false
  };
  
  try {
    // Step 1: Login
    const loginResult = await testLogin();
    results.login = !!loginResult;
    
    if (!results.login) {
      console.error('❌ Login failed, aborting remaining tests');
      console.error('⚠️ Check if your test credentials are correct');
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