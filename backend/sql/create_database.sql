-- Create the servicedesk database if it doesn't exist
CREATE DATABASE servicedesk
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    -- Use the default collation for Windows
    CONNECTION LIMIT = -1;

-- Connect to the servicedesk database
\c servicedesk