#!/usr/bin/env node

/**
 * Test script for scenario progress API endpoints
 * Tests all CRUD operations for scenario progress in database
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4200';
const TEST_SESSION_ID = 'test-session-' + Date.now();

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
  
  if (result.ok && result.data.session_id) {
    log('✅ Chat session created successfully', { sessionId: result.data.session_id });
    return result.data.session_id;
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

async function testCompleteScenario(sessionId) {
  log(`Completing scenario for session: ${sessionId}`);
  
  // Complete scenario: all steps done, all actions triggered
  const completedProgress = {
    ...TEST_SCENARIO_PROGRESS,
    currentStep: 1, // Last step
    completedSteps: [0, 1],
    triggeredActions: {
      'step_0_action_0': true,
      'step_0_action_1': true,
      'step_1_action_0': true
    },
    lastUpdatedAt: new Date().toISOString()
  };
  
  const result = await makeRequest(`${BASE_URL}/api/chat-sessions/${sessionId}/scenario-progress`, {
    method: 'PUT',
    body: JSON.stringify({
      scenario_progress: completedProgress,
      scenario_id: completedProgress.scenario.id,
      completed: true
    })
  });
  
  if (result.ok) {
    log('✅ Successfully completed scenario', result.data);
    return true;
  } else {
    logError('❌ Failed to complete scenario', result);
    return false;
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

async function testScenarioProgressPersistence(sessionId) {
  log('Testing scenario progress persistence...');
  
  // Save initial progress
  const saved = await testSaveScenarioProgress(sessionId, TEST_SCENARIO_PROGRESS);
  if (!saved) return false;
  
  // Retrieve and verify
  const retrieved = await testGetScenarioProgress(sessionId);
  if (!retrieved || !retrieved.scenario_progress) {
    logError('❌ Failed to retrieve saved progress');
    return false;
  }
  
  // Verify data integrity
  const savedData = retrieved.scenario_progress;
  if (savedData.scenario.id !== TEST_SCENARIO_PROGRESS.scenario.id) {
    logError('❌ Scenario ID mismatch');
    return false;
  }
  
  if (savedData.currentStep !== TEST_SCENARIO_PROGRESS.currentStep) {
    logError('❌ Current step mismatch');
    return false;
  }
  
  log('✅ Scenario progress persistence test passed');
  return true;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Scenario Progress API Tests');
  console.log('=====================================');
  
  let sessionId;
  let testsPassed = 0;
  let totalTests = 0;
  
  try {
    // Test 1: Create chat session
    totalTests++;
    sessionId = await testCreateChatSession();
    if (sessionId) {
      testsPassed++;
    } else {
      console.log('❌ Cannot continue without session ID');
      return;
    }
    
    // Test 2: Get initial progress (should be empty)
    totalTests++;
    const initialProgress = await testGetScenarioProgress(sessionId);
    if (initialProgress === null || !initialProgress.scenario_progress) {
      testsPassed++;
    }
    
    // Test 3: Save scenario progress
    totalTests++;
    const saved = await testSaveScenarioProgress(sessionId, TEST_SCENARIO_PROGRESS);
    if (saved) testsPassed++;
    
    // Test 4: Retrieve saved progress
    totalTests++;
    const retrieved = await testGetScenarioProgress(sessionId);
    if (retrieved && retrieved.scenario_progress) {
      testsPassed++;
    }
    
    // Test 5: Update scenario progress
    totalTests++;
    const updated = await testUpdateScenarioProgress(sessionId);
    if (updated) testsPassed++;
    
    // Test 6: Complete scenario
    totalTests++;
    const completed = await testCompleteScenario(sessionId);
    if (completed) testsPassed++;
    
    // Test 7: Verify completion
    totalTests++;
    const completedProgress = await testGetScenarioProgress(sessionId);
    if (completedProgress && completedProgress.scenario_completed_at) {
      log('✅ Scenario completion verified');
      testsPassed++;
    } else {
      logError('❌ Scenario completion not recorded');
    }
    
    // Test 8: Test persistence
    totalTests++;
    const persistenceTest = await testScenarioProgressPersistence(sessionId);
    if (persistenceTest) testsPassed++;
    
    // Test 9: Clear scenario progress
    totalTests++;
    const cleared = await testClearScenarioProgress(sessionId);
    if (cleared) testsPassed++;
    
    // Test 10: Verify clearing
    totalTests++;
    const clearedProgress = await testGetScenarioProgress(sessionId);
    if (!clearedProgress || !clearedProgress.scenario_progress) {
      log('✅ Scenario progress clearing verified');
      testsPassed++;
    } else {
      logError('❌ Scenario progress not properly cleared');
    }
    
  } catch (error) {
    logError('Test suite failed with error', error);
  }
  
  // Results
  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`Tests Passed: ${testsPassed}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);
  
  if (testsPassed === totalTests) {
    console.log('🎉 All tests passed! Scenario progress API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
  
  console.log(`\nTest session ID: ${sessionId}`);
}

// Run tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testCreateChatSession,
  testGetScenarioProgress,
  testSaveScenarioProgress,
  testUpdateScenarioProgress,
  testCompleteScenario,
  testClearScenarioProgress
}; 