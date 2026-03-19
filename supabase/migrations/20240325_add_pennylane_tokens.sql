-- Add Pennylane OAuth token fields to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pennylane_access_token TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pennylane_refresh_token TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pennylane_expires_at TIMESTAMPTZ;
