-- Add slide_images table to store generated slide images
-- This will store slide images with their prompts, metadata, and base64 data

DO $$ 
BEGIN
    -- Create slide_images table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'slide_images' AND table_schema = 'public'
    ) THEN
        CREATE TABLE slide_images (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slide_id VARCHAR(255) NOT NULL, -- Slide identifier (e.g., "1", "2", "slide-1")
            slide_number INTEGER NOT NULL, -- Numeric slide position
            session_id VARCHAR(255), -- Optional: associate with chat session
            user_id VARCHAR(255), -- Optional: associate with user
            title TEXT NOT NULL, -- Slide title
            image_prompt TEXT NOT NULL, -- The prompt used to generate the image
            image_data TEXT NOT NULL, -- Base64 encoded image data
            image_mime_type VARCHAR(50) DEFAULT 'image/jpeg', -- MIME type of the image
            image_width INTEGER, -- Image width in pixels
            image_height INTEGER, -- Image height in pixels
            background_color VARCHAR(7), -- Slide background color (hex)
            style VARCHAR(50), -- Slide style (modern, classic)
            transition VARCHAR(50), -- Slide transition type
            provider VARCHAR(50), -- AI provider used (gemini, openai)
            generation_metadata JSONB, -- Additional metadata from generation
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        COMMENT ON TABLE slide_images IS 'Stores generated slide images with their prompts and metadata';
        COMMENT ON COLUMN slide_images.slide_id IS 'Slide identifier, can be numeric or string';
        COMMENT ON COLUMN slide_images.slide_number IS 'Numeric position of slide in presentation';
        COMMENT ON COLUMN slide_images.session_id IS 'Chat session this slide belongs to';
        COMMENT ON COLUMN slide_images.user_id IS 'User who created this slide';
        COMMENT ON COLUMN slide_images.image_prompt IS 'AI prompt used to generate the image';
        COMMENT ON COLUMN slide_images.image_data IS 'Base64 encoded image data';
        COMMENT ON COLUMN slide_images.provider IS 'AI provider used for generation (gemini, openai)';
        COMMENT ON COLUMN slide_images.generation_metadata IS 'Additional metadata from the generation process';
    END IF;
    
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_slide_images_slide_id ON slide_images(slide_id);
    CREATE INDEX IF NOT EXISTS idx_slide_images_slide_number ON slide_images(slide_number);
    CREATE INDEX IF NOT EXISTS idx_slide_images_session_id ON slide_images(session_id);
    CREATE INDEX IF NOT EXISTS idx_slide_images_user_id ON slide_images(user_id);
    CREATE INDEX IF NOT EXISTS idx_slide_images_created_at ON slide_images(created_at);
    
    -- Create a composite index for efficient slide lookups
    CREATE INDEX IF NOT EXISTS idx_slide_images_session_slide 
    ON slide_images(session_id, slide_number) 
    WHERE session_id IS NOT NULL;
    
    -- Create a partial index for user slides
    CREATE INDEX IF NOT EXISTS idx_slide_images_user_slides 
    ON slide_images(user_id, slide_number, created_at) 
    WHERE user_id IS NOT NULL;
    
END $$; 