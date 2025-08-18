import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { orchestrateDiscussion } from '../engine/discussion.js';
import { writeDiscussionMarkdown } from '../writers/discussionWriter.js';
import { writeRequestMarkdown } from '../writers/requestWriter.js';
import { ensureDirectory } from '../lib/fs.js';
import { getTimestamp } from '../lib/clock.js';
import { detectLanguage } from '../lib/i18n.js';
import { readProjectContext } from '../lib/contextReader.js';
import { log } from '../lib/log.js';
import * as path from 'path';

export interface RoundtableInput {
  prompt: string;
  outputDir?: string;
  language?: string;
  tone?: string;
  includeAcceptanceCriteria?: boolean;
  dryRun?: boolean;
  model?: string;
  claudeMd?: string;
  docsContext?: Array<{
    path: string;
    content: string;
  }>;
}

export interface RoundtableOutput {
  discussionPath?: string;
  requestPath?: string;
  summary: string;
  timestamp: string;
}

export const runRoundtableTool: Tool = {
  name: 'run_roundtable',
  description: 'Orchestrate a structured roundtable discussion among 5 expert personas to produce PRP-ready specifications. Optionally provide project context via claudeMd and docsContext parameters for more relevant discussions.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The programming demand or problem statement',
      },
      outputDir: {
        type: 'string',
        description: 'Directory to write output files (default: ./PRPs/inputs)',
      },
      language: {
        type: 'string',
        description: 'Output language (auto-detect from prompt, or en/pt-BR)',
      },
      tone: {
        type: 'string',
        description: 'Tone of the discussion (default: professional)',
      },
      includeAcceptanceCriteria: {
        type: 'boolean',
        description: 'Include acceptance criteria in REQUEST.md (default: true)',
      },
      dryRun: {
        type: 'boolean',
        description: 'Print outputs to stdout without writing files',
      },
      model: {
        type: 'string',
        description: 'AI model to use (e.g., mistral:latest, deepseek-coder:latest for Ollama)',
      },
      claudeMd: {
        type: 'string',
        description: 'Content of CLAUDE.md file from the project (optional)',
      },
      docsContext: {
        type: 'array',
        description: 'Array of documentation files from docs/ directory (optional)',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' }
          }
        }
      },
    },
    required: ['prompt'],
  },
};

export async function executeRoundtable(input: RoundtableInput): Promise<RoundtableOutput> {
  log.info('Starting PentaForge roundtable execution');
  
  const {
    prompt,
    outputDir = process.env.PENTAFORGE_OUTPUT_DIR || './PRPs/inputs',
    language = detectLanguage(prompt),
    tone = 'professional',
    includeAcceptanceCriteria = true,
    dryRun = false,
    model,
    claudeMd,
    docsContext,
  } = input;

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required and cannot be empty');
  }

  const timestamp = getTimestamp();
  log.info(`Timestamp: ${timestamp}, Language: ${language}, Tone: ${tone}`);

  // Create project context from provided parameters or fallback to local reading
  let projectContext;
  if (claudeMd || docsContext) {
    log.info('📦 Using provided project context from MCP client');
    projectContext = {
      claudeMd,
      docsFiles: docsContext ? docsContext.map(doc => ({
        path: doc.path,
        content: doc.content,
        relativePath: doc.path
      })) : [],
      summary: generateContextSummary(claudeMd, docsContext)
    };
    log.info(`✅ CLAUDE.md: ${claudeMd ? 'provided (' + claudeMd.length + ' chars)' : 'not provided'}`);
    log.info(`✅ Docs files: ${docsContext ? docsContext.length + ' files provided' : 'none provided'}`);
  } else {
    log.info('📂 No context provided, attempting local file reading (fallback)');
    log.info(`📂 Current working directory: ${process.cwd()}`);
    projectContext = await readProjectContext(process.cwd());
  }
  log.info(`🎯 Project context summary: ${projectContext.summary}`);

  const discussion = await orchestrateDiscussion({
    prompt,
    language,
    tone,
    timestamp,
    model,
    projectContext,
  });

  const discussionContent = await writeDiscussionMarkdown(discussion, {
    language,
    timestamp,
    prompt,
  });

  const requestContent = await writeRequestMarkdown(discussion, {
    language,
    timestamp,
    prompt,
    includeAcceptanceCriteria,
  });

  let discussionPath: string | undefined;
  let requestPath: string | undefined;

  if (dryRun) {
    log.info('DRY RUN MODE - Outputs:');
    console.log('\n=== DISCUSSION.md ===\n');
    console.log(discussionContent);
    console.log('\n=== REQUEST.md ===\n');
    console.log(requestContent);
  } else {
    const resolvedDir = path.resolve(outputDir);
    await ensureDirectory(resolvedDir);

    discussionPath = path.join(resolvedDir, `DISCUSSION_${timestamp}.md`);
    requestPath = path.join(resolvedDir, `REQUEST_${timestamp}.md`);

    const { writeFileAtomic } = await import('../lib/fs.js');
    await writeFileAtomic(discussionPath, discussionContent);
    await writeFileAtomic(requestPath, requestContent);

    log.info(`Files written: ${discussionPath}, ${requestPath}`);
  }

  const summary = `Roundtable completed. Generated ${language === 'pt' ? 'especificação PRP-ready' : 'PRP-ready specification'} for: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`;

  return {
    discussionPath,
    requestPath,
    summary,
    timestamp,
  };
}

function generateContextSummary(claudeMd?: string, docsContext?: Array<{path: string, content: string}>): string {
  const parts: string[] = [];
  
  if (claudeMd) {
    parts.push('Project guidelines and architecture from CLAUDE.md');
  }
  
  if (docsContext && docsContext.length > 0) {
    const fileTypes = docsContext.reduce((acc, file) => {
      const ext = file.path.split('.').pop() || '';
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const typesSummary = Object.entries(fileTypes)
      .map(([ext, count]) => `${count} .${ext} files`)
      .join(', ');
    
    parts.push(`Documentation files: ${typesSummary}`);
  }
  
  if (parts.length === 0) {
    return 'No project context available';
  }
  
  return `Project context includes: ${parts.join(' and ')}`;
}