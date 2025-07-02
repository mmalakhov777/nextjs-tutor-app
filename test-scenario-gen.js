// Simple script to test the scenario generator API
// No need to import fetch as it's global in modern Node.js

async function testScenarioGenerator() {
  try {
    console.log('Testing scenario generator API...');
    const response = await fetch('http://localhost:4200/api/scenarios/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Create a marketing campaign for a new product launch',
      }),
    });

    // Check if response is okay
    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(errorText);
      return;
    }

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Handle text stream response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedData = '';

    console.log('\nStreaming response:');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      accumulatedData += chunk;
      console.log(chunk);
    }

    console.log('\nComplete response:');
    console.log(accumulatedData);

    // Try to parse the response
    try {
      const jsonData = JSON.parse(accumulatedData);
      console.log('\nParsed JSON:');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.error('\nFailed to parse response as JSON:', e.message);
    }
  } catch (error) {
    console.error('Error testing scenario generator:', error);
  }
}

testScenarioGenerator(); 