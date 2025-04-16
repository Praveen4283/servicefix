/**
 * List All Users Script
 * 
 * This script connects directly to the database and lists all users
 * You can use it to find valid user IDs for testing
 * 
 * Run with: node scripts/list-users.js
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

// Test database connection and list all users
async function listAllUsers() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test connection
    const connResult = await pool.query('SELECT NOW()');
    console.log(`✅ Connected to database. Server time: ${connResult.rows[0].now}`);
    
    // List all tables to check if users table exists
    console.log('\n🔍 Checking database tables...');
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in the public schema.');
      return;
    }
    
    console.log('Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check if users table exists
    const userTableExists = tablesResult.rows.some(row => row.table_name === 'users');
    
    if (!userTableExists) {
      console.error('\n❌ The "users" table does not exist in this database.');
      console.log('Available tables are listed above. Please make sure you\'re connecting to the right database.');
      return;
    }
    
    // Get users table columns
    console.log('\n🔍 Checking users table structure...');
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    
    if (columnsResult.rows.length === 0) {
      console.error('❌ Could not retrieve columns for the users table.');
      return;
    }
    
    console.log('Users table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Now fetch all users
    console.log('\n🔍 Fetching all users...');
    
    // Check if 'email' column exists
    const hasEmailColumn = columnsResult.rows.some(col => col.column_name === 'email');
    const hasFirstNameColumn = columnsResult.rows.some(col => col.column_name === 'first_name');
    const hasLastNameColumn = columnsResult.rows.some(col => col.column_name === 'last_name');
    
    // Construct columns to select based on what exists
    let selectColumns = ['id'];
    if (hasEmailColumn) selectColumns.push('email');
    if (hasFirstNameColumn) selectColumns.push('first_name');
    if (hasLastNameColumn) selectColumns.push('last_name');
    selectColumns.push('role');
    
    const query = `
      SELECT ${selectColumns.join(', ')}
      FROM users
      ORDER BY created_at DESC NULLS LAST
      LIMIT 10
    `;
    
    try {
      const result = await pool.query(query);
      
      if (result.rows.length === 0) {
        console.log('No users found in the database.');
        return;
      }
      
      console.log(`\n✅ Found ${result.rows.length} users:`);
      console.log('-------------------------');
      
      result.rows.forEach((user, index) => {
        console.log(`User #${index + 1}:`);
        console.log(`ID: ${user.id}`);
        if (hasEmailColumn) console.log(`Email: ${user.email}`);
        if (hasFirstNameColumn && hasLastNameColumn) {
          console.log(`Name: ${user.first_name} ${user.last_name}`);
        }
        console.log(`Role: ${user.role || 'N/A'}`);
        console.log('-------------------------');
      });
      
      console.log('\n📝 To use these IDs in your tests:');
      console.log('1. Copy a user ID from above');
      console.log('2. Update the USER_ID constant in your test scripts');
      console.log('3. Make sure the JWT token matches the same user');
      
    } catch (error) {
      console.error(`❌ Error querying users: ${error.message}`);
      
      if (error.code === '42703') {
        console.error('The users table doesn\'t have the expected columns.');
        console.error('Try adjusting the query based on the actual columns list above.');
      }
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('  - Make sure PostgreSQL is running');
    } else if (error.code === '28P01') {
      console.error('  - Authentication failed. Check your DB_USERNAME and DB_PASSWORD');
    } else if (error.code === '3D000') {
      console.error('  - Database does not exist. Check your DB_DATABASE name');
    }
    
    // Log the environment variables being used (without showing password)
    console.error('\nDatabase configuration:');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Port: ${process.env.DB_PORT || 5432}`);
    console.log(`Database: ${process.env.DB_DATABASE}`);
    console.log(`Username: ${process.env.DB_USERNAME}`);
  } finally {
    // End the pool
    await pool.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run the function
listAllUsers(); 