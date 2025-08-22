import { log } from './log.js';
import { existsSync } from 'fs';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'ollama';
  apiKey?: string;
  baseURL?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 500,
      ...config,
    };
  }

  async generateResponse(messages: AIMessage[]): Promise<AIResponse> {
    try {
      log.debug(`🔄 AI Service: Calling ${this.config.provider} with model ${this.config.model}`);
      const startTime = Date.now();
      
      let response: AIResponse;
      switch (this.config.provider) {
        case 'openai':
          response = await this.callOpenAI(messages);
          break;
        case 'anthropic':
          response = await this.callAnthropic(messages);
          break;
        case 'ollama':
          response = await this.callOllama(messages);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${this.config.provider}`);
      }
      
      const duration = Date.now() - startTime;
      log.debug(`⚡ AI Service: Response received in ${duration}ms (${response.content.length} chars)`);
      if (response.usage) {
        log.debug(`📊 Token Usage: ${response.usage.promptTokens} prompt + ${response.usage.completionTokens} completion = ${response.usage.totalTokens} total`);
      }
      
      return response;
    } catch (error) {
      log.error(`❌ AI service error with ${this.config.provider}: ${error}`);
      throw new Error(`Failed to generate AI response: ${error}`);
    }
  }

  private async callOpenAI(messages: AIMessage[]): Promise<AIResponse> {
    const { default: OpenAI } = await import('openai');
    
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const openai = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
    });

    const response = await openai.chat.completions.create({
      model: this.config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error('No response content from OpenAI');
    }

    return {
      content: choice.message.content,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  private async callAnthropic(messages: AIMessage[]): Promise<AIResponse> {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const anthropic = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
    });

    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await anthropic.messages.create({
      model: this.config.model,
      system: systemMessage?.content,
      messages: conversationMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens || 1000,
    });

    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock) {
      throw new Error('No text content from Anthropic');
    }

    return {
      content: (textBlock as any).text,
      usage: response.usage ? {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      } : undefined,
    };
  }

  private async callOllama(messages: AIMessage[]): Promise<AIResponse> {
    const baseURL = this.config.baseURL || this.getOllamaBaseURL();
    
    const response = await fetch(`${baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (!data.message?.content) {
      throw new Error('No response content from Ollama');
    }

    return {
      content: data.message.content as string,
    };
  }

  private getOllamaBaseURL(): string {
    // Try different URLs based on environment
    // 1. Environment variable (highest priority)
    if (process.env.AI_BASE_URL) {
      return process.env.AI_BASE_URL;
    }
    
    // 2. Check if we're in Docker by looking for containerized environment
    const isDocker = process.env.DOCKER_CONTAINER || 
                     process.env.container || 
                     existsSync('/.dockerenv');
    
    if (isDocker) {
      // In Docker, try host.docker.internal first, then localhost
      log.debug('🐳 Detected Docker environment, using host.docker.internal for Ollama');
      return 'http://host.docker.internal:11434';
    }
    
    // 3. Default to localhost for native execution
    return 'http://localhost:11434';
  }
}

// Factory function to create AI service from environment variables
export function createAIServiceFromEnv(): AIService {
  const provider = (process.env.AI_PROVIDER || 'ollama') as AIServiceConfig['provider'];
  const apiKey = process.env.AI_API_KEY;
  let baseURL = process.env.AI_BASE_URL;
  
  // Only use base URL for Ollama if not explicitly set
  if (!baseURL && provider === 'ollama') {
    // Detect if we're in Docker
    const isDocker = process.env.DOCKER_CONTAINER || 
                     process.env.container || 
                     existsSync('/.dockerenv');
    
    if (isDocker) {
      baseURL = 'http://host.docker.internal:11434';
    } else {
      baseURL = 'http://localhost:11434';
    }
  }
  
  const model = process.env.AI_MODEL || getDefaultModel(provider);
  const temperature = process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : 0.7;
  const maxTokens = process.env.AI_MAX_TOKENS ? parseInt(process.env.AI_MAX_TOKENS) : 500;

  // Always log the configuration at INFO level for visibility
  /*
  log.info(`🧠 AI Service Configuration:`);
  log.info(`   Provider: ${provider}`);
  log.info(`   Model: ${model}`);
  log.info(`   Base URL: ${baseURL || 'default for provider'}`);
  log.info(`   API Key: ${apiKey ? '***configured***' : 'not set'}`);
  log.info(`   Temperature: ${temperature}`);
  log.info(`   Max Tokens: ${maxTokens}`);
  */
 
  return new AIService({
    provider,
    apiKey,
    baseURL,
    model,
    temperature,
    maxTokens,
  });
}

function getDefaultModel(provider: AIServiceConfig['provider']): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-3-haiku-20240307';
    case 'ollama':
      return 'mistral:latest';
    default:
      return 'mistral:latest';
  }
}