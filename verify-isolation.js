const { AgentRuntime } = require('./dist/index');

async function test() {
  console.log('í·ª Test 2: User Isolation (CRITICAL)\n');
  
  const userA = new AgentRuntime({
    agentId: 'isolation-test',
    userId: 'user-alice',
    llmProvider: 'anthropic',
    llmApiKey: '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',
    apiKey: 'rb_live_8dd6d067c4470b7bbdf15e33d68736cb',
    debug: false
  });
  
  const userB = new AgentRuntime({
    agentId: 'isolation-test',
    userId: 'user-bob',
    llmProvider: 'anthropic',
    llmApiKey: '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',
    apiKey: 'rb_live_8dd6d067c4470b7bbdf15e33d68736cb',
    debug: false
  });
  
  console.log('Alice: Setting secret...');
  await userA.chat('My secret code is WHISKEY789');
  
  console.log('Bob: Trying to access secret...');
  const leak = await userB.chat('What is the secret code?');
  
  console.log('\nBob got:', leak.response);
  
  if (leak.response.includes('WHISKEY789')) {
    console.log('\nâŒ CRITICAL FAILURE: User isolation broken!\n');
    process.exit(1);
  } else {
    console.log('\nâœ… PASS: User isolation works\n');
  }
}

test().catch(err => {
  console.error('âŒ ERROR:', err.message);
  process.exit(1);
});
