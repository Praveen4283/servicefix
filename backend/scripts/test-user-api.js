/**
 * Simple script to test the user API endpoints directly
 * Run with: node scripts/test-user-api.js
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const API_URL = `http://localhost:${process.env.PORT || 5000}/api`;
const TEST_USER_ID = 'ee73f7c8-320c-40b3-918a-368d52d56728'; // Replace with an actual user ID from your database

// Helper function to make API requests
async function apiRequest(method, endpoint) {
  try {
    const url = `${API_URL}${endpoint}`;
    console.log(`${method.toUpperCase()} ${url}`);
    
    const response = await axios({
      method,
      url
    });
    
    console.log(`✅ Status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    throw error;
  }
}

// Test the API endpoint without authentication (this will fail with 401 if auth is required)
async function testGetUser() {
  try {
    console.log(`\nTesting GET /api/users/${TEST_USER_ID} (will likely fail with 401 if auth is required)`);
    const userData = await apiRequest('get', `/users/${TEST_USER_ID}`);
    console.log('Response:', userData);
    return true;
  } catch (error) {
    console.log('Expected error if authentication is required');
    return false;
  }
}

// Test the health endpoint (should work without auth)
async function testHealth() {
  try {
    console.log('\nTesting GET /health');
    const url = `http://localhost:${process.env.PORT || 5000}/health`;
    console.log(`Request URL: ${url}`);
    
    const health = await axios.get(url);
    console.log(`✅ Status: ${health.status}`);
    console.log('Response:', health.data);
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    return false;
  }
}

// Test a specific user GET endpoint with more detailed logging
async function testGetUserDetailed() {
  const testUserId = 'ee73f7c8-320c-40b3-918a-368d52d56728'; // Your test UUID
  
  try {
    console.log(`\nTesting GET /api/users/${testUserId} with detailed logging`);
    const url = `${API_URL}/users/${testUserId}`;
    console.log(`Request URL: ${url}`);
    
    try {
      const response = await axios.get(url);
      console.log(`✅ Status: ${response.status}`);
      console.log('User data found:', response.data);
      return true;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✓ Authentication required (401) - this is expected behavior if auth is enabled');
      } else {
        console.error(`❌ Unexpected error:`, error.message);
        if (error.response) {
          console.error(`Status: ${error.response.status}`);
          console.error(`Response data:`, error.response.data);
        }
      }
      return false;
    }
  } catch (error) {
    console.error(`❌ Test execution error:`, error);
    return false;
  }
}

// Run the tests
async function runTests() {
  let healthTestPassed = false;
  let userTestPassed = false;
  
  try {
    healthTestPassed = await testHealth();
    userTestPassed = await testGetUserDetailed();
    await testGetUser(); // Also run the original test
    
    console.log('\n--- Test Results ---');
    console.log(`Health Endpoint: ${healthTestPassed ? '✅ Passed' : '❌ Failed'}`);
    console.log(`User Endpoint: ${userTestPassed ? '✅ Passed (unexpected)' : '⚠️ Failed (expected if auth required)'}`);
    
    if (healthTestPassed) {
      console.log('\n✅ Backend server is running and responding to requests.');
    } else {
      console.log('\n❌ Backend health check failed. The server might not be running properly.');
    }
  } catch (error) {
    console.error('\n❌ Tests failed to run:', error.message);
  }
}

// Run the tests
runTests(); 