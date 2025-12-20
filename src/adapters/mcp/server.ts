/**
 * RecallBricks MCP Adapter
 *
 * MCP server for Claude Desktop integration
 */

import { AgentRuntime } from '../../core/AgentRuntime';
import { RuntimeOptions } from '../../types';

// ============================================================================
// MCP Tool Definitions
// ============================================================================

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const RECALLBRICKS_TOOLS: MCPTool[] = [
  {
    name: 'recallbricks_chat',
    description:
      'Send a message to the RecallBricks agent and get a contextual response with persistent memory',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to send to the agent',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'recallbricks_get_context',
    description: 'Retrieve current memory context for the agent',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'recallbricks_get_identity',
    description: 'Get the agent identity and behavioral rules',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'recallbricks_refresh_context',
    description: 'Refresh memory context from the API (bypasses cache)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'recallbricks_get_history',
    description: 'Get the conversation history for this session',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'recallbricks_clear_history',
    description: 'Clear the conversation history for this session',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// ============================================================================
// MCP Server
// ============================================================================

export class RecallBricksMCPServer {
  private runtime?: AgentRuntime;
  private initializationError?: Error;

  constructor() {
    // console.error('[RecallBricks MCP] Server initialized');
  }

  /**
   * Lazy-initialize runtime from environment variables on first use
   */
  private async ensureRuntimeInitialized(): Promise<void> {
    // If already initialized, return
    if (this.runtime) {
      return;
    }

    // If we previously failed to initialize, throw that error
    if (this.initializationError) {
      throw this.initializationError;
    }

    try {
      // Read configuration from environment variables
      const agentId = process.env.RECALLBRICKS_AGENT_ID;
      const userId = process.env.RECALLBRICKS_USER_ID || 'default-user';
      const apiUrl = process.env.RECALLBRICKS_API_URL;
      // const serviceToken = process.env.RECALLBRICKS_SERVICE_TOKEN; // Reserved for future auth

      // Validate required configuration
      if (!agentId) {
        throw new Error(
          'RECALLBRICKS_AGENT_ID environment variable is required'
        );
      }

      if (!apiUrl) {
        throw new Error(
          'RECALLBRICKS_API_URL environment variable is required'
        );
      }

      // Build runtime options with MCP mode enabled
      const options: RuntimeOptions = {
        agentId,
        userId,
        apiUrl,
        mcpMode: true,
        autoSave: true, // Auto-save should just work - feel like magic!
        validateIdentity: true,
        cacheEnabled: true,
        cacheTTL: 300000, // 5 minutes
        maxContextTokens: 8000,
        debug: process.env.RECALLBRICKS_DEBUG === 'true',
      };

      // Initialize runtime
      this.runtime = new AgentRuntime(options);

      // console.error(
      //   `[RecallBricks MCP] Runtime initialized for agent: ${agentId}`
      // );
    } catch (error) {
      // Store the error so we can throw it on subsequent calls
      this.initializationError = error instanceof Error ? error : new Error(String(error));
      throw this.initializationError;
    }
  }

  /**
   * Handle MCP tool calls
   */
  async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    // Lazy-initialize runtime on first tool call
    await this.ensureRuntimeInitialized();

    switch (toolName) {
      case 'recallbricks_chat':
        return await this.handleChat(args);

      case 'recallbricks_get_context':
        return await this.handleGetContext();

      case 'recallbricks_get_identity':
        return await this.handleGetIdentity();

      case 'recallbricks_refresh_context':
        return await this.handleRefreshContext();

      case 'recallbricks_get_history':
        return await this.handleGetHistory();

      case 'recallbricks_clear_history':
        return await this.handleClearHistory();

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Handle chat tool call
   */
  private async handleChat(args: Record<string, unknown>): Promise<unknown> {
    const message = args.message as string;

    if (!message) {
      throw new Error('Message is required');
    }

    const result = await this.runtime!.chat(message);

    return {
      response: result.response,
      metadata: result.metadata,
    };
  }

  /**
   * Handle get context tool call
   */
  private async handleGetContext(): Promise<unknown> {
    const context = await this.runtime!.getContext();
    return { context };
  }

  /**
   * Handle get identity tool call
   */
  private async handleGetIdentity(): Promise<unknown> {
    const identity = await this.runtime!.getIdentity();
    return { identity };
  }

  /**
   * Handle refresh context tool call
   */
  private async handleRefreshContext(): Promise<unknown> {
    await this.runtime!.refreshContext();
    return { success: true, message: 'Context refreshed successfully' };
  }

  /**
   * Handle get history tool call
   */
  private async handleGetHistory(): Promise<unknown> {
    const history = this.runtime!.getConversationHistory();
    return { history };
  }

  /**
   * Handle clear history tool call
   */
  private async handleClearHistory(): Promise<unknown> {
    this.runtime!.clearConversationHistory();
    return { success: true, message: 'Conversation history cleared' };
  }

  /**
   * Get available tools
   */
  getTools(): MCPTool[] {
    return RECALLBRICKS_TOOLS;
  }

  /**
   * Start MCP server using stdio transport
   */
  async startStdio(): Promise<void> {
    // console.error('[RecallBricks MCP] Starting stdio server...');

    process.stdin.setEncoding('utf8');
    let buffer = '';

    process.stdin.on('data', async (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const request = JSON.parse(line);
            await this.handleStdioRequest(request);
          } catch (error) {
            // console.error('[RecallBricks MCP] Error handling request:', error);
          }
        }
      }
    });

    process.stdin.on('end', () => {
      // console.error('[RecallBricks MCP] Stdin closed, exiting...');
      process.exit(0);
    });
  }

  /**
   * Handle stdio request
   */
  private async handleStdioRequest(request: {
    id?: string;
    method: string;
    params?: Record<string, unknown>;
  }): Promise<void> {
    try {
      let result: unknown;

      switch (request.method) {
        case 'initialize':
          // MCP protocol handshake - just acknowledge
          result = {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'recallbricks',
              version: '1.0.0',
            },
          };
          break;

        case 'tools/list':
          result = { tools: this.getTools() };
          break;

        case 'tools/call':
          const toolName = request.params?.name as string;
          const args = (request.params?.arguments as Record<string, unknown>) || {};
          result = await this.handleToolCall(toolName, args);
          break;

        default:
          throw new Error(`Unknown method: ${request.method}`);
      }

      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };

      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (error) {
      const errorResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (require.main === module) {
  const server = new RecallBricksMCPServer();

  // Start the server immediately
  // Wait for MCP "initialize" request with configuration
  // Don't initialize runtime until we receive the initialize request
  server.startStdio();
}
