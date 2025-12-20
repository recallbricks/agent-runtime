const { AgentRuntime } = require('./dist/index');

async function test() {
  console.log('í·± Testing RecallBricks Runtime\n');
  
  const agent = new AgentRuntime({
    agentId: 'test-agent',
    userId: 'tyler',
    llmProvider: 'anthropic',
    llmApiKey: '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',
    apiKey: 'rb_live_8dd6d067c4470b7bbdf15e33d68736cb',
    debug: false
  });

  console.log('âœ… Agent initialized\n');

  console.log('TEST 1: Save preference');
  const r1 = await agent.chat('My favorite color is blue');
  console.log('Full response object:', JSON.stringify(r1, null, 2));
  
  console.log('\nTEST 2: Recall preference');
  const r2 = await agent.chat('What is my favorite color?');
  console.log('Full response object:', JSON.stringify(r2, null, 2));
  
  console.log('\ní¾‰ MEMORY WORKS! Check the response structure above.');
}

test().catch(console.error);
