#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { runRoundtableTool } from './tools/roundtable.js';
import { log } from './lib/log.js';
import { createAIServiceFromEnv } from './lib/aiService.js';
import { existsSync } from 'fs';

// Suppress MCP SDK JSON-RPC handshake logs unless debug mode is enabled
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

function suppressMCPLogs() {
  // Only suppress if explicitly requested to keep JSON-RPC logs hidden
  if (process.env.SUPPRESS_MCP_LOGS === 'true') {
    console.log = (...args: any[]) => {
      const message = args.join(' ');
      // Only suppress JSON-RPC protocol messages, allow other logs through
      if (message.includes('"jsonrpc"') || message.includes('"protocolVersion"') || message.includes('"capabilities"') || message.includes('"tools"')) {
        return; // Suppress these logs
      }
      originalConsoleLog(...args);
    };
    
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      // Suppress JSON-RPC error messages too  
      if (message.includes('"jsonrpc"') || (message.includes('"error"') && message.includes('"id"'))) {
        return; // Suppress these logs
      }
      originalConsoleError(...args);
    };
  }
}

function restoreConsoleLogs() {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
}

async function main(): Promise<void> {
  // Suppress MCP SDK JSON-RPC logs if requested
  suppressMCPLogs();
  
  // Display AI configuration at startup
  const provider = process.env.AI_PROVIDER || 'ollama';
  let baseURL = process.env.AI_BASE_URL;
  
  // Only show base URL for Ollama if not explicitly set
  if (!baseURL && provider === 'ollama') {
    const isDocker = process.env.DOCKER_CONTAINER || 
                     process.env.container || 
                     existsSync('/.dockerenv');
    baseURL = isDocker ? 'http://host.docker.internal:11434' : 'http://localhost:11434';
  }
  
  console.log('🚀 PentaForge MCP Server Starting...');
  console.log('====================================');
  console.log(`🤖 AI Provider: ${provider}`);
  console.log(`📦 AI Model: ${process.env.AI_MODEL || 'default for provider'}`);
  console.log(`🔑 API Key: ${process.env.AI_API_KEY ? 'Configured' : 'Not set'}`);
  console.log(`🌐 Base URL: ${baseURL || 'default for provider'}`);
  console.log('====================================');
  
  // Initialize AI service to validate configuration
  try {
    createAIServiceFromEnv();
    console.log('✅ AI Service initialized successfully');
  } catch (error) {
    console.log(`⚠️  AI Service initialization warning: ${error}`);
  }
  const server = new Server(
    {
      name: 'pentaforge',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [runRoundtableTool],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params!;

    if (name === 'run_roundtable') {
      try {
        const result = await import('./tools/roundtable.js').then((mod) =>
          mod.executeRoundtable(args as any)
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Tool execution failed: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMessage }),
            },
          ],
          isError: true,
        };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Restore normal console logging after server is connected
  restoreConsoleLogs();
  
  log.info('PentaForge MCP server started');
  console.log('✅ Server ready to accept connections');
}

main().catch((error) => {
  log.error(`Server failed to start: ${error}`);
  process.exit(1);
});