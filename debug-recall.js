const { AgentRuntime } = require('./dist/index');

async function test() {
  console.log('í´ Debug: Check if memories are being saved and recalled\n');
  
  const agent = new AgentRuntime({
    agentId: 'debug-agent',
    userId: 'debug-user',
    llmProvider: 'anthropic',
    llmApiKey: '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',
    apiKey: 'rb_live_8dd6d067c4470b7bbdf15e33d68736cb',
    debug: true  // ENABLE DEBUG LOGGING
  });
  
  console.log('Step 1: Save a memory...');
  await agent.chat('Test data ABC123');
  
  console.log('\nStep 2: Try to recall it...');
  await agent.chat('What was the test data?');
}

test().catch(err => {
  console.error('âŒ ERROR:', err.message);
  process.exit(1);
});
