/**
 * Script to check if a specific user ID exists in the database
 */
require('dotenv').config();
const { Pool } = require('pg');

// Create a connection pool using environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true'
});

console.log('Database config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME,
  // Not logging password for security
  ssl: process.env.DB_SSL === 'true'
});

async function executeQuery(queryText, params = []) {
  let client;
  try {
    client = await pool.connect();
    console.log(`Executing query: ${queryText}`);
    if (params.length > 0) {
      console.log(`Parameters: ${JSON.stringify(params)}`);
    }
    const result = await client.query(queryText, params);
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function checkUser(userId) {
  console.log(`\nChecking if user exists with ID: ${userId}`);
  
  try {
    // Check if user exists
    const userExistsQuery = 'SELECT COUNT(*) FROM users WHERE id = $1';
    const existsResult = await executeQuery(userExistsQuery, [userId]);
    
    const count = parseInt(existsResult.rows[0].count, 10);
    if (count === 0) {
      console.log(`❌ No user found with ID: ${userId}`);
      return;
    }
    
    console.log(`✅ User with ID ${userId} exists in the database`);
    
    // Get user details
    const userDetailsQuery = `
      SELECT id, email, first_name, last_name, role, avatar_url, phone, designation
      FROM users WHERE id = $1
    `;
    
    const detailsResult = await executeQuery(userDetailsQuery, [userId]);
    console.log('User details:');
    console.log(detailsResult.rows[0]);
    
    // List all users for comparison
    console.log('\nAll users in the database:');
    const allUsersQuery = 'SELECT id, email, first_name, last_name FROM users';
    const allUsersResult = await executeQuery(allUsersQuery);
    
    allUsersResult.rows.forEach(user => {
      console.log(`- ${user.id}: ${user.first_name} ${user.last_name} (${user.email})`);
    });
    
  } catch (error) {
    console.error('Error checking user:', error);
  }
}

async function main() {
  try {
    // Frontend user ID that's having problems
    const frontendUserId = '645fa2eb-abf0-4488-b493-934aec7e577d';
    await checkUser(frontendUserId);
    
    // Also check the test user ID we've been using
    const testUserId = 'ee73f7c8-320c-40b3-918a-368d52d56728';
    await checkUser(testUserId);
    
  } catch (error) {
    console.error('Script error:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

main(); 