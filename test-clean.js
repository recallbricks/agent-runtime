const { AgentRuntime } = require('./dist/index');

async function test() {
  console.log('í·± RecallBricks Runtime Test\n');
  
  const agent = new AgentRuntime({
    agentId: 'test-agent',
    userId: 'tyler',
    llmProvider: 'anthropic',
    llmApiKey: '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',
    apiKey: 'rb_live_8dd6d067c4470b7bbdf15e33d68736cb',
    debug: false // Turn off verbose logging
  });

  console.log('TEST 1: Save + Recall\n');
  
  const r1 = await agent.chat('My favorite color is blue');
  console.log('âœ“ Saved:', r1.text.substring(0, 100));
  
  const r2 = await agent.chat('What is my favorite color?');
  console.log('âœ“ Recalled:', r2.text);
  
  console.log('\ní¾‰ SUCCESS! Runtime works!\n');
}

test().catch(err => console.error('Error:', err.message));
