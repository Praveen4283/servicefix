/**
 * Test script for fetching user profile data from the backend
 * Run with: cd frontend && node src/test-profile-api.js
 */

// Simple polyfill for fetch in Node.js
const fetch = require('node-fetch');
require('dotenv').config();

// Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TEST_USER_ID = 'ee73f7c8-320c-40b3-918a-368d52d56728'; // Replace with your test user ID

// Mock JWT token for testing (replace with a valid token if needed)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVlNzNmN2M4LTMyMGMtNDBiMy05MThhLTM2OGQ1MmQ1NjcyOCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTY3OTk5OTk5OSwiZXhwIjoxNjgwMDg2Mzk5fQ.WHxfzdJGxR5QwL9ya9N8GfnHDNdYYCjDpi6-OCUmsHc';

/**
 * Maps database user format (UserDTO) to frontend User model
 */
function mapUserDTOToUser(dto) {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.first_name,
    lastName: dto.last_name,
    role: dto.role,
    avatarUrl: dto.avatar_url,
    phoneNumber: dto.phone_number,
    jobTitle: dto.job_title,
    organizationId: dto.organization_id,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at
  };
}

/**
 * Attempts to fetch a user from the backend
 */
async function fetchUser(userId) {
  try {
    // Try to fetch user data from the backend
    console.log(`\nFetching user data for ID: ${userId}...`);
    console.log(`Request URL: ${API_URL}/users/${userId}`);
    
    const response = await fetch(`${API_URL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Authentication failed. You need a valid JWT token.');
        console.log('Please log in through the frontend to get a valid token.');
      } else {
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
      }
      return null;
    }
    
    const userData = await response.json();
    console.log('Raw response data:', userData);
    
    // Check for possible format variations (snake_case or camelCase)
    const userDTO = {
      id: userData.id || userData._id || userId,
      email: userData.email,
      first_name: userData.first_name || userData.firstName || '',
      last_name: userData.last_name || userData.lastName || '',
      role: userData.role || 'user',
      avatar_url: userData.avatar_url || userData.avatarUrl,
      phone_number: userData.phone_number || userData.phoneNumber,
      job_title: userData.job_title || userData.jobTitle,
      organization_id: userData.organization_id || userData.organizationId,
      created_at: userData.created_at || userData.createdAt,
      updated_at: userData.updated_at || userData.updatedAt
    };
    
    console.log('\nTransformed DTO object:');
    console.log(userDTO);
    
    // Transform to frontend User model
    const user = mapUserDTOToUser(userDTO);
    console.log('\nFinal user object for frontend:');
    console.log(user);
    
    return user;
  } catch (error) {
    console.error('Error fetching user:', error.message);
    return null;
  }
}

// Run the test
async function runTest() {
  console.log('🧪 Starting frontend API user fetch test');
  console.log('======================================');
  
  console.log('Note: This test will likely fail without a valid JWT token.');
  console.log('You may need to extract your token from the browser after logging in,');
  console.log('or use OAuth client credentials to get a valid token.');
  
  const user = await fetchUser(TEST_USER_ID);
  
  if (user) {
    console.log('\n✅ Success! User data was fetched and transformed correctly.');
  } else {
    console.log('\n❌ Failed to fetch user data. See errors above.');
  }
}

// Run the test
runTest(); 