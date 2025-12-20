const { AgentRuntime } = require('./dist/index');

async function test() {
  console.log('í·± Testing RecallBricks Runtime (Simple)\n');
  
  // Initialize without trying to register
  const agent = new AgentRuntime({
    agentId: 'test-agent',
    userId: 'tyler',
    llmProvider: 'anthropic',
    llmApiKey: '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',
    apiKey: 'rb_b0028d98cbb54616a620d5d7ae70ee54',
    apiUrl: 'https://recallbricks-api-clean.onrender.com',
    debug: false // Less noise
  });

  console.log('âœ… Agent initialized\n');
  
  // Just test the LLM directly (no memory first)
  console.log('TEST: Calling Claude directly...');
  const response = await agent.chat('What is 2+2?');
  console.log('Response:', response.text);
  console.log('\nâœ… LLM works!');
}

test().catch(err => {
  console.error('Error:', err.message);
});
