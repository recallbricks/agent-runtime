/**
 * RecallBricks Agent Runtime - LLM Adapter
 *
 * Universal LLM interface supporting Anthropic, OpenAI, Gemini, Ollama, Cohere, and local models
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  LLMConfig,
  LLMMessage,
  LLMResponse,
  LLMError,
  Logger,
} from '../types';

// ============================================================================
// LLM Adapter Interface
// ============================================================================

export class LLMAdapter {
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;
  private geminiClient?: GoogleGenerativeAI;
  private geminiModel?: GenerativeModel;
  private logger: Logger;

  constructor(
    private config: LLMConfig,
    logger: Logger
  ) {
    this.logger = logger;
    this.initializeClient();
  }

  /**
   * Initialize the appropriate LLM client
   */
  private initializeClient(): void {
    switch (this.config.provider) {
      case 'anthropic':
        this.anthropicClient = new Anthropic({
          apiKey: this.config.apiKey,
          ...(this.config.baseUrl && { baseURL: this.config.baseUrl }),
        });
        this.logger.debug('Initialized Anthropic client');
        break;

      case 'openai':
        this.openaiClient = new OpenAI({
          apiKey: this.config.apiKey,
          ...(this.config.baseUrl && { baseURL: this.config.baseUrl }),
        });
        this.logger.debug('Initialized OpenAI client');
        break;

      case 'gemini':
        this.geminiClient = new GoogleGenerativeAI(this.config.apiKey);
        this.geminiModel = this.geminiClient.getGenerativeModel({
          model: this.config.model || 'gemini-1.5-pro',
        });
        this.logger.debug('Initialized Gemini client');
        break;

      case 'ollama':
        this.logger.debug('Ollama provider - using OpenAI-compatible interface');
        this.openaiClient = new OpenAI({
          apiKey: this.config.apiKey || 'ollama',
          baseURL: this.config.baseUrl || 'http://localhost:11434/v1',
        });
        break;

      case 'cohere':
        this.logger.warn('Cohere provider not yet implemented, using OpenAI-compatible interface');
        this.openaiClient = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseUrl || 'https://api.cohere.ai/v1',
        });
        break;

      case 'local':
        this.logger.debug('Local model provider - using OpenAI-compatible interface');
        this.openaiClient = new OpenAI({
          apiKey: this.config.apiKey || 'local',
          baseURL: this.config.baseUrl || 'http://localhost:8000/v1',
        });
        break;

      default:
        throw new LLMError(
          `Unsupported LLM provider: ${this.config.provider}`,
          this.config.provider
        );
    }
  }

  /**
   * Send a chat completion request to the LLM
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    this.logger.debug(`Sending chat request to ${this.config.provider}`, {
      messageCount: messages.length,
      model: this.config.model,
    });

    try {
      switch (this.config.provider) {
        case 'anthropic':
          return await this.chatAnthropic(messages);
        case 'gemini':
          return await this.chatGemini(messages);
        case 'openai':
        case 'ollama':
        case 'cohere':
        case 'local':
          return await this.chatOpenAI(messages);
        default:
          throw new LLMError(
            `Unsupported provider: ${this.config.provider}`,
            this.config.provider
          );
      }
    } catch (error) {
      this.logger.error('LLM chat request failed', { error });
      throw this.handleError(error);
    }
  }

  /**
   * Chat with Anthropic's Claude
   */
  private async chatAnthropic(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.anthropicClient) {
      throw new LLMError('Anthropic client not initialized', 'anthropic');
    }

    // Separate system messages from conversation
    const systemMessages = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.anthropicClient.messages.create({
      model: this.config.model || 'claude-sonnet-4-5-20250929',
      max_tokens: this.config.maxTokens || 2048,
      temperature: this.config.temperature || 0.7,
      system: systemMessages || undefined,
      messages: conversationMessages,
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '';

    this.logger.debug('Anthropic response received', {
      model: response.model,
      usage: response.usage,
    });

    return {
      content,
      provider: 'anthropic',
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  /**
   * Chat with Google's Gemini
   */
  private async chatGemini(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.geminiModel) {
      throw new LLMError('Gemini client not initialized', 'gemini');
    }

    // Separate system messages
    const systemMessages = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    // Convert messages to Gemini format
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // Start chat with history
    const chat = this.geminiModel.startChat({
      history: conversationMessages.slice(0, -1) as any,
      generationConfig: {
        temperature: this.config.temperature || 0.7,
        maxOutputTokens: this.config.maxTokens || 2048,
      },
      systemInstruction: systemMessages || undefined,
    });

    // Get the last message (should be from user)
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const userMessage = lastMessage?.parts[0]?.text || '';

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    const content = response.text();

    this.logger.debug('Gemini response received', {
      model: this.config.model || 'gemini-1.5-pro',
    });

    return {
      content,
      provider: 'gemini',
      model: this.config.model || 'gemini-1.5-pro',
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
    };
  }

  /**
   * Chat with OpenAI or OpenAI-compatible APIs
   */
  private async chatOpenAI(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new LLMError('OpenAI client not initialized', this.config.provider);
    }

    const response = await this.openaiClient.chat.completions.create({
      model: this.config.model || 'gpt-4-turbo-preview',
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 2048,
    });

    const content = response.choices[0]?.message?.content || '';

    this.logger.debug('OpenAI-compatible response received', {
      model: response.model,
      usage: response.usage,
    });

    return {
      content,
      provider: this.config.provider,
      model: response.model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: unknown): LLMError {
    if (error instanceof LLMError) {
      return error;
    }

    if (error instanceof Error) {
      return new LLMError(
        `LLM request failed: ${error.message}`,
        this.config.provider,
        { originalError: error.message }
      );
    }

    return new LLMError(
      'Unknown LLM error occurred',
      this.config.provider,
      { error }
    );
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeClient();
    this.logger.info('LLM configuration updated', {
      provider: this.config.provider,
      model: this.config.model,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }
}
