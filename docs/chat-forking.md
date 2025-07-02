# Chat Forking Feature

This document explains the chat forking functionality that automatically creates a copy of private chats when users try to access chats that don't belong to them.

## Overview

When a user tries to access a private chat that belongs to another user, the system automatically:

1. **Checks Access Permissions**: Determines if the user can access the chat
2. **Creates a Fork**: If access is denied, creates a complete copy of the chat for the requesting user
3. **Redirects**: Automatically redirects the user to their own copy
4. **Preserves Content**: All messages, metadata, and chat context are preserved

## Access Control Logic

### Permission Checks

The system performs the following checks in order:

1. **Chat Exists**: Verify the chat session exists
2. **User Authentication**: Ensure the user is authenticated
3. **Ownership**: Check if the user owns the chat
4. **Visibility**: Check if the chat is public or private

### Access Results

| Scenario | Result | Action |
|----------|--------|--------|
| User's own chat | ✅ Direct access | Load chat normally |
| Public chat | ✅ Direct access | Load chat normally |
| Other user's private chat | ❌ Fork required | Create copy and redirect |
| Chat not found | ❌ Error | Show error message |
| User not authenticated | ❌ Error | Show authentication error |

## API Endpoints

### Fork Chat Session

**POST** `/api/chat-sessions/fork`

Creates a complete copy of a chat session for a new user.

#### Request Body
```typescript
{
  originalSessionId: string;
  userId: string;
}
```

#### Response
```typescript
{
  success: boolean;
  newSessionId?: string;
  originalTitle?: string;
  newTitle?: string;
  messageCount?: number;
  shouldRedirect?: boolean;
  error?: string;
}
```

#### What Gets Copied

1. **Chat Session**:
   - Title (with " (Copy)" suffix)
   - Scenario progress and metadata
   - All timestamps (preserving context)

2. **All Messages**:
   - Content and formatting
   - Agent assignments
   - Tool calls and results
   - Metadata and annotations
   - Original timestamps (for context)

3. **Vector Store**:
   - New vector store created
   - Linked to the new chat session

#### What Gets Modified

- **User ID**: Set to the requesting user
- **Session ID**: New UUID generated
- **Title**: Original title + " (Copy)"
- **Visibility**: Always set to "private"
- **Created/Updated timestamps**: Set to current time

## Frontend Implementation

### Chat Access Handler

The `handleChatAccess` function in `/utils/chatAccess.ts` provides a unified interface:

```typescript
await handleChatAccess(
  sessionId,
  currentUserId,
  // onSuccess - user can access directly
  (sessionId) => loadChatSession(sessionId),
  // onFork - chat was forked
  (newSessionId, originalTitle) => {
    showSuccessMessage(`Created your own copy of "${originalTitle}"`);
    redirectToNewSession(newSessionId);
  },
  // onError
  (message) => showErrorMessage(message)
);
```

### User Experience

1. **Seamless Access**: Users don't see permission errors
2. **Clear Feedback**: Success message explains what happened
3. **Automatic Redirect**: URL updates to the new session
4. **Preserved Context**: All conversation history is maintained

## Security Considerations

### Private Chat Protection

- **No Direct Access**: Private chats cannot be accessed by non-owners
- **Fork-Only Access**: Users can only get their own copy
- **Ownership Transfer**: Forked chats belong entirely to the new user

### Data Isolation

- **Separate Sessions**: Original and forked chats are completely independent
- **User-Specific**: All forked content is owned by the requesting user
- **No Shared State**: Changes to one chat don't affect the other

## Database Schema

### Chat Sessions Table

The forking process creates new records with:

```sql
INSERT INTO chat_sessions (
  id,                    -- New UUID
  title,                 -- Original title + " (Copy)"
  user_id,              -- Requesting user's ID
  visibility,           -- Always 'private'
  is_public,            -- Always false
  scenario_progress,    -- Copied from original
  created_at,           -- Current timestamp
  updated_at            -- Current timestamp
)
```

### Messages Table

All messages are copied with:

```sql
INSERT INTO messages (
  id,                   -- New UUID for each message
  chat_session_id,      -- New session ID
  role,                 -- Preserved from original
  content,              -- Preserved from original
  user_id,              -- Set to requesting user
  agent_name,           -- Preserved from original
  metadata,             -- Preserved from original
  created_at            -- Preserved from original (for context)
)
```

## Error Handling

### Fork Failures

If forking fails, the system:

1. **Logs the Error**: Detailed error logging for debugging
2. **User Feedback**: Clear error message to the user
3. **Graceful Degradation**: No partial data created
4. **Rollback**: Any created records are cleaned up

### Common Error Scenarios

- **Database Connection Issues**: Network or database errors
- **Missing Original Chat**: Chat was deleted before forking
- **User Permission Issues**: User authentication problems
- **Resource Limits**: Insufficient storage or quotas

## Usage Examples

### Sharing a Private Chat Link

1. User A shares a private chat URL with User B
2. User B clicks the link
3. System detects User B cannot access User A's private chat
4. System automatically forks the chat for User B
5. User B sees: "Created your own copy of 'Project Discussion'"
6. User B can now interact with their own version

### Collaborative Workflows

1. **Template Sharing**: Users can share chat templates
2. **Conversation Starters**: Pre-built conversation flows
3. **Knowledge Transfer**: Share research or analysis chats
4. **Training Materials**: Educational chat sessions

## Performance Considerations

### Optimization Strategies

1. **Batch Operations**: Messages copied in efficient batches
2. **Lazy Loading**: Vector stores created but not immediately populated
3. **Background Processing**: Large chats forked asynchronously
4. **Caching**: Frequently forked chats cached for faster access

### Monitoring

- **Fork Frequency**: Track how often chats are forked
- **Performance Metrics**: Monitor fork operation timing
- **Error Rates**: Track fork failure rates
- **Storage Usage**: Monitor storage growth from forked chats

## Future Enhancements

### Planned Features

1. **Selective Forking**: Allow users to fork specific parts of conversations
2. **Fork History**: Track relationships between original and forked chats
3. **Merge Capabilities**: Allow merging changes back to original
4. **Fork Permissions**: Fine-grained control over who can fork chats
5. **Fork Templates**: Create reusable chat templates for forking 