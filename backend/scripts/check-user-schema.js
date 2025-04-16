/**
 * Script to check the database user schema
 * Run with: node scripts/check-user-schema.js
 */

const { Pool } = require('pg');
require('dotenv').config();

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

async function checkUserSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Checking users table schema...');
    
    // Get column information for the users table
    const query = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.error('Error: users table not found in database');
      return false;
    }
    
    console.log('Users table columns:');
    console.log('--------------------------------------------------');
    console.log('Column Name\t\tData Type\tNullable');
    console.log('--------------------------------------------------');
    
    result.rows.forEach(column => {
      // Pad column name for better formatting
      const paddedName = column.column_name.padEnd(20);
      console.log(`${paddedName}\t${column.data_type}\t\t${column.is_nullable}`);
    });
    
    // Check for specific required columns
    const requiredColumns = [
      'id', 'email', 'password', 'first_name', 'last_name', 
      'role', 'avatar_url', 'is_active', 'created_at', 'updated_at'
    ];
    
    const columnNames = result.rows.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.error('\nError: Missing required columns in users table:');
      console.error(missingColumns.join(', '));
      return false;
    }
    
    console.log('\nAll required columns are present in the users table');
    
    // Check for a sample user
    const userQuery = `SELECT id, email, first_name, last_name, role, avatar_url FROM users LIMIT 1`;
    const userResult = await client.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('\nNo users found in the database');
    } else {
      console.log('\nSample user from database:');
      console.log(userResult.rows[0]);
    }
    
    return true;
  } catch (err) {
    console.error('Error checking schema:', err);
    return false;
  } finally {
    client.release();
  }
}

checkUserSchema()
  .then(success => {
    console.log('\nSchema check ' + (success ? 'passed' : 'failed'));
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 