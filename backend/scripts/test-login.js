/**
 * Simple Login Test Script
 * 
 * This script tests only the login functionality.
 * Use it to verify your test credentials are working.
 * 
 * Run with: node scripts/test-login.js
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
const API_URL = `${BASE_URL}/api`;

// Enter your test credentials here - update these with valid credentials
// Based on our database check, this is a valid user
const TEST_CREDENTIALS = {
  email: 'testuser@example.com',  // Found in the database
  password: 'password123'         // Default test password, may need to be updated
};

// Rest of the script unchanged...
// ... existing code ... 