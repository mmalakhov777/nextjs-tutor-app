# Chat Visibility Feature

This document explains the new public/private chat visibility feature that allows users to share their chat sessions publicly.

## Database Schema Changes

### New Columns in `chat_sessions` Table

The following columns have been added to the `chat_sessions` table:

```sql
-- Main visibility field (public or private)
visibility VARCHAR(20) DEFAULT 'private'

-- Boolean flag for easier querying
is_public BOOLEAN DEFAULT FALSE

-- Public URL slug for sharing
public_url VARCHAR(255)

-- Timestamp when chat was first made public
made_public_at TIMESTAMP
```

### Indexes and Constraints

```sql
-- Indexes for performance
CREATE INDEX idx_chat_sessions_visibility ON chat_sessions(visibility);
CREATE INDEX idx_chat_sessions_is_public ON chat_sessions(is_public);
CREATE INDEX idx_chat_sessions_public_url ON chat_sessions(public_url) WHERE public_url IS NOT NULL;

-- Partial index for public sessions
CREATE INDEX idx_chat_sessions_public ON chat_sessions(user_id, created_at) WHERE is_public = TRUE;

-- Constraints
ALTER TABLE chat_sessions ADD CONSTRAINT check_visibility_values CHECK (visibility IN ('public', 'private'));
CREATE UNIQUE INDEX idx_chat_sessions_public_url_unique ON chat_sessions(public_url) WHERE public_url IS NOT NULL;
```

### Database Trigger

A trigger automatically updates the `is_public` flag and manages timestamps:

```sql
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
```

## Migration

To apply the database changes, run:

```bash
# Make the script executable
chmod +x scripts/run-visibility-migration.sh

# Run the migration
./scripts/run-visibility-migration.sh
```

Or manually run the SQL:

```bash
psql "$CHAT_DATABASE_URL" -f scripts/add_visibility_to_chat_sessions.sql
```

## API Changes

### Updated PUT `/api/chat-sessions/[id]`

The endpoint now accepts additional fields:

```typescript
{
  title?: string;
  vector_store_id?: string;
  visibility?: 'public' | 'private';
  public_url?: string;
}
```

### Updated Response Schema

Chat session objects now include:

```typescript
interface ChatSession {
  // ... existing fields
  visibility?: 'public' | 'private';
  is_public?: boolean;
  public_url?: string | null;
  made_public_at?: string | null;
}
```

## UI Components

### ChatHeader Updates

The `ChatHeader` component now includes:

1. **Visibility Toggle Button**: Shows current visibility (Public/Private) with appropriate icons
2. **Share Button**: Appears when chat is public, allows copying the public URL
3. **Visual Indicators**: Public chats have a yellow background on the toggle button

### New Props

```typescript
interface ChatHeaderProps {
  // ... existing props
  onToggleVisibility?: (sessionId: string, visibility: 'public' | 'private') => Promise<void>;
}
```

## Public URL Generation

When a chat is made public, a unique URL is generated:

```typescript
const public_url = `chat-${sessionId.substring(0, 8)}-${Date.now()}`;
```

This creates URLs like: `chat-a1b2c3d4-1640995200000`

## Public Access

Public chats can be accessed via:

- **Local Development**: `http://localhost:3000/public/{public_url}`
- **Production**: `https://mystylus.ai/chat-agents/public/{public_url}`

## Security Considerations

1. **Private by Default**: All new chats are created as private
2. **Unique URLs**: Public URLs are unique and hard to guess
3. **User Control**: Only the chat owner can toggle visibility
4. **Automatic Cleanup**: Making a chat private removes the public URL

## Usage Flow

1. User creates a chat (defaults to private)
2. User clicks the visibility toggle button in ChatHeader
3. Chat becomes public and gets a unique URL
4. User can share the URL using the share button
5. User can make it private again, which removes public access

## Implementation Notes

- The visibility toggle is only shown when there's an active conversation
- The share button only appears for public chats with a valid public URL
- Loading states are handled during visibility changes
- Error handling provides user feedback for failed operations
- The UI updates immediately after successful visibility changes 