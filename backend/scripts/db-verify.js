/**
 * Script to directly verify database connection and query users
 * Run with: node scripts/db-verify.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || 'servicedesk',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
});

// Execute a query with proper error handling
async function executeQuery(queryText, params = []) {
  const client = await pool.connect();
  try {
    console.log(`Executing query: ${queryText}`);
    if (params.length > 0) {
      console.log(`Parameters: ${JSON.stringify(params)}`);
    }
    
    const result = await client.query(queryText, params);
    return result;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Test connection
async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await executeQuery('SELECT NOW() as time');
    console.log(`Connection successful! Server time: ${result.rows[0].time}`);
    return true;
  } catch (err) {
    console.error('Connection test failed:', err);
    return false;
  }
}

// Check users table
async function checkUsersTable() {
  try {
    console.log('\nChecking users table...');
    const result = await executeQuery('SELECT COUNT(*) FROM users');
    console.log(`Users table exists and contains ${result.rows[0].count} records`);
    return true;
  } catch (err) {
    console.error('Users table check failed:', err);
    return false;
  }
}

// Get specific user
async function getUserById(userId) {
  console.log(`Looking up user with ID: ${userId}`);
  
  try {
    // Get user details
    const userQuery = `SELECT id, email, first_name, last_name, role, avatar_url, phone, designation 
                      FROM users WHERE id = $1`;
    const result = await executeQuery(userQuery, [userId]);
    
    if (result.rows.length === 0) {
      console.log(`No user found with ID: ${userId}`);
      return null;
    }
    
    const user = result.rows[0];
    console.log('User found:', user);
    return user;
  } catch (error) {
    console.log('User lookup failed:', error);
    return null;
  }
}

// Run all tests
async function runTests() {
  try {
    // Step 1: Test basic connection
    const connectionSuccessful = await testConnection();
    if (!connectionSuccessful) {
      console.error('\n❌ Database connection failed. Check your connection parameters.');
      return;
    }
    
    // Step 2: Check users table
    const usersTableExists = await checkUsersTable();
    if (!usersTableExists) {
      console.error('\n❌ Users table check failed. The table might not exist or might be inaccessible.');
      return;
    }
    
    // Step 3: Get a specific user
    // Try both our test user and a UUID that's likely not in the database
    const testUserId = 'ee73f7c8-320c-40b3-918a-368d52d56728';
    const user = await getUserById(testUserId);
    
    if (!user) {
      // Try getting any user to see if we can access user records
      console.log('\nTrying to get any user...');
      const anyUserResult = await executeQuery('SELECT id FROM users LIMIT 1');
      
      if (anyUserResult.rows.length > 0) {
        const anyUserId = anyUserResult.rows[0].id;
        console.log(`Found a user with ID: ${anyUserId}`);
        await getUserById(anyUserId);
      } else {
        console.log('No users found in the database. You might need to create some test users.');
      }
    }
    
    console.log('\n✅ Database verification completed');
    
  } catch (err) {
    console.error('\n❌ Tests failed:', err);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run all tests
runTests(); 