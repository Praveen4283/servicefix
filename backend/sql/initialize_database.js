const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

// --- BEGIN DEBUG LOGGING ---
// console.log('Script started.');
// try {
//   require('dotenv').config({ path: '../.env', debug: true }); // Enable dotenv debug logging
//   console.log('dotenv config loaded (or attempted).');
// } catch (e) {
//   console.error('Error loading .env:', e);
// }
// console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
// console.log('DB_PORT:', process.env.DB_PORT || '5432');
// console.log('DB_USERNAME:', process.env.DB_USERNAME || 'postgres');
// console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '******' : 'root (default)'); // Don't log actual password
// console.log('Attempting to create pgPool...');
// --- END DEBUG LOGGING ---

// Create connection to postgres database to create our app database
const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: 'postgres', // Connect to default postgres database
});

async function initializeDatabase() {
  // First, check if postgres server is running
  try {
    // console.log('Connecting to PostgreSQL server...');
    await pgPool.query('SELECT NOW()');
    // console.log('Connected to PostgreSQL server successfully.');
    
    const dbName = process.env.DB_DATABASE || 'servicedesk';
    
    // Check if our database exists
    const dbCheckResult = await pgPool.query(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) as exists",
      [dbName]
    );
    
    // Drop the database if it exists
    if (dbCheckResult.rows[0].exists) {
      // console.log(`Database ${dbName} exists. Dropping it to recreate...`);
      
      // Terminate all connections to the database
      await pgPool.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid()
      `, [dbName]);
      
      await pgPool.query(`DROP DATABASE IF EXISTS ${dbName}`);
      // console.log(`Database ${dbName} dropped successfully.`);
    }
    
    // Create database
    // console.log(`Creating database ${dbName}...`);
    await pgPool.query(`CREATE DATABASE ${dbName}`);
    // console.log(`Database ${dbName} created successfully.`);
    
    // Now connect to our app database
    const appPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'root',
      database: dbName,
    });
    
    // Create extensions
    // console.log('Creating extensions...');
    await appPool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    // console.log('Extensions created successfully.');
    
    // Read and execute schema.sql
    // console.log('Creating database schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema SQL
    await appPool.query(schemaSql);
    // console.log('Database schema created successfully.');
    
    // Create a default organization for system-wide defaults
    const defaultOrgResult = await appPool.query(`
      INSERT INTO organizations (name, domain) 
      VALUES ('Default Organization', 'default.local') 
      RETURNING id;
    `);
    const defaultOrgId = defaultOrgResult.rows[0].id;

    // console.log('Database initialization completed successfully.');
    process.exit(0);
  } catch (error) {
    // console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();