-- Add category column to scenarios table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'scenarios' AND column_name = 'category'
    ) THEN
        ALTER TABLE scenarios ADD COLUMN category VARCHAR(100);
    END IF;
END $$;

-- Update some example scenarios with categories
UPDATE scenarios SET category = 'Research' WHERE title LIKE '%Research%' OR description LIKE '%Research%';
UPDATE scenarios SET category = 'Writing' WHERE title LIKE '%Write%' OR title LIKE '%Writing%' OR description LIKE '%Write%' OR description LIKE '%Writing%';
UPDATE scenarios SET category = 'Analysis' WHERE title LIKE '%Analyze%' OR title LIKE '%Analysis%' OR description LIKE '%Analyze%' OR description LIKE '%Analysis%';
UPDATE scenarios SET category = 'Development' WHERE title LIKE '%Code%' OR title LIKE '%Program%' OR description LIKE '%Code%' OR description LIKE '%Program%';
UPDATE scenarios SET category = 'Learning' WHERE title LIKE '%Learn%' OR title LIKE '%Study%' OR description LIKE '%Learn%' OR description LIKE '%Study%';
UPDATE scenarios SET category = 'Productivity' WHERE category IS NULL;

-- Create a database index on the category field for faster filtering
CREATE INDEX IF NOT EXISTS idx_scenarios_category ON scenarios(category); 