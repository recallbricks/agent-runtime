const { AgentRuntime } = require('./dist/index');

async function test() {
  console.log('í·ª Test 3: Persistence Across Sessions (Same Agent)\n');
  
  console.log('Session 1: Saving data...');
  const session1 = new AgentRuntime({
    agentId: 'persist-agent',  // SAME AGENT ID
    userId: 'persist-user',
    llmProvider: 'anthropic',
    llmApiKey: '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',
    apiKey: 'rb_live_8dd6d067c4470b7bbdf15e33d68736cb',
    debug: false
  });
  
  await session1.chat('My employee ID is EMP-42069');
  console.log('âœ“ Data saved in session 1\n');
  
  console.log('Session 2: New runtime instance (simulating restart)...');
  const session2 = new AgentRuntime({
    agentId: 'persist-agent',  // SAME AGENT ID
    userId: 'persist-user',
    llmProvider: 'anthropic',
    llmApiKey: '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',
    apiKey: 'rb_live_8dd6d067c4470b7bbdf15e33d68736cb',
    debug: false
  });
  
  const recall = await session2.chat('What is my employee ID?');
  
  console.log('\nSession 2 response:', recall.response);
  
  if (recall.response.includes('42069')) {
    console.log('\nâœ… PASS: Persistence works\n');
  } else {
    console.log('\nâŒ FAIL: Memory not persisting\n');
    console.log('\nNote: Memories might be filtered by agent_id in your API');
    process.exit(1);
  }
}

test().catch(err => {
  console.error('âŒ ERROR:', err.message);
  process.exit(1);
});
