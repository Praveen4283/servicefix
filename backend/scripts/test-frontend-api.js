/**
 * Script to test the frontend API with the actual user ID from the frontend
 * Run with: node scripts/test-frontend-api.js
 */

const axios = require('axios');
require('dotenv').config();

// Get the port from .env or use default
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
const API_URL = `${BASE_URL}/api`;

// The specific user ID from the frontend error logs
const USER_ID = '645fa2eb-abf0-4488-b493-934aec7e577d';

// Bypass authentication for test only - set this to a valid token if you have one
// This is just for testing, in a real app you would authenticate properly
const TEST_TOKEN = '';

// Test function for health check
async function testHealthEndpoint() {
  try {
    console.log('\n🔍 Testing health endpoint...');
    console.log(`GET ${BASE_URL}/health`);
    
    const response = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health endpoint returned: ${response.status}`);
    console.log(response.data);
    return true;
  } catch (error) {
    console.error(`❌ Health check failed:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    }
    return false;
  }
}

// Test function for the user endpoint
async function testUserEndpoint() {
  try {
    console.log(`\n🔍 Testing user endpoint with ID: ${USER_ID}`);
    console.log(`GET ${API_URL}/users/${USER_ID}`);
    
    const config = TEST_TOKEN ? {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` }
    } : {};
    
    try {
      const response = await axios.get(`${API_URL}/users/${USER_ID}`, config);
      console.log(`✅ User endpoint returned: ${response.status}`);
      console.log('User data:', response.data);
      return true;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(`⚠️ Authentication required (401) - This is expected if no token is provided`);
        console.log(`To fully test, provide a valid JWT token in the TEST_TOKEN variable`);
      } else {
        console.error(`❌ User endpoint failed:`, error.message);
        if (error.response) {
          console.error(`Status: ${error.response.status}`);
          console.error('Response:', error.response.data);
        }
      }
      return false;
    }
  } catch (error) {
    console.error(`❌ Test execution error:`, error.message);
    return false;
  }
}

// Main function
async function runTests() {
  console.log('🧪 Starting API tests...');
  
  let healthResult = false;
  let userResult = false;
  
  try {
    // Test health endpoint
    healthResult = await testHealthEndpoint();
    
    // Test user endpoint
    userResult = await testUserEndpoint();
    
    // Summary
    console.log('\n📊 Test Results:');
    console.log(`Health Endpoint: ${healthResult ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`User Endpoint: ${userResult ? '✅ PASS' : TEST_TOKEN ? '❌ FAIL' : '⚠️ AUTH REQUIRED'}`);
    
    if (healthResult) {
      console.log('\n✅ Backend server is running correctly');
      
      if (!TEST_TOKEN) {
        console.log(`
Note: To fully test the user endpoint, you need to:
1. Log in through the frontend
2. Extract the JWT token from localStorage or the network requests
3. Update this script with the token in the TEST_TOKEN variable
4. Run the script again`);
      }
    } else {
      console.log('\n❌ Backend server may not be running correctly');
    }
  } catch (error) {
    console.error('⚠️ Test runner error:', error);
  }
}

// Run the tests
runTests(); 