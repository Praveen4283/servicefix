/**
 * Profile Endpoint Test
 * 
 * This script tests just the profile endpoint with a JWT token
 * and logs detailed information about the request and response.
 * 
 * Run with: node scripts/test-profile-endpoint.js
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
const API_URL = `${BASE_URL}/api`;

// Test token and user
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NDVmYTJlYi1hYmYwLTQ0ODgtYjQ5My05MzRhZWM3ZTU3N2QiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDI1ODE4MTksImV4cCI6MTc0MjY2ODIxOX0.Ljn2lBqRuadnEUKhZdZwiYI0l5wGB9WSuxvzzaUpKZk';
const USER_ID = '645fa2eb-abf0-4488-b493-934aec7e577d';

// Create request function with detailed logging
async function makeRequest(method, url, data = null) {
  console.log(`\n🔍 Making ${method.toUpperCase()} request to: ${url}`);
  console.log('Headers:');
  console.log('  Content-Type: application/json');
  console.log(`  Authorization: Bearer ${AUTH_TOKEN.substring(0, 15)}...`);
  
  if (data) {
    console.log('Request data:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    console.log(`\n✅ Response successful (${response.status}):`);
    console.log('Response headers:');
    console.log(JSON.stringify(response.headers, null, 2));
    console.log('Response data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response;
  } catch (error) {
    console.error(`\n❌ Request failed: ${error.message}`);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response headers:');
      console.error(JSON.stringify(error.response.headers, null, 2));
      console.error('Response data:');
      console.error(JSON.stringify(error.response.data, null, 2));
      
      // Log the stack trace of the error response for more details
      if (error.response.data && error.response.data.error) {
        console.error('\nError details:');
        console.error(error.response.data.error);
      }
    } else if (error.request) {
      console.error('Request was made but no response was received');
    } else {
      console.error('Error setting up the request:', error.message);
    }
    
    return null;
  }
}

// Test functions
async function testGetProfile() {
  console.log('\n🧪 Testing GET profile endpoint');
  const url = `${API_URL}/users/${USER_ID}`;
  return await makeRequest('get', url);
}

// Main function
async function runTest() {
  console.log('🧪 Starting profile endpoint test...');
  
  try {
    // Decode and analyze the JWT token
    console.log('\n🔐 Analyzing JWT token:');
    const tokenParts = AUTH_TOKEN.split('.');
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('Token payload:');
        console.log(JSON.stringify(payload, null, 2));
        
        // Check token expiration
        const expiration = new Date(payload.exp * 1000);
        const now = new Date();
        const isExpired = now > expiration;
        
        console.log(`\nToken expiration: ${expiration.toISOString()}`);
        console.log(`Current time: ${now.toISOString()}`);
        console.log(`Token is ${isExpired ? 'EXPIRED ⚠️' : 'valid ✅'}`);
        
        if (payload.userId !== USER_ID) {
          console.warn('⚠️ Warning: Token userId does not match the USER_ID in script!');
        }
      } catch (e) {
        console.error('Error decoding token:', e.message);
      }
    }
    
    // Test the GET profile endpoint
    await testGetProfile();
    
    console.log('\n🧪 Profile endpoint test completed.');
  } catch (error) {
    console.error('\n❌ Test failed with unexpected error:', error.message);
  }
}

runTest(); 