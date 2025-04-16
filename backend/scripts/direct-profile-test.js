/**
 * Direct Profile Database Test
 * 
 * This script bypasses the API and ORM, connecting directly to the database
 * to test profile data retrieval and modification.
 * 
 * Run with: node scripts/direct-profile-test.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool for PostgreSQL
const pool = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// User ID to test - using a valid ID from our database
const USER_ID = 'ee73f7c8-320c-40b3-918a-368d52d56728';

// Test data for update
const PROFILE_UPDATE = {
  first_name: 'Praveen',
  last_name: 'Kumar',
  phone: '9876543210', // Updated to use phone instead of phone_number based on DB structure
  designation: 'Senior Developer' // Updated to use designation instead of job_title based on DB structure
};

// Store original data for restoration
let originalUserData = null;

// Test function to check database connection
async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    const result = await pool.query('SELECT NOW()');
    console.log(`✅ Connected to database. Server time: ${result.rows[0].now}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('  - Make sure PostgreSQL is running');
    } else if (error.code === '28P01') {
      console.error('  - Authentication failed. Check your DB_USERNAME and DB_PASSWORD');
    } else if (error.code === '3D000') {
      console.error('  - Database does not exist. Check your DB_DATABASE name');
    }
    
    console.error('\nDatabase configuration:');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Port: ${process.env.DB_PORT || 5432}`);
    console.log(`Database: ${process.env.DB_DATABASE}`);
    console.log(`Username: ${process.env.DB_USERNAME}`);
    
    return false;
  }
}

// Test function to fetch user data
async function fetchUserProfile() {
  try {
    console.log(`\n🔍 Fetching user profile for ID: ${USER_ID}`);
    
    const query = `
      SELECT id, email, first_name, last_name, phone, designation, role, avatar_url
      FROM users
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [USER_ID]);
    
    if (result.rows.length === 0) {
      console.error(`❌ User with ID ${USER_ID} not found in the database`);
      return null;
    }
    
    originalUserData = result.rows[0];
    console.log('✅ User profile found:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Failed to fetch user profile:', error.message);
    if (error.stack) console.error(error.stack);
    
    if (error.code === '42P01') {
      console.error('  - Table "users" does not exist. Check your database schema.');
    } else if (error.code === '42703') {
      console.error('  - Column does not exist. Check your database schema.');
    }
    
    return null;
  }
}

// Test function to update user profile
async function updateUserProfile() {
  try {
    console.log(`\n🔍 Updating user profile for ID: ${USER_ID}`);
    console.log('Update data:', PROFILE_UPDATE);
    
    const query = `
      UPDATE users
      SET first_name = $1, last_name = $2, phone = $3, designation = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, email, first_name, last_name, phone, designation, role, avatar_url
    `;
    
    const values = [
      PROFILE_UPDATE.first_name,
      PROFILE_UPDATE.last_name,
      PROFILE_UPDATE.phone,
      PROFILE_UPDATE.designation,
      USER_ID
    ];
    
    console.log('Executing query with values:', values);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      console.error(`❌ User with ID ${USER_ID} not found or update failed`);
      return null;
    }
    
    console.log('✅ User profile updated:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Failed to update user profile:', error.message);
    if (error.stack) console.error(error.stack);
    
    if (error.code === '42P01') {
      console.error('  - Table "users" does not exist. Check your database schema.');
    } else if (error.code === '42703') {
      console.error('  - Column does not exist. Check your database schema.');
    }
    
    return null;
  }
}

// Test function to restore original profile
async function restoreUserProfile() {
  if (!originalUserData) {
    console.error('\n❌ Cannot restore profile: Original data not available');
    return false;
  }
  
  try {
    console.log(`\n🔍 Restoring original user profile for ID: ${USER_ID}`);
    
    const query = `
      UPDATE users
      SET first_name = $1, last_name = $2, phone = $3, designation = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, email, first_name, last_name, phone, designation, role, avatar_url
    `;
    
    const values = [
      originalUserData.first_name,
      originalUserData.last_name,
      originalUserData.phone,
      originalUserData.designation,
      USER_ID
    ];
    
    console.log('Executing restoration with values:', values);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      console.error(`❌ User with ID ${USER_ID} not found or restore failed`);
      return false;
    }
    
    console.log('✅ User profile restored:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to restore user profile:', error.message);
    if (error.stack) console.error(error.stack);
    return false;
  }
}

// Main function
async function runTests() {
  console.log('🧪 Starting direct profile database test...');
  
  try {
    // Test database connection first
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Tests aborted due to database connection failure');
      return;
    }
    
    // Fetch original profile
    const userProfile = await fetchUserProfile();
    if (!userProfile) {
      console.error('❌ Tests aborted because user profile could not be fetched');
      return;
    }
    
    // Update profile
    const updatedProfile = await updateUserProfile();
    if (!updatedProfile) {
      console.error('❌ Profile update failed');
    } else {
      console.log('\n✅ UPDATE TEST PASSED!');
      
      // Verify changes were applied
      console.log('Verifying changes:');
      console.log(`First name: ${originalUserData.first_name} -> ${updatedProfile.first_name}`);
      console.log(`Last name: ${originalUserData.last_name} -> ${updatedProfile.last_name}`);
      console.log(`Phone: ${originalUserData.phone} -> ${updatedProfile.phone}`);
      console.log(`Designation: ${originalUserData.designation} -> ${updatedProfile.designation}`);
    }
    
    // Restore original profile
    const restored = await restoreUserProfile();
    if (restored) {
      console.log('\n✅ RESTORE TEST PASSED!');
    } else {
      console.error('\n❌ RESTORE TEST FAILED!');
    }
    
    // Final results
    console.log('\n📊 Test Results:');
    console.log(`Fetch Profile: ✅ PASS`);
    console.log(`Update Profile: ${updatedProfile ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Restore Profile: ${restored ? '✅ PASS' : '❌ FAIL'}`);
    
    if (updatedProfile && restored) {
      console.log('\n✅✅✅ ALL TESTS PASSED! The profile functionality is working at the database level.');
      console.log('This indicates that the database and profile data are structured correctly.');
      console.log('The issue with the API is likely due to an ORM configuration problem, not the underlying data.');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during tests:', error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    // End the connection pool
    await pool.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run the tests
runTests(); 