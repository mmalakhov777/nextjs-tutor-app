-- Add scenario_progress column to chat_sessions table
-- This will store the current scenario progress as JSON

DO $$ 
BEGIN
    -- Add scenario_progress column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' AND column_name = 'scenario_progress'
    ) THEN
        ALTER TABLE chat_sessions ADD COLUMN scenario_progress JSONB;
        COMMENT ON COLUMN chat_sessions.scenario_progress IS 'Stores current scenario progress including scenario data, current step, completed steps, and triggered actions';
    END IF;
    
    -- Add scenario_id column if it doesn't exist (for easier querying)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' AND column_name = 'scenario_id'
    ) THEN
        ALTER TABLE chat_sessions ADD COLUMN scenario_id VARCHAR(255);
        COMMENT ON COLUMN chat_sessions.scenario_id IS 'ID of the currently active scenario (if any)';
    END IF;
    
    -- Add scenario_started_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' AND column_name = 'scenario_started_at'
    ) THEN
        ALTER TABLE chat_sessions ADD COLUMN scenario_started_at TIMESTAMP;
        COMMENT ON COLUMN chat_sessions.scenario_started_at IS 'When the scenario was first started in this session';
    END IF;
    
    -- Add scenario_completed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' AND column_name = 'scenario_completed_at'
    ) THEN
        ALTER TABLE chat_sessions ADD COLUMN scenario_completed_at TIMESTAMP;
        COMMENT ON COLUMN chat_sessions.scenario_completed_at IS 'When the scenario was completed (if completed)';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_scenario_id ON chat_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_scenario_started_at ON chat_sessions(scenario_started_at);

-- Create a partial index for active scenarios (where scenario_progress is not null)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active_scenarios 
ON chat_sessions(user_id, scenario_id) 
WHERE scenario_progress IS NOT NULL;

COMMENT ON TABLE chat_sessions IS 'Chat sessions with optional scenario progress tracking'; 