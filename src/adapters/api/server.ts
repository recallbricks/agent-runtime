/**
 * RecallBricks REST API Adapter
 *
 * Express.js server that wraps the Agent Runtime
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AgentRuntime } from '../../core/AgentRuntime';
import { RuntimeOptions, RecallBricksError } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface ChatRequestBody {
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

// ============================================================================
// API Server
// ============================================================================

export class RecallBricksAPIServer {
  private app: express.Application;
  private runtime?: AgentRuntime;
  private port: number;

  constructor(port = 3000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      return res.json({
        status: 'healthy',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      });
    });

    // Initialize runtime
    this.app.post('/init', async (req: Request, res: Response) => {
      try {
        const options: RuntimeOptions = req.body;

        if (!options.agentId || !options.userId) {
          return res.status(400).json({
            error: 'Missing required fields: agentId and userId',
          });
        }

        this.runtime = new AgentRuntime(options);

        return res.json({
          success: true,
          message: 'Runtime initialized successfully',
          agentId: options.agentId,
          userId: options.userId,
        });
      } catch (error) {
        return this.handleError(error, res);
      }
    });

    // Chat endpoint
    this.app.post('/chat', async (req: Request, res: Response) => {
      try {
        if (!this.runtime) {
          return res.status(400).json({
            error: 'Runtime not initialized. Call /init first.',
          });
        }

        const body: ChatRequestBody = req.body;

        if (!body.message) {
          return res.status(400).json({
            error: 'Missing required field: message',
          });
        }

        const result = await this.runtime.chat(
          body.message,
          body.conversationHistory
        );

        return res.json({
          success: true,
          ...result,
        });
      } catch (error) {
        return this.handleError(error, res);
      }
    });

    // Get context
    this.app.get('/context', async (_req: Request, res: Response) => {
      try {
        if (!this.runtime) {
          return res.status(400).json({
            error: 'Runtime not initialized. Call /init first.',
          });
        }

        const context = await this.runtime.getContext();

        return res.json({
          success: true,
          context,
        });
      } catch (error) {
        return this.handleError(error, res);
      }
    });

    // Get identity
    this.app.get('/identity', async (_req: Request, res: Response) => {
      try {
        if (!this.runtime) {
          return res.status(400).json({
            error: 'Runtime not initialized. Call /init first.',
          });
        }

        const identity = await this.runtime.getIdentity();

        return res.json({
          success: true,
          identity,
        });
      } catch (error) {
        return this.handleError(error, res);
      }
    });

    // Refresh context
    this.app.post('/context/refresh', async (_req: Request, res: Response) => {
      try {
        if (!this.runtime) {
          return res.status(400).json({
            error: 'Runtime not initialized. Call /init first.',
          });
        }

        await this.runtime.refreshContext();

        return res.json({
          success: true,
          message: 'Context refreshed successfully',
        });
      } catch (error) {
        return this.handleError(error, res);
      }
    });

    // Get conversation history
    this.app.get('/history', (_req: Request, res: Response) => {
      try {
        if (!this.runtime) {
          return res.status(400).json({
            error: 'Runtime not initialized. Call /init first.',
          });
        }

        const history = this.runtime.getConversationHistory();

        return res.json({
          success: true,
          history,
        });
      } catch (error) {
        return this.handleError(error, res);
      }
    });

    // Clear conversation history
    this.app.post('/history/clear', (_req: Request, res: Response) => {
      try {
        if (!this.runtime) {
          return res.status(400).json({
            error: 'Runtime not initialized. Call /init first.',
          });
        }

        this.runtime.clearConversationHistory();

        return res.json({
          success: true,
          message: 'Conversation history cleared',
        });
      } catch (error) {
        return this.handleError(error, res);
      }
    });

    // Flush pending saves
    this.app.post('/flush', async (_req: Request, res: Response) => {
      try {
        if (!this.runtime) {
          return res.status(400).json({
            error: 'Runtime not initialized. Call /init first.',
          });
        }

        await this.runtime.flush();

        return res.json({
          success: true,
          message: 'All pending saves completed',
        });
      } catch (error) {
        return this.handleError(error, res);
      }
    });

    // Get validation stats
    this.app.get('/stats/validation', (_req: Request, res: Response) => {
      try {
        if (!this.runtime) {
          return res.status(400).json({
            error: 'Runtime not initialized. Call /init first.',
          });
        }

        const stats = this.runtime.getValidationStats();

        return res.json({
          success: true,
          stats,
        });
      } catch (error) {
        return this.handleError(error, res);
      }
    });

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
      });
    });
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown, res: Response): void {
    console.error('API Error:', error);

    if (error instanceof RecallBricksError) {
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code,
        details: error.details,
      });
    } else if (error instanceof Error) {
      res.status(500).json({
        error: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Unknown error occurred',
      });
    }
  }

  /**
   * Start the server
   */
  start(): void {
    this.app.listen(this.port, () => {
      console.log(`RecallBricks API Server listening on port ${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
    });
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): express.Application {
    return this.app;
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (require.main === module) {
  const port = parseInt(process.env.PORT || '3000', 10);
  const server = new RecallBricksAPIServer(port);
  server.start();
}
