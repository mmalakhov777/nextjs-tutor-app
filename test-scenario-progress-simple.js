/**
 * Simple test script for scenario progress API endpoints
 * Can be run in browser console or Node.js 18+
 */

// Configuration
const BASE_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4200');

// Test data
const TEST_SCENARIO_PROGRESS = {
  scenario: {
    id: 'test-scenario-2024',
    title: 'Test Research Analysis',
    description: 'Test scenario for progress saving',
    steps: [
      {
        title: 'Initial Research',
        description: 'Gather preliminary information',
        actions: [
          {
            label: 'Search Web',
            prompt: 'Search for recent information about...',
            agentName: 'Research Agent',
            type: 'research'
          },
          {
            label: 'Analyze Data',
            prompt: 'Analyze the gathered data...',
            agentName: 'General Assistant',
            type: 'chat'
          }
        ]
      },
      {
        title: 'Deep Analysis',
        description: 'Perform detailed analysis',
        actions: [
          {
            label: 'Create Report',
            prompt: 'Create a comprehensive report...',
            agentName: 'Claude Creative',
            type: 'chat'
          }
        ]
      }
    ]
  },
  currentStep: 0,
  completedSteps: [],
  triggeredActions: {},
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString()
};

// Helper functions
function log(message, data = null) {
  console.log(`[TEST] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logError(message, error) {
  console.error(`[ERROR] ${message}`);
  console.error(error);
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message
    };
  }
}

// Test functions
async function testCreateChatSession() {
  log('Creating test chat session...');
  
  const result = await makeRequest(`${BASE_URL}/api/create-chat-session`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: 'test-user-' + Date.now(),
      title: 'Test Session for Scenario Progress'
    })
  });
  
  if (result.ok && result.data.session && result.data.session.id) {
    log('✅ Chat session created successfully', { sessionId: result.data.session.id });
    return result.data.session.id;
  } else {
    logError('❌ Failed to create chat session', result);
    return null;
  }
}

async function testGetScenarioProgress(sessionId) {
  log(`Getting scenario progress for session: ${sessionId}`);
  
  const result = await makeRequest(`${BASE_URL}/api/chat-sessions/${sessionId}/scenario-progress`);
  
  if (result.ok) {
    log('✅ Successfully retrieved scenario progress', result.data);
    return result.data;
  } else if (result.status === 404) {
    log('✅ No scenario progress found (expected for new session)', result.data);
    return null;
  } else {
    logError('❌ Failed to get scenario progress', result);
    return null;
  }
}

async function testSaveScenarioProgress(sessionId, scenarioProgress, completed = false) {
  log(`Saving scenario progress for session: ${sessionId}`, { completed });
  
  const result = await makeRequest(`${BASE_URL}/api/chat-sessions/${sessionId}/scenario-progress`, {
    method: 'PUT',
    body: JSON.stringify({
      scenario_progress: scenarioProgress,
      scenario_id: scenarioProgress.scenario.id,
      completed
    })
  });
  
  if (result.ok) {
    log('✅ Successfully saved scenario progress', result.data);
    return true;
  } else {
    logError('❌ Failed to save scenario progress', result);
    return false;
  }
}

async function testUpdateScenarioProgress(sessionId) {
  log(`Updating scenario progress for session: ${sessionId}`);
  
  // Update progress: move to step 1, complete step 0, trigger first action
  const updatedProgress = {
    ...TEST_SCENARIO_PROGRESS,
    currentStep: 1,
    completedSteps: [0],
    triggeredActions: {
      'step_0_action_0': true,
      'step_0_action_1': true
    },
    lastUpdatedAt: new Date().toISOString()
  };
  
  const result = await makeRequest(`${BASE_URL}/api/chat-sessions/${sessionId}/scenario-progress`, {
    method: 'PUT',
    body: JSON.stringify({
      scenario_progress: updatedProgress,
      scenario_id: updatedProgress.scenario.id,
      completed: false
    })
  });
  
  if (result.ok) {
    log('✅ Successfully updated scenario progress', result.data);
    return updatedProgress;
  } else {
    logError('❌ Failed to update scenario progress', result);
    return null;
  }
}

async function testClearScenarioProgress(sessionId) {
  log(`Clearing scenario progress for session: ${sessionId}`);
  
  const result = await makeRequest(`${BASE_URL}/api/chat-sessions/${sessionId}/scenario-progress`, {
    method: 'DELETE'
  });
  
  if (result.ok) {
    log('✅ Successfully cleared scenario progress', result.data);
    return true;
  } else {
    logError('❌ Failed to clear scenario progress', result);
    return false;
  }
}

// Quick test function for browser console
async function quickTest() {
  console.log('🚀 Starting Quick Scenario Progress Test');
  console.log('========================================');
  
  try {
    // Create session
    const sessionId = await testCreateChatSession();
    if (!sessionId) {
      console.log('❌ Cannot continue without session ID');
      return;
    }
    
    // Test save
    const saved = await testSaveScenarioProgress(sessionId, TEST_SCENARIO_PROGRESS);
    if (!saved) {
      console.log('❌ Save test failed');
      return;
    }
    
    // Test retrieve
    const retrieved = await testGetScenarioProgress(sessionId);
    if (!retrieved || !retrieved.scenario_progress) {
      console.log('❌ Retrieve test failed');
      return;
    }
    
    // Test update
    const updated = await testUpdateScenarioProgress(sessionId);
    if (!updated) {
      console.log('❌ Update test failed');
      return;
    }
    
    // Test clear
    const cleared = await testClearScenarioProgress(sessionId);
    if (!cleared) {
      console.log('❌ Clear test failed');
      return;
    }
    
    console.log('🎉 All quick tests passed!');
    console.log(`Test session ID: ${sessionId}`);
    
  } catch (error) {
    logError('Quick test failed', error);
  }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
  // Browser environment
  window.testScenarioProgress = {
    quickTest,
    testCreateChatSession,
    testGetScenarioProgress,
    testSaveScenarioProgress,
    testUpdateScenarioProgress,
    testClearScenarioProgress,
    TEST_SCENARIO_PROGRESS
  };
  
  console.log('Scenario progress test functions loaded!');
  console.log('Run: testScenarioProgress.quickTest()');
} else {
  // Node.js environment
  module.exports = {
    quickTest,
    testCreateChatSession,
    testGetScenarioProgress,
    testSaveScenarioProgress,
    testUpdateScenarioProgress,
    testClearScenarioProgress,
    TEST_SCENARIO_PROGRESS
  };
}

// Auto-run in Node.js if this is the main module
if (typeof require !== 'undefined' && require.main === module) {
  quickTest().catch(console.error);
} 