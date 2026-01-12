-- Add app_pin column to booths table
ALTER TABLE booths ADD COLUMN IF NOT EXISTS app_pin VARCHAR(6);

-- Add comment
COMMENT ON COLUMN booths.app_pin IS '6-digit PIN for booth app access';
