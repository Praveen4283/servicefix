-- Migration: Add IP address tracking to user_tokens table
-- Created: 2025-12-09
-- Description: Add columns to track IP addresses, user agents, and last usage time for security auditing

BEGIN;

-- Add new columns to user_tokens table
ALTER TABLE user_tokens 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_ip_address ON user_tokens(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_last_used ON user_tokens(user_id, last_used_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN user_tokens.ip_address IS 'IP address from which the token was created (IPv4 or IPv6)';
COMMENT ON COLUMN user_tokens.user_agent IS 'Browser/device user agent string for device identification';
COMMENT ON COLUMN user_tokens.last_used_at IS 'Last time this token was used for authentication or refresh';

COMMIT;
