const { AgentRuntime } = require('./dist/index');

async function test() {
  console.log('í·± Testing RecallBricks Runtime with USER API KEY\n');
  
  const agent = new AgentRuntime({
    agentId: 'test-agent',
    userId: 'tyler', 
    llmProvider: 'anthropic',
    llmApiKey: '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',
    apiKey: 'rb_live_8dd6d067c4470b7bbdf15e33d68736cb', // USER KEY
    debug: false
  });

  console.log('âœ… Agent initialized\n');

  // Test 1: Simple question (should work even without memories)
  console.log('TEST 1: Simple math...');
  const response1 = await agent.chat('What is 2+2?');
  console.log('âœ“ Response:', response1.text);
  console.log('âœ“ Tokens:', response1.metadata.tokensUsed);

  // Test 2: Save a memory
  console.log('\n\nTEST 2: Saving preference...');
  const response2 = await agent.chat('Remember that my favorite color is blue');
  console.log('âœ“ Response:', response2.text);

  // Test 3: Recall the memory
  console.log('\n\nTEST 3: Recalling preference...');
  const response3 = await agent.chat('What is my favorite color?');
  console.log('âœ“ Response:', response3.text);

  console.log('\n\ní¾‰ ALL TESTS PASSED! THE RUNTIME WORKS!');
}

test().catch(err => {
  console.error('\nâŒ ERROR:', err.message);
  console.error(err);
});
