require('dotenv').config();
const { AgentRuntime } = require('./dist/index');

async function test() {
  console.log('í·± Testing RecallBricks Runtime\n');
  
  const agent = new AgentRuntime({
    agentId: 'test-agent',
    userId: 'tyler',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY || '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',
    apiKey: process.env.RECALLBRICKS_API_KEY || 'rb_b0028d98cbb54616a620d5d7ae70ee54',
    debug: true
  });

  console.log('âœ… Agent initialized\n');
  
  // Test 1: Save a preference
  console.log('TEST 1: Saving preference...');
  const response1 = await agent.chat('Remember that my favorite color is blue');
  console.log('Response:', response1.text);
  console.log('Tokens:', response1.metadata.tokensUsed);
  
  // Test 2: Recall the preference
  console.log('\n\nTEST 2: Recalling preference...');
  const response2 = await agent.chat('What is my favorite color?');
  console.log('Response:', response2.text);
  console.log('Tokens:', response2.metadata.tokensUsed);
  
  // Test 3: Get identity
  console.log('\n\nTEST 3: Identity check...');
  const identity = await agent.getIdentity();
  console.log('Identity:', identity);
  
  console.log('\nâœ… All tests complete!');
}

test().catch(console.error);
