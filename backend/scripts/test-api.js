/**
 * API Health Check Script
 * 
 * This script tests if the API is running and accessible
 * without requiring database access.
 * 
 * Run with: node scripts/test-api.js
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
const API_URL = `${BASE_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// API check function
async function testHealthEndpoint() {
  console.log('🧪 Testing API health endpoint...');
  
  try {
    console.log(`GET ${BASE_URL}/health`);
    const response = await axios.get(`${BASE_URL}/health`);
    console.log(`\n✅ API is running! Status: ${response.status}`);
    console.log('Response data:', response.data);
    
    return true;
  } catch (error) {
    console.error('\n❌ API health check failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️ Connection refused. The backend server is not running.');
      console.log('Please start the server with:');
      console.log('  npm run dev');
    } else if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    }
    
    return false;
  }
}

// API route testing function
async function testAPIRoutes() {
  console.log('\n🧪 Testing common API endpoints...');
  
  const endpoints = [
    { method: 'get', url: '/auth/check' },
    { method: 'get', url: '/users' },
    { method: 'get', url: '/health' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting ${endpoint.method.toUpperCase()} ${API_URL}${endpoint.url}`);
      
      const response = await api({
        method: endpoint.method,
        url: endpoint.url
      });
      
      console.log(`✅ Success! Status: ${response.status}`);
      console.log('Response type:', typeof response.data);
      
      if (typeof response.data === 'object') {
        console.log('Response keys:', Object.keys(response.data));
      } else {
        console.log('Response (truncated):', String(response.data).substring(0, 100));
      }
      
    } catch (error) {
      console.error(`❌ Failed:`, error.message);
      
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        if (error.response.data) {
          console.error('Response:', error.response.data);
        }
      }
    }
  }
}

// Run the tests
async function runApiTests() {
  const healthCheck = await testHealthEndpoint();
  
  if (healthCheck) {
    await testAPIRoutes();
    console.log('\n✅ API health check completed. If some routes failed, that might be expected.');
    console.log('Check the specific errors above to determine if they are normal for your API.');
  } else {
    console.error('\n❌ API health check failed. Please make sure the backend server is running.');
  }
}

runApiTests(); 