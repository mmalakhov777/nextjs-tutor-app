-- Fix for the missing update_session_tool_calls_types function
-- This function is being called by a trigger when tool messages are inserted

-- First, create the function if it doesn't exist
CREATE OR REPLACE FUNCTION update_session_tool_calls_types(session_id UUID)
RETURNS VOID AS $$
BEGIN
    -- This is a placeholder function to prevent errors
    -- If you need this function to actually update tool_call_types, 
    -- implement the logic here
    
    -- For now, just return without doing anything
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Alternative: If you want to drop the trigger that's calling this function
-- You would need to find the trigger name first with:
-- SELECT trigger_name FROM information_schema.triggers 
-- WHERE event_object_table = 'messages' 
-- AND trigger_name LIKE '%tool%';

COMMENT ON FUNCTION update_session_tool_calls_types IS 'Placeholder function to fix tool message insertion errors'; 