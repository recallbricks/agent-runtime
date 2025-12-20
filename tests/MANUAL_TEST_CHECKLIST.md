# Manual Test Checklist

## Overview
This checklist covers manual testing scenarios that are too expensive or impractical to automate.
Run these tests before major releases or when making significant changes.

**Estimated Time:** 30-45 minutes
**Cost:** Only your time (use your own API keys)

---

## Pre-Testing Setup

- [ ] Set up environment variables in `.env`:
  ```
  RECALLBRICKS_API_KEY=your_key
  RECALLBRICKS_LLM_API_KEY=your_llm_key
  RECALLBRICKS_LLM_PROVIDER=anthropic
  RECALLBRICKS_LLM_MODEL=claude-haiku-4-5-20250115
  ```
- [ ] Run `npm run build` to ensure no build errors
- [ ] Run `npm test` to ensure all mocked tests pass

---

## 1. Basic Functionality

### 1.1 Simple Conversation
- [ ] Start a new agent session
- [ ] Send a simple greeting ("Hello!")
- [ ] Verify you get a coherent response
- [ ] Send a follow-up question
- [ ] Verify the agent maintains context

### 1.2 Memory Persistence
- [ ] Tell the agent something memorable ("My favorite food is pizza")
- [ ] End the session
- [ ] Start a new session with the same userId
- [ ] Ask about the previously shared information
- [ ] Verify the agent recalls it (may take a few seconds for indexing)

### 1.3 Identity Consistency
- [ ] Create an agent with custom name and purpose
- [ ] Ask the agent "Who are you?"
- [ ] Verify the response matches the configured identity
- [ ] Ask multiple identity-related questions
- [ ] Verify no references to "Claude", "ChatGPT", or base model names

---

## 2. User Isolation

### 2.1 Cross-User Privacy
- [ ] Create agent for User A
- [ ] Share sensitive information with User A's agent
- [ ] Create agent for User B (different userId)
- [ ] Ask User B's agent about User A's information
- [ ] Verify User B cannot access User A's data

### 2.2 Multi-Agent Isolation
- [ ] Create two different agents (different agentIds) for the same user
- [ ] Share unique information with each
- [ ] Verify each agent only knows its own information

---

## 3. Edge Cases

### 3.1 Special Characters
- [ ] Send message with emojis: "I love coding! 🚀💻"
- [ ] Send message with quotes: 'He said "hello" to me'
- [ ] Send message with code: "Here's some code: `console.log('test')`"
- [ ] Verify all responses are coherent

### 3.2 Long Inputs
- [ ] Send a very long message (1000+ characters)
- [ ] Verify the agent handles it gracefully
- [ ] Verify no truncation errors

### 3.3 Rapid Messages
- [ ] Send 5 messages in quick succession
- [ ] Verify all are processed correctly
- [ ] Check for any race conditions

### 3.4 Empty/Minimal Inputs
- [ ] Send a single character: "?"
- [ ] Send just spaces (should be handled gracefully)
- [ ] Verify appropriate responses

---

## 4. Multi-Provider Testing

### 4.1 Anthropic (Claude)
- [ ] Set provider to 'anthropic'
- [ ] Complete a full conversation
- [ ] Verify metadata shows 'anthropic' as provider

### 4.2 OpenAI (if available)
- [ ] Set provider to 'openai'
- [ ] Complete a full conversation
- [ ] Verify metadata shows 'openai' as provider

### 4.3 MCP Mode
- [ ] Enable MCP mode (mcpMode: true)
- [ ] Verify context is returned without LLM call
- [ ] Verify system prompt includes identity and memories

---

## 5. Error Handling

### 5.1 Invalid API Key
- [ ] Set an invalid LLM API key
- [ ] Attempt a chat request
- [ ] Verify error is handled gracefully
- [ ] Verify no crash or data leak

### 5.2 Network Issues (if possible to simulate)
- [ ] Disconnect network briefly during request
- [ ] Verify timeout is handled gracefully
- [ ] Verify agent can recover on reconnect

### 5.3 Invalid Configuration
- [ ] Try to create agent without required fields
- [ ] Verify ConfigurationError is thrown
- [ ] Verify helpful error message

---

## 6. Dashboard Verification

### 6.1 Memory Display
- [ ] Log into RecallBricks dashboard
- [ ] Find your test agent
- [ ] Verify memories are displayed correctly
- [ ] Check memory metadata (importance, tags, etc.)

### 6.2 Analytics
- [ ] Check usage analytics
- [ ] Verify API call counts match expectations
- [ ] Check for any error logs

---

## 7. Performance Checks

### 7.1 Response Time
- [ ] Time a typical chat request
- [ ] Verify response within acceptable range (< 5 seconds for simple queries)
- [ ] Note any unusually slow responses

### 7.2 Memory Usage
- [ ] Monitor process memory during extended session
- [ ] Verify no memory leaks over time
- [ ] Check memory after shutdown()

---

## 8. Cleanup

### 8.1 Session Cleanup
- [ ] Call shutdown() on all test agents
- [ ] Verify no hanging processes
- [ ] Verify no console errors

### 8.2 Test Data
- [ ] Consider cleaning up test memories from dashboard
- [ ] Or note that test userIds used are: (list them)

---

## Test Results

**Date:** _______________
**Tester:** _______________
**Version:** _______________

### Summary
- Total tests: 35+
- Passed: ___
- Failed: ___
- Skipped: ___

### Issues Found
1.
2.
3.

### Notes


---

## Quick Smoke Test (5 minutes)

If you're short on time, run this minimal check:

1. [ ] `npm run build` - no errors
2. [ ] `npm test` - all mocked tests pass
3. [ ] Create agent, send "Hello", get response
4. [ ] Tell agent a fact, end session, start new session, verify recall
5. [ ] Run with MCP mode, verify context returned
6. [ ] Shutdown gracefully

If all 6 pass, the core functionality is working.
