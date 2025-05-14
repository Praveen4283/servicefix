const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

// Create connection to postgres database to create our app database
const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: 'postgres', // Connect to default postgres database
});

async function initializeDatabase() {
  try {
    await pgPool.query('SELECT NOW()');
    
    const dbName = process.env.DB_DATABASE || 'servicedesk';
    
    // Check if our database exists
    const dbCheckResult = await pgPool.query(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) as exists",
      [dbName]
    );
    
    // Drop the database if it exists
    if (dbCheckResult.rows[0].exists) {
      // Terminate all connections to the database
      await pgPool.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid()
      `, [dbName]);
      
      await pgPool.query(`DROP DATABASE IF EXISTS ${dbName}`);
    }
    
    // Create database
    await pgPool.query(`CREATE DATABASE ${dbName}`);
    
    // Now connect to our app database
    const appPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'root',
      database: dbName,
    });
    
    // Create extensions
    await appPool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema SQL
    await appPool.query(schemaSql);
    
    // Create a default organization for system-wide defaults
    await appPool.query(`
      INSERT INTO organizations (name, domain) 
      VALUES ('Default Organization', 'default.local') 
      RETURNING id;
    `);

    console.log('Database initialization completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();