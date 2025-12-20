const { AgentRuntime } = require('./dist/index');

async function test() {
  console.log('í·ª Test 1: Basic Memory\n');
  
  const agent = new AgentRuntime({
    agentId: 'verify-1',
    userId: 'verify-user',
    llmProvider: 'anthropic',
    // No llmModel = uses default
    llmApiKey: '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',
    apiKey: 'rb_live_8dd6d067c4470b7bbdf15e33d68736cb',
    debug: false
  });

  await agent.chat('My favorite framework is Next.js');
  const r = await agent.chat('What framework do I like?');
  
  console.log('Response:', r.response);
  
  if (r.response.toLowerCase().includes('next')) {
    console.log('\nâœ… PASS: Memory works\n');
  } else {
    console.log('\nâŒ FAIL: Memory not working\n');
    process.exit(1);
  }
}

test().catch(err => {
  console.error('âŒ ERROR:', err.message);
  process.exit(1);
});
