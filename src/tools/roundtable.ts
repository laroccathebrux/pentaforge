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
}

export interface RoundtableOutput {
  discussionPath?: string;
  requestPath?: string;
  summary: string;
  timestamp: string;
}

export const runRoundtableTool: Tool = {
  name: 'run_roundtable',
  description: 'Orchestrate a structured roundtable discussion among 5 expert personas to produce PRP-ready specifications',
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
  } = input;

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required and cannot be empty');
  }

  const timestamp = getTimestamp();
  log.info(`Timestamp: ${timestamp}, Language: ${language}, Tone: ${tone}`);

  // Read project context from client's working directory
  const projectContext = await readProjectContext(process.cwd());
  log.debug(`📖 Project context summary: ${projectContext.summary}`);

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