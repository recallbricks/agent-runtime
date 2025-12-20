/**
 * REST API Example
 *
 * Example of using the RecallBricks REST API
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function main() {
  console.log('RecallBricks REST API Example\n');

  // Initialize the runtime
  console.log('Initializing runtime...');
  await axios.post(`${API_URL}/init`, {
    agentId: 'sales_assistant',
    userId: 'customer_456',
    llmProvider: 'anthropic',
    llmApiKey: process.env.ANTHROPIC_API_KEY,
    tier: 'starter',
    debug: true,
  });
  console.log('Runtime initialized\n');

  // Get agent identity
  const identityResponse = await axios.get(`${API_URL}/identity`);
  const identity = identityResponse.data.identity;
  console.log('Agent Identity:');
  console.log(`  Name: ${identity.name}`);
  console.log(`  Purpose: ${identity.purpose}\n`);

  // Get context
  const contextResponse = await axios.get(`${API_URL}/context`);
  const context = contextResponse.data.context;
  console.log('Memory Context:');
  console.log(`  Total memories: ${context.totalMemories}\n`);

  // Chat with the agent
  console.log('Conversation:\n');

  const messages = [
    "Hi! I'm interested in your premium plan.",
    "What are the key features?",
    "How much does it cost?",
    "Can you remind me what features we just discussed?",
  ];

  for (const message of messages) {
    console.log(`User: ${message}`);

    const response = await axios.post(`${API_URL}/chat`, {
      message: message,
    });

    const data = response.data;
    console.log(`Agent: ${data.response}`);
    console.log(`  [Model: ${data.metadata.model}]`);
    console.log(`  [Tokens: ${data.metadata.tokensUsed}]\n`);
  }

  // Flush saves
  console.log('Flushing pending saves...');
  await axios.post(`${API_URL}/flush`);
  console.log('All saves completed!\n');

  // Get validation stats
  const statsResponse = await axios.get(`${API_URL}/stats/validation`);
  const stats = statsResponse.data.stats;
  if (stats) {
    console.log('Identity Validation Stats:');
    console.log(`  Total violations: ${stats.total}`);
    console.log(`  By type:`, stats.byType);
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  if (error.response) {
    console.error('Response:', error.response.data);
  }
});
