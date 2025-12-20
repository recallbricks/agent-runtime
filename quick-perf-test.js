const { AgentRuntime } = require('./dist/index');

async function perfTest() {
  console.log('Quick Performance Test (10 requests)\n');
  
  const agent = new AgentRuntime({
    agentId: 'perf-test',
    userId: 'perf-user',
    llmProvider: 'anthropic',
    llmApiKey: 'sk-ant-api03-...',
    apiKey: 'rb_live_...',
    debug: false
  });
  
  const times = [];
  
  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await agent.chat(`Test message ${i}`);
    const duration = Date.now() - start;
    times.push(duration);
    console.log(`Request ${i+1}: ${duration}ms`);
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  console.log(`\nAverage: ${avg}ms`);
  console.log(avg < 10000 ? '✅ Performance acceptable' : '⚠️  Slow responses');
}

perfTest();
