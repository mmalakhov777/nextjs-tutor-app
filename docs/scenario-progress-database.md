# Scenario Progress Database Integration

This document explains how scenario progress is now stored in the database instead of sessionStorage, providing persistence across browser sessions and devices.

## Database Schema Changes

### New Columns in `chat_sessions` Table

The following columns have been added to the `chat_sessions` table:

```sql
-- Stores the complete scenario progress as JSON
scenario_progress JSONB

-- ID of the currently active scenario (for easier querying)
scenario_id VARCHAR(255)

-- When the scenario was first started in this session
scenario_started_at TIMESTAMP

-- When the scenario was completed (if completed)
scenario_completed_at TIMESTAMP
```

### Indexes

The following indexes have been created for better performance:

```sql
-- Index on scenario_id for faster filtering
CREATE INDEX idx_chat_sessions_scenario_id ON chat_sessions(scenario_id);

-- Index on scenario start time
CREATE INDEX idx_chat_sessions_scenario_started_at ON chat_sessions(scenario_started_at);

-- Partial index for active scenarios
CREATE INDEX idx_chat_sessions_active_scenarios 
ON chat_sessions(user_id, scenario_id) 
WHERE scenario_progress IS NOT NULL;
```

## Migration

To apply the database changes, run:

```bash
# Make the script executable
chmod +x scripts/run-scenario-progress-migration.sh

# Run the migration
./scripts/run-scenario-progress-migration.sh
```

Or manually run the SQL:

```bash
psql "$CHAT_DATABASE_URL" -f scripts/add_scenario_progress_to_chat_sessions.sql
```

## Data Structure

### ScenarioProgress Type

```typescript
interface ScenarioProgress {
  scenario: {
    id: string;
    title: string;
    description: string;
    steps: Array<{
      title: string;
      description: string;
      actions: Array<{
        label: string;
        prompt: string;
        agentName?: string;
        type?: 'research' | 'chat';
      }>;
    }>;
  };
  currentStep: number;
  completedSteps: number[];
  triggeredActions: Record<string, boolean>;
  startedAt: string;
  lastUpdatedAt: string;
}
```

### Example JSON in Database

```json
{
  "scenario": {
    "id": "research-analysis-2024",
    "title": "Research Analysis",
    "description": "Comprehensive research and analysis workflow",
    "steps": [
      {
        "title": "Initial Research",
        "description": "Gather preliminary information",
        "actions": [
          {
            "label": "Search Web",
            "prompt": "Search for recent information about...",
            "agentName": "Research Agent",
            "type": "research"
          }
        ]
      }
    ]
  },
  "currentStep": 1,
  "completedSteps": [0],
  "triggeredActions": {
    "step_0_action_0": true,
    "step_1_action_0": false
  },
  "startedAt": "2024-01-15T10:30:00.000Z",
  "lastUpdatedAt": "2024-01-15T10:45:00.000Z"
}
```

## API Endpoints

### Get Scenario Progress

```http
GET /api/chat-sessions/{sessionId}/scenario-progress
```

**Response:**
```json
{
  "scenario_id": "research-analysis-2024",
  "scenario_progress": { /* ScenarioProgress object */ },
  "scenario_started_at": "2024-01-15T10:30:00.000Z",
  "scenario_completed_at": null
}
```

### Update Scenario Progress

```http
PUT /api/chat-sessions/{sessionId}/scenario-progress
```

**Request Body:**
```json
{
  "scenario_progress": { /* ScenarioProgress object */ },
  "scenario_id": "research-analysis-2024",
  "completed": false
}
```

### Clear Scenario Progress

```http
DELETE /api/chat-sessions/{sessionId}/scenario-progress
```

## Service Usage

### ScenarioProgressService

The `ScenarioProgressService` provides a clean interface for scenario progress operations:

```typescript
import { scenarioProgressService } from '@/services/scenarioProgressService';

// Save progress
await scenarioProgressService.saveScenarioProgress(sessionId, scenarioProgress);

// Load progress
const result = await scenarioProgressService.loadScenarioProgress(sessionId);
if (result.success && result.data?.scenario_progress) {
  // Use the loaded progress
}

// Clear progress
await scenarioProgressService.clearScenarioProgress(sessionId);

// Mark as completed
await scenarioProgressService.completeScenario(sessionId, scenarioProgress);
```

## Benefits

1. **Persistence**: Scenario progress survives browser refreshes and device switches
2. **Reliability**: No data loss from sessionStorage limitations
3. **Scalability**: Can handle large scenario data without browser storage limits
4. **Analytics**: Can track scenario usage patterns across users
5. **Recovery**: Users can continue scenarios from any device
6. **History**: Complete audit trail of scenario progress

## Migration from SessionStorage

The system automatically migrates from the old sessionStorage-based approach:

1. **Backward Compatibility**: Old sessionStorage data is still read if database data is not available
2. **Gradual Migration**: New progress is always saved to database
3. **Cleanup**: Old sessionStorage data can be safely cleared after migration

## Performance Considerations

1. **Indexes**: Proper indexes ensure fast queries even with large datasets
2. **JSON Queries**: PostgreSQL JSONB allows efficient querying of scenario data
3. **Caching**: Consider implementing Redis caching for frequently accessed scenarios
4. **Batch Updates**: Multiple progress updates can be batched for better performance

## Monitoring

Monitor the following metrics:

1. **Scenario Completion Rates**: Track how many scenarios are completed vs abandoned
2. **Step Progression**: Analyze which steps users struggle with
3. **Database Performance**: Monitor query performance on scenario-related tables
4. **Storage Usage**: Track growth of scenario_progress JSON data

## Troubleshooting

### Common Issues

1. **Migration Fails**: Ensure CHAT_DATABASE_URL is set correctly
2. **Permission Errors**: Database user needs ALTER TABLE permissions
3. **JSON Validation**: Ensure scenario data matches the expected schema
4. **Performance Issues**: Check if indexes are being used properly

### Debugging

```sql
-- Check scenario progress for a session
SELECT scenario_id, scenario_progress, scenario_started_at 
FROM chat_sessions 
WHERE id = 'session-id';

-- Find all active scenarios for a user
SELECT id, title, scenario_id, scenario_started_at
FROM chat_sessions 
WHERE user_id = 'user-id' AND scenario_progress IS NOT NULL;

-- Analyze scenario completion rates
SELECT 
  scenario_id,
  COUNT(*) as total_sessions,
  COUNT(scenario_completed_at) as completed_sessions,
  ROUND(COUNT(scenario_completed_at) * 100.0 / COUNT(*), 2) as completion_rate
FROM chat_sessions 
WHERE scenario_id IS NOT NULL
GROUP BY scenario_id;
``` 