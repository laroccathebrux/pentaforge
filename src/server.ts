#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { runRoundtableTool } from './tools/roundtable.js';
import { log } from './lib/log.js';

async function main(): Promise<void> {
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

  server.setRequestHandler('tools/list', async () => ({
    tools: [runRoundtableTool],
  }));

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

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
  
  log.info('PentaForge MCP server started');
}

main().catch((error) => {
  log.error(`Server failed to start: ${error}`);
  process.exit(1);
});