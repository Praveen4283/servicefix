/**
 * Find Test User Script
 * 
 * This script connects to the database and lists available users
 * Use it to find valid test credentials for API testing
 * 
 * Run with: node scripts/find-test-user.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function findUsers() {
  console.log('🔍 Connecting to database and searching for users...');
  console.log('Database connection details:');
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`User: ${process.env.DB_USER}`);
  
  try {
    // Query to find the first 10 users with their emails (no passwords)
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No users found in the database.');
      return;
    }

    console.log(`\n✅ Found ${result.rows.length} users:`);
    console.log('---------------------------------------------');
    
    result.rows.forEach((user, index) => {
      console.log(`User #${index + 1}:`);
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.first_name} ${user.last_name}`);
      console.log(`Role: ${user.role}`);
      console.log(`Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log('---------------------------------------------');
    });
    
    console.log('\n🔑 To use these users for testing:');
    console.log('1. Update the test credentials in test-profile.js or test-profile-complete.js with one of these emails');
    console.log('2. Use the default password (check your development documents) or reset it if needed');
    console.log('3. Alternatively, use test-profile-manual.js with a valid JWT token from an active session');
    
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
  } finally {
    // Close the pool
    pool.end();
  }
}

// Run the function
findUsers(); 