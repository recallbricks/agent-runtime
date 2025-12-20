const { AgentRuntime } = require('./dist/index');

async function test() {
  console.log('ÌæØ FINAL VERIFICATION\n');
  
  const agent = new AgentRuntime({
    agentId: 'final-agent',
    userId: 'final-user',
    llmProvider: 'anthropic',
    llmApiKey: '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',
    apiKey: 'rb_live_8dd6d067c4470b7bbdf15e33d68736cb',
    debug: false
  });
  
  console.log('1. Saving: "My lucky number is 777"\n');
  await agent.chat('My lucky number is 777');
  
  console.log('2. Asking: "What is my lucky number?"\n');
  const r = await agent.chat('What is my lucky number?');
  
  console.log('RESPONSE:', r.response);
  console.log('\nMETADATA:', JSON.stringify(r.metadata, null, 2));
  
  if (r.response.includes('777')) {
    console.log('\n‚úÖ MEMORY WORKS PERFECTLY\n');
  } else {
    console.log('\n‚ö†Ô∏è  Memory loaded but LLM didnt use it\n');
  }
}

test();
