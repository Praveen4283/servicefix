// Simple script to check database schema
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool();

async function checkSchema() {
  try {
    // Check users table schema
    console.log('Checking users table schema...');
    const usersResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY column_name
    `);
    
    console.log('Users table columns:');
    usersResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });

    // Check if there are any records
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\nTotal users: ${countResult.rows[0].count}`);

    // Check if first_name column exists
    const firstNameResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'first_name'
    `);
    
    if (firstNameResult.rows.length === 0) {
      console.log('\nWARNING: first_name column does not exist in users table!');
      
      // Check if firstName (camelCase) exists instead
      const firstNameCamelResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'firstname'
      `);
      
      if (firstNameCamelResult.rows.length > 0) {
        console.log('Found "firstname" column instead of "first_name"');
      }
    } else {
      console.log('\nfirst_name column exists in users table');
    }
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    pool.end();
  }
}

checkSchema(); 