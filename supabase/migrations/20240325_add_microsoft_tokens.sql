-- Add Microsoft OAuth token fields to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS microsoft_access_token TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS microsoft_refresh_token TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS microsoft_expires_at TIMESTAMPTZ;
