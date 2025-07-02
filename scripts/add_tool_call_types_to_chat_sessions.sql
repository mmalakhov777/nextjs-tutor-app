-- Add tool_call_types column to chat_sessions table
-- This will store the types of tool calls used in the session when made public

DO $$ 
BEGIN
    -- Add tool_call_types column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' AND column_name = 'tool_call_types'
    ) THEN
        ALTER TABLE chat_sessions ADD COLUMN tool_call_types TEXT[];
        COMMENT ON COLUMN chat_sessions.tool_call_types IS 'Array of tool types used in this chat session (populated when made public)';
    END IF;
END $$;

-- Create index for better performance when querying by tool types
CREATE INDEX IF NOT EXISTS idx_chat_sessions_tool_call_types ON chat_sessions USING GIN(tool_call_types);

COMMENT ON TABLE chat_sessions IS 'Chat sessions with visibility control and tool usage tracking'; 