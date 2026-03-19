-- Add Pennylane and Microsoft integration fields to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pennylane_api_key TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS microsoft_tenant_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS microsoft_client_id TEXT;

-- Secure the API key (ensure only managers can see it if needed)
-- Note: Assuming RLS already restricts organizations access to members. 
-- In a real production app, we might want to store this in a separate 'secrets' table or use vault.
