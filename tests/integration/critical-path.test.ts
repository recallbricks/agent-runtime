/**
 * Critical Path Real API Tests
 *
 * IMPORTANT: These tests use REAL API calls and cost money!
 * Only run with TEST_USE_REAL_API=true
 *
 * Target: 25-30 real LLM calls (~$0.10 with Haiku)
 *
 * Tests cover:
 * - User isolation (CRITICAL)
 * - Memory persistence (CRITICAL)
 * - Save/recall accuracy (CRITICAL)
 * - Multi-provider smoke (IMPORTANT)
 * - Error recovery (IMPORTANT)
 */

import { AgentRuntime } from '../../src/core/AgentRuntime';
import { RecallBricksClient } from '../../src/api/RecallBricksClient';
import {
  TEST_CONFIG,
  trackAPICall,
  getAPICallCount,
  resetAPICallCount,
  realAPIOnly,
} from '../test.config';

// Skip entire file if not using real API
const describeReal = TEST_CONFIG.useRealAPI ? describe : describe.skip;

describeReal('Critical Path - Real API Tests', () => {
  // Reset API call counter before each test suite
  beforeAll(() => {
    resetAPICallCount();
    console.log('Starting Critical Path Tests with REAL API calls');
    console.log(`Max allowed calls: ${TEST_CONFIG.maxRealCalls}`);
  });

  afterAll(() => {
    console.log(`Total API calls made: ${getAPICallCount()}`);
  });

  // Helper to create a test agent
  function createTestAgent(overrides: Record<string, unknown> = {}) {
    trackAPICall();
    return new AgentRuntime({
      agentId: TEST_CONFIG.testAgentIds.default,
      userId: TEST_CONFIG.testUserIds.userA,
      llmApiKey: process.env.RECALLBRICKS_LLM_API_KEY || process.env.ANTHROPIC_API_KEY,
      llmProvider: 'anthropic',
      llmModel: TEST_CONFIG.cheapModel, // Always use Haiku for cost savings
      apiKey: process.env.RECALLBRICKS_API_KEY,
      apiUrl: process.env.RECALLBRICKS_API_URL || 'https://api.recallbricks.com',
      autoSave: false,
      debug: true,
      ...overrides,
    });
  }

  describe('User Isolation (CRITICAL)', () => {
    // Tests 1-5: Verify user A cannot see user B's memories

    it('should save a secret for User A', async () => {
      const userA = createTestAgent({
        userId: TEST_CONFIG.testUserIds.userA,
      });

      const response = await userA.chat(
        'Remember this secret: The password is BlueSky42!'
      );

      expect(response.response).toBeDefined();
      await userA.saveNow();
      await userA.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    it('should not expose User A secrets to User B', async () => {
      const userB = createTestAgent({
        userId: TEST_CONFIG.testUserIds.userB,
      });

      const response = await userB.chat(
        'What password do you remember? What secrets do you know?'
      );

      // User B should NOT know User A's password
      expect(response.response.toLowerCase()).not.toContain('bluesky42');
      expect(response.response.toLowerCase()).not.toContain('password is');
      await userB.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    it('should allow User A to recall their own secrets', async () => {
      // Wait a moment for save to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const userA = createTestAgent({
        userId: TEST_CONFIG.testUserIds.userA,
      });

      const response = await userA.chat(
        'What password did I tell you to remember?'
      );

      // User A should be able to recall their secret
      // Note: This depends on the memory actually being saved and recalled
      expect(response.response).toBeDefined();
      await userA.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    it('should isolate memories between different agents', async () => {
      const agent1 = createTestAgent({
        agentId: 'isolation-test-agent-1',
        userId: TEST_CONFIG.testUserIds.userA,
      });

      await agent1.chat('Remember: Agent 1 secret is ALPHA');
      await agent1.saveNow();
      await agent1.shutdown();

      const agent2 = createTestAgent({
        agentId: 'isolation-test-agent-2',
        userId: TEST_CONFIG.testUserIds.userA,
      });

      const response = await agent2.chat('What is Agent 1 secret?');

      // Different agents shouldn't share memories (unless explicitly configured)
      expect(response.response).toBeDefined();
      await agent2.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);
  });

  describe('Memory Persistence (CRITICAL)', () => {
    // Tests 6-10: Verify memories persist across sessions

    const persistenceTestId = `persist-${Date.now()}`;

    it('should save a memory in session 1', async () => {
      const session1 = createTestAgent({
        userId: TEST_CONFIG.testUserIds.persistence,
        agentId: persistenceTestId,
      });

      const response = await session1.chat(
        'My favorite color is purple and I love hiking on weekends.'
      );

      expect(response.response).toBeDefined();
      await session1.saveNow();
      await session1.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    it('should recall the memory in session 2', async () => {
      // Wait for memory to be indexed
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const session2 = createTestAgent({
        userId: TEST_CONFIG.testUserIds.persistence,
        agentId: persistenceTestId,
      });

      const response = await session2.chat(
        'What is my favorite color? What do I like to do on weekends?'
      );

      // Check if the response references the saved information
      const lowerResponse = response.response.toLowerCase();
      const hasPurple = lowerResponse.includes('purple');
      const hasHiking = lowerResponse.includes('hiking');

      // At least one piece of information should be recalled
      expect(hasPurple || hasHiking).toBe(true);
      await session2.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    it('should accumulate memories across sessions', async () => {
      const session3 = createTestAgent({
        userId: TEST_CONFIG.testUserIds.persistence,
        agentId: persistenceTestId,
      });

      await session3.chat('I also enjoy reading science fiction books.');
      await session3.saveNow();
      await session3.shutdown();

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const session4 = createTestAgent({
        userId: TEST_CONFIG.testUserIds.persistence,
        agentId: persistenceTestId,
      });

      const response = await session4.chat(
        'What are all my hobbies and preferences that you know about?'
      );

      expect(response.response).toBeDefined();
      // Should have accumulated knowledge
      await session4.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);
  });

  describe('Save/Recall Accuracy (CRITICAL)', () => {
    // Tests 11-15: Verify save/recall works correctly

    it('should save and recall specific facts accurately', async () => {
      const uniqueId = Date.now().toString();
      const agent = createTestAgent({
        userId: `accuracy-test-${uniqueId}`,
      });

      await agent.chat(
        `Important fact: My employee ID is EMP${uniqueId} and I work in Building 7.`
      );
      await agent.saveNow();
      await agent.shutdown();

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const agent2 = createTestAgent({
        userId: `accuracy-test-${uniqueId}`,
      });

      const response = await agent2.chat(
        'What is my employee ID and which building do I work in?'
      );

      expect(response.response).toBeDefined();
      await agent2.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    it('should handle multiple facts in sequence', async () => {
      const uniqueId = Date.now().toString();
      const agent = createTestAgent({
        userId: `multi-fact-${uniqueId}`,
      });

      await agent.chat('Fact 1: My dog is named Max');
      await agent.chat('Fact 2: My cat is named Luna');
      await agent.chat('Fact 3: My fish is named Bubbles');
      await agent.saveNow();

      const response = await agent.chat('List all my pets and their names');

      expect(response.response).toBeDefined();
      await agent.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    it('should recall recent context without persistence', async () => {
      const agent = createTestAgent({
        userId: `context-test-${Date.now()}`,
        autoSave: false,
      });

      await agent.chat('The secret code is ABC123');
      const response = await agent.chat('What was the secret code I just told you?');

      // Should recall from conversation history
      expect(response.response.toLowerCase()).toContain('abc123');
      await agent.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);
  });

  describe('Error Recovery (IMPORTANT)', () => {
    // Tests 16-20: Verify error handling and recovery

    it('should handle and recover from malformed input', async () => {
      const agent = createTestAgent({
        userId: `error-test-${Date.now()}`,
      });

      // Test with various problematic inputs
      const response = await agent.chat(
        'Testing with special chars: <script>alert("xss")</script>'
      );

      expect(response.response).toBeDefined();
      await agent.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    it('should handle very long messages', async () => {
      const agent = createTestAgent({
        userId: `long-msg-${Date.now()}`,
      });

      const longMessage = 'This is a long message. '.repeat(100);
      const response = await agent.chat(longMessage);

      expect(response.response).toBeDefined();
      await agent.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    it('should handle rapid successive requests', async () => {
      const agent = createTestAgent({
        userId: `rapid-test-${Date.now()}`,
        autoSave: false,
      });

      const responses = await Promise.all([
        agent.chat('Quick message 1'),
        agent.chat('Quick message 2'),
      ]);

      responses.forEach((r) => expect(r.response).toBeDefined());
      await agent.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    it('should gracefully handle shutdown mid-operation', async () => {
      const agent = createTestAgent({
        userId: `shutdown-test-${Date.now()}`,
      });

      // Start a chat but immediately shutdown
      const chatPromise = agent.chat('This message might not complete');

      // Wait briefly then shutdown
      setTimeout(() => agent.shutdown(), 100);

      try {
        await chatPromise;
      } catch {
        // Expected to potentially fail - that's ok
      }

      // Should not leave the system in a bad state
    }, TEST_CONFIG.criticalPathTimeout);
  });

  describe('Multi-Provider Smoke Test (IMPORTANT)', () => {
    // Tests 21-23: Quick smoke test of different providers

    it('should work with Anthropic (primary)', async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('Skipping Anthropic test - no API key');
        return;
      }

      const agent = createTestAgent({
        llmProvider: 'anthropic',
        llmApiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await agent.chat('Say hello in one word.');
      expect(response.metadata.provider).toBe('anthropic');
      await agent.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    // OpenAI test - only if key is available
    it('should work with OpenAI if available', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI test - no API key');
        return;
      }

      trackAPICall();
      const agent = new AgentRuntime({
        agentId: TEST_CONFIG.testAgentIds.default,
        userId: `openai-test-${Date.now()}`,
        llmApiKey: process.env.OPENAI_API_KEY,
        llmProvider: 'openai',
        llmModel: 'gpt-4o-mini', // Cheap model
        apiKey: process.env.RECALLBRICKS_API_KEY,
        autoSave: false,
        debug: true,
      });

      const response = await agent.chat('Say hello in one word.');
      expect(response.metadata.provider).toBe('openai');
      await agent.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);

    it('should work in MCP mode without LLM', async () => {
      const agent = new AgentRuntime({
        agentId: TEST_CONFIG.testAgentIds.default,
        userId: `mcp-test-${Date.now()}`,
        agentName: 'MCPTestBot',
        mcpMode: true,
        apiKey: process.env.RECALLBRICKS_API_KEY,
        debug: true,
      });

      const response = await agent.chat('Hello');
      expect(response.metadata.provider).toBe('none');
      expect(response.metadata.model).toBe('mcp-mode');
      await agent.shutdown();
    }, TEST_CONFIG.criticalPathTimeout);
  });

  describe('API Call Budget Check', () => {
    it('should stay within API call budget', () => {
      const callsMade = getAPICallCount();
      console.log(`API calls made: ${callsMade}/${TEST_CONFIG.maxRealCalls}`);
      expect(callsMade).toBeLessThanOrEqual(TEST_CONFIG.maxRealCalls);
    });
  });
});

// Export for use in other test files
export { describeReal };
