# RecallBricks MCP Quickstart

This example shows how to integrate RecallBricks with Claude Desktop using MCP (Model Context Protocol).

## Setup

1. Build the project:
```bash
npm install
npm run build
```

2. Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "recallbricks": {
      "command": "node",
      "args": [
        "/path/to/recallbricks-agent-runtime/dist/adapters/mcp/server.js"
      ],
      "env": {
        "RECALLBRICKS_AGENT_ID": "your_agent_id",
        "RECALLBRICKS_USER_ID": "your_user_id",
        "RECALLBRICKS_API_URL": "https://recallbricks-api-clean.onrender.com",
        "RECALLBRICKS_TIER": "starter"
      }
    }
  }
}
```

**Note:** The MCP server does NOT require an Anthropic API key. Claude Desktop already has Claude running, so the MCP server only loads/saves context from RecallBricks API.

3. Restart Claude Desktop

## Available Tools

Once configured, Claude Desktop will have access to these RecallBricks tools:

### recallbricks_chat
Send a message to your RecallBricks agent with full context and memory.

```
Use recallbricks_chat to send: "What did we discuss about pricing?"
```

### recallbricks_get_context
Retrieve current memory context for the agent.

```
Show me the current memory context using recallbricks_get_context
```

### recallbricks_get_identity
Get the agent's identity and behavioral rules.

```
What's my agent identity? Use recallbricks_get_identity
```

### recallbricks_refresh_context
Refresh memory context from the API.

```
Refresh the context using recallbricks_refresh_context
```

### recallbricks_get_history
Get conversation history for this session.

```
Show conversation history with recallbricks_get_history
```

### recallbricks_clear_history
Clear the conversation history.

```
Clear history using recallbricks_clear_history
```

## Example Usage

In Claude Desktop, you can now:

1. **Have persistent conversations:**
   ```
   User: "I'm working on a machine learning project about image classification"
   [RecallBricks saves this context]

   User (later): "Can you remind me what I was working on?"
   [RecallBricks loads context and responds with project details]
   ```

2. **Maintain agent identity:**
   ```
   Your agent maintains consistent personality and behavior across sessions
   ```

3. **Automatic context loading:**
   ```
   No manual memory management - everything is automatic
   ```

## Configuration Options

You can customize the MCP server behavior with these environment variables:

**Required:**
- `RECALLBRICKS_AGENT_ID`: Your agent's unique identifier
- `RECALLBRICKS_USER_ID`: User identifier for context separation

**Optional:**
- `RECALLBRICKS_API_URL`: RecallBricks API endpoint (default: https://recallbricks-api-clean.onrender.com)
- `RECALLBRICKS_TIER`: starter, professional, or enterprise (default: starter)

**No longer needed in MCP mode:**
- ~~`RECALLBRICKS_API_KEY`~~ - Not required! Claude Desktop already has Claude running
- ~~`RECALLBRICKS_LLM_PROVIDER`~~ - Not used in MCP mode
- ~~`RECALLBRICKS_LLM_MODEL`~~ - Not used in MCP mode

## Troubleshooting

If the MCP server isn't working:

1. Check Claude Desktop logs at:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

2. Verify the path to `server.js` is correct

3. Ensure all required environment variables are set

4. Test the server manually:
   ```bash
   node dist/adapters/mcp/server.js
   ```
