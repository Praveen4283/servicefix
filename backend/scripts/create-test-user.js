/**
 * Script to create a test user in the database
 * Run with: node scripts/create-test-user.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'servicedesk',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
});

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    console.log('Creating test user...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Check if user already exists
    const checkResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['testuser@example.com']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Test user already exists with ID:', checkResult.rows[0].id);
      return checkResult.rows[0].id;
    }
    
    // Create organization first
    const orgResult = await client.query(
      `INSERT INTO organizations (name, domain)
       VALUES ($1, $2)
       RETURNING id`,
      ['Test Organization', 'example.com']
    );
    
    const organizationId = orgResult.rows[0].id;
    console.log('Created test organization with ID:', organizationId);
    
    // Create test user
    const userResult = await client.query(
      `INSERT INTO users (
        email, password, first_name, last_name, role, 
        organization_id, avatar_url, phone, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        'testuser@example.com', 
        'password123',  // In production, this would be hashed
        'Test', 
        'User', 
        'admin', 
        organizationId,
        'https://ui-avatars.com/api/?name=Test+User&background=0D8ABC&color=fff',
        '+1234567890',
        true
      ]
    );
    
    const userId = userResult.rows[0].id;
    console.log('Created test user with ID:', userId);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Test user created successfully!');
    console.log('-----------------------------');
    console.log('Email: testuser@example.com');
    console.log('Password: password123');
    console.log('User ID:', userId);
    
    return userId;
  } catch (err) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error creating test user:', err);
    throw err;
  } finally {
    client.release();
  }
}

createTestUser()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 