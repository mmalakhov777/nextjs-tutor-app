-- Add visibility column to chat_sessions table
-- This will store whether the chat session is public or private

DO $$ 
BEGIN
    -- Add visibility column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' AND column_name = 'visibility'
    ) THEN
        ALTER TABLE chat_sessions ADD COLUMN visibility VARCHAR(20) DEFAULT 'private';
        COMMENT ON COLUMN chat_sessions.visibility IS 'Chat session visibility: public or private (default: private)';
    END IF;
    
    -- Add is_public column if it doesn't exist (for easier boolean querying)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' AND column_name = 'is_public'
    ) THEN
        ALTER TABLE chat_sessions ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN chat_sessions.is_public IS 'Boolean flag for public visibility (derived from visibility field)';
    END IF;
    
    -- Add public_url column if it doesn't exist (for sharing)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' AND column_name = 'public_url'
    ) THEN
        ALTER TABLE chat_sessions ADD COLUMN public_url VARCHAR(255);
        COMMENT ON COLUMN chat_sessions.public_url IS 'Public URL slug for sharing (only set when visibility is public)';
    END IF;
    
    -- Add made_public_at column if it doesn't exist (for tracking)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' AND column_name = 'made_public_at'
    ) THEN
        ALTER TABLE chat_sessions ADD COLUMN made_public_at TIMESTAMP;
        COMMENT ON COLUMN chat_sessions.made_public_at IS 'When the chat was first made public (if ever)';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_visibility ON chat_sessions(visibility);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_public ON chat_sessions(is_public);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_public_url ON chat_sessions(public_url) WHERE public_url IS NOT NULL;

-- Create a partial index for public sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_public 
ON chat_sessions(user_id, created_at) 
WHERE is_public = TRUE;

-- Add constraint to ensure visibility values are valid
ALTER TABLE chat_sessions 
ADD CONSTRAINT check_visibility_values 
CHECK (visibility IN ('public', 'private'));

-- Add constraint to ensure public_url is unique when not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_sessions_public_url_unique 
ON chat_sessions(public_url) 
WHERE public_url IS NOT NULL;

-- Create a trigger to automatically update is_public based on visibility
CREATE OR REPLACE FUNCTION update_is_public_flag()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_public = (NEW.visibility = 'public');
    
    -- Set made_public_at when first made public
    IF NEW.visibility = 'public' AND OLD.visibility != 'public' THEN
        NEW.made_public_at = NOW();
    END IF;
    
    -- Clear made_public_at when made private
    IF NEW.visibility = 'private' AND OLD.visibility = 'public' THEN
        NEW.made_public_at = NULL;
        NEW.public_url = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create it
DROP TRIGGER IF EXISTS trigger_update_is_public_flag ON chat_sessions;
CREATE TRIGGER trigger_update_is_public_flag
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_is_public_flag();

COMMENT ON TABLE chat_sessions IS 'Chat sessions with visibility control (public/private)'; 