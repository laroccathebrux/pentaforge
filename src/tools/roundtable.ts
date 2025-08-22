import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { orchestrateDiscussion } from '../engine/discussion.js';
import { writeDiscussionMarkdown } from '../writers/discussionWriter.js';
import { writeRequestMarkdown } from '../writers/requestWriter.js';
import { ensureDirectory } from '../lib/fs.js';
import { getTimestamp } from '../lib/clock.js';
import { detectLanguage } from '../lib/i18n.js';
import { readProjectContext } from '../lib/contextReader.js';
import { log } from '../lib/log.js';
import { createEnhancedConfig, DynamicRoundConfig } from '../types/consensus.js';
import { parseResolvedIssuesFile } from '../lib/unresolvedIssuesParser.js';
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
  
  // NEW: Dynamic rounds configuration
  dynamicRounds?: boolean;         // Default: true - enables adaptive consensus-driven discussions
  consensusConfig?: {
    minRounds?: number;        // Default: 2
    maxRounds?: number;        // Default: 10  
    consensusThreshold?: number; // Default: 85
    conflictTolerance?: number;  // Default: 15
    moderatorEnabled?: boolean;  // Default: true
  };
  
  // NEW: Interactive resolution workflow parameters
  unresolvedIssuesFile?: string;        // Path to resolved UNRESOLVED_ISSUES.md file for final generation
  unresolvedIssuesThreshold?: number;   // Threshold for unresolved issues before switching to interactive mode (default: 1)
  
  // NEW: Async execution option
  async?: boolean;             // Default: true - run async in background to prevent blocking Claude
}

export interface RoundtableOutput {
  discussionPath?: string;
  requestPath?: string;
  summary: string;
  timestamp: string;
  outputDir?: string;
  
  // NEW: Async execution tracking
  isAsync?: boolean;
  executionId?: string;
  status?: 'started' | 'running' | 'completed' | 'failed';
}

export const runRoundtableTool: Tool = {
  name: 'run_roundtable',
  description: 'Orchestrate a structured roundtable discussion among 5 expert personas to produce PRP-ready specifications. Supports both fixed 3-round mode and adaptive dynamic rounds with AI-driven consensus evaluation. Optionally provide project context via claudeMd and docsContext parameters for more relevant discussions.',
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
      dynamicRounds: {
        type: 'boolean',
        description: 'Enable dynamic rounds with AI-driven consensus evaluation (default: true for adaptive discussions)',
      },
      consensusConfig: {
        type: 'object',
        description: 'Configuration for dynamic rounds consensus evaluation',
        properties: {
          minRounds: {
            type: 'number',
            description: 'Minimum rounds before consensus evaluation (default: 2)',
          },
          maxRounds: {
            type: 'number',
            description: 'Maximum rounds to prevent infinite discussions (default: 10)',
          },
          consensusThreshold: {
            type: 'number',
            description: 'Required agreement percentage to reach consensus (default: 85)',
          },
          conflictTolerance: {
            type: 'number',
            description: 'Maximum unresolved conflicts tolerated (default: 15)',
          },
          moderatorEnabled: {
            type: 'boolean',
            description: 'Include AI moderator in discussion rounds (default: true)',
          },
        },
      },
      unresolvedIssuesFile: {
        type: 'string',
        description: 'Path to resolved UNRESOLVED_ISSUES.md file for final generation (triggers resolution processing mode)',
      },
      unresolvedIssuesThreshold: {
        type: 'number',
        description: 'Minimum unresolved issues to trigger interactive mode (default: 1)',
        minimum: 0,
        maximum: 50,
      },
      async: {
        type: 'boolean',
        description: 'Run discussion in background and return immediately (default: true to prevent blocking Claude)',
      },
    },
    required: ['prompt'],
  },
};

export async function executeRoundtable(input: RoundtableInput): Promise<RoundtableOutput> {
  const {
    prompt,
    outputDir = process.env.PENTAFORGE_OUTPUT_DIR || './PRPs/inputs',
    dryRun = false,
    async: isAsync = true, // Default to async to prevent Claude from getting stuck
  } = input;

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required and cannot be empty');
  }

  const timestamp = getTimestamp();
  
  // If async execution requested, start in background and return immediately
  if (isAsync) {
    const executionId = `roundtable_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    log.info(`🚀 Starting async PentaForge execution (ID: ${executionId})`);
    
    // Start background execution (fire and forget)
    executeRoundtableSync({
      ...input,
      async: false // Ensure internal call is synchronous
    }).then((result) => {
      log.info(`✅ Async execution completed (ID: ${executionId})`);
      console.log(`\n🎉 Roundtable Discussion Completed (ID: ${executionId})`);
      console.log(`📁 Files saved to: ${result.outputDir || outputDir}`);
      if (result.discussionPath) console.log(`   - ${path.basename(result.discussionPath)}`);
      if (result.requestPath) console.log(`   - ${path.basename(result.requestPath)}`);
    }).catch((error) => {
      log.error(`❌ Async execution failed (ID: ${executionId}): ${error}`);
      console.log(`\n💥 Roundtable Discussion Failed (ID: ${executionId}): ${error.message}`);
    });
    
    // Return immediately with async status
    return {
      summary: `Roundtable discussion started in background (ID: ${executionId}). Processing "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
      timestamp,
      outputDir: dryRun ? undefined : path.resolve(outputDir),
      isAsync: true,
      executionId,
      status: 'started',
    };
  }

  // Synchronous execution (original behavior)
  return executeRoundtableSync(input);
}

// Separate function for synchronous execution
export async function executeRoundtableSync(input: RoundtableInput): Promise<RoundtableOutput> {
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
    dynamicRounds = true, // Default to dynamic rounds for better consensus detection
    consensusConfig,
    unresolvedIssuesFile,
    unresolvedIssuesThreshold = 1,
  } = input;

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required and cannot be empty');
  }

  // Check if we're in resolution processing mode
  if (unresolvedIssuesFile) {
    log.info('🔄 Resolution processing mode detected - processing user-resolved issues');
    return executeResolutionProcessing({
      prompt,
      unresolvedIssuesFile,
      outputDir,
      language,
      tone,
      includeAcceptanceCriteria,
      dryRun,
      model,
      claudeMd,
      docsContext,
    });
  }

  const timestamp = getTimestamp();
  log.info(`Timestamp: ${timestamp}, Language: ${language}, Tone: ${tone}`);
  
  // Log dynamic rounds configuration
  if (dynamicRounds) {
    const config = consensusConfig || {};
    log.info(`🔄 Dynamic rounds enabled:`);
    log.info(`   Min rounds: ${config.minRounds || 2}`);
    log.info(`   Max rounds: ${config.maxRounds || 10}`);
    log.info(`   Consensus threshold: ${config.consensusThreshold || 85}%`);
    log.info(`   Conflict tolerance: ${config.conflictTolerance || 15}`);
    log.info(`   Moderator enabled: ${config.moderatorEnabled !== false}`);
  } else {
    log.info(`📋 Using fixed 3-round mode (backward compatibility)`);
  }

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

  // Create enhanced discussion configuration
  const baseConfig = {
    prompt,
    language,
    tone,
    timestamp,
    model,
    projectContext,
    outputDir,
    unresolvedIssuesThreshold,
  };
  
  const dynamicConfig: Partial<DynamicRoundConfig> | undefined = dynamicRounds ? {
    enabled: true,
    minRounds: consensusConfig?.minRounds ?? 2,
    maxRounds: consensusConfig?.maxRounds ?? 10,
    consensusThreshold: consensusConfig?.consensusThreshold ?? 85,
    conflictTolerance: consensusConfig?.conflictTolerance ?? 15,
    moderatorEnabled: consensusConfig?.moderatorEnabled ?? true,
  } : undefined;
  
  const enhancedConfig = createEnhancedConfig(baseConfig, dynamicConfig);
  
  const discussion = await orchestrateDiscussion(enhancedConfig);

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
    log.info(`📁 Output directory: ${resolvedDir}`);
    log.info(`📝 Creating directory if it doesn't exist...`);
    await ensureDirectory(resolvedDir);

    discussionPath = path.join(resolvedDir, `DISCUSSION_${timestamp}.md`);
    requestPath = path.join(resolvedDir, `REQUEST_${timestamp}.md`);

    log.info(`📄 Writing DISCUSSION file: ${discussionPath}`);
    log.info(`📄 Writing REQUEST file: ${requestPath}`);

    const { writeFileAtomic } = await import('../lib/fs.js');
    await writeFileAtomic(discussionPath, discussionContent);
    await writeFileAtomic(requestPath, requestContent);

    log.info(`✅ Files successfully written:`);
    log.info(`   - ${discussionPath}`);
    log.info(`   - ${requestPath}`);
    console.log(`\n✅ Files saved to: ${resolvedDir}`);
    console.log(`   - DISCUSSION_${timestamp}.md`);
    console.log(`   - REQUEST_${timestamp}.md`);
  }

  const summary = `Roundtable completed. Generated ${language === 'pt' ? 'especificação PRP-ready' : 'PRP-ready specification'} for: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`;

  return {
    discussionPath,
    requestPath,
    summary,
    timestamp,
    outputDir: dryRun ? undefined : path.resolve(outputDir),
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

/**
 * Executes resolution processing mode using a resolved UNRESOLVED_ISSUES.md file
 */
async function executeResolutionProcessing(params: {
  prompt: string;
  unresolvedIssuesFile: string;
  outputDir: string;
  language: string;
  tone: string;
  includeAcceptanceCriteria: boolean;
  dryRun: boolean;
  model?: string;
  claudeMd?: string;
  docsContext?: Array<{path: string, content: string}>;
}): Promise<RoundtableOutput> {
  const {
    prompt,
    unresolvedIssuesFile,
    outputDir,
    language,
    tone,
    includeAcceptanceCriteria,
    dryRun,
    model,
    claudeMd,
    docsContext,
  } = params;

  log.info(`🔍 Processing resolved issues file: ${unresolvedIssuesFile}`);
  
  try {
    // Parse the resolved issues file
    const resolvedIssuesData = await parseResolvedIssuesFile(unresolvedIssuesFile);
    
    log.info(`✅ Parsed ${resolvedIssuesData.issues.length} issues with ${resolvedIssuesData.resolutions.length} resolutions`);
    
    // Validate that all issues have been resolved
    if (resolvedIssuesData.resolutions.length !== resolvedIssuesData.issues.length) {
      throw new Error(
        `Resolution incomplete: ${resolvedIssuesData.issues.length} issues found but only ${resolvedIssuesData.resolutions.length} resolutions provided. Please resolve all issues before proceeding.`
      );
    }
    
    const timestamp = getTimestamp();
    
    // Create project context
    let projectContext;
    if (claudeMd || docsContext) {
      projectContext = {
        claudeMd,
        docsFiles: docsContext ? docsContext.map(doc => ({
          path: doc.path,
          content: doc.content,
          relativePath: doc.path
        })) : [],
        summary: generateContextSummary(claudeMd, docsContext)
      };
    } else {
      projectContext = await readProjectContext(process.cwd());
    }
    
    // Create a mock discussion with resolved consensus
    const mockDiscussion = createResolvedDiscussion(
      resolvedIssuesData,
      {
        prompt,
        language,
        tone,
        timestamp,
        model,
        projectContext,
        outputDir,
      }
    );
    
    // Generate the final REQUEST.md with resolved decisions
    const requestContent = await writeRequestMarkdown(mockDiscussion, {
      language,
      timestamp,
      prompt,
      includeAcceptanceCriteria,
    });
    
    let requestPath: string | undefined;
    
    if (dryRun) {
      log.info('DRY RUN MODE - Final REQUEST.md:');
      console.log('\n=== FINAL REQUEST.md ===\n');
      console.log(requestContent);
    } else {
      const resolvedDir = path.resolve(outputDir);
      await ensureDirectory(resolvedDir);
      
      requestPath = path.join(resolvedDir, `REQUEST_${timestamp}.md`);
      
      const { writeFileAtomic } = await import('../lib/fs.js');
      await writeFileAtomic(requestPath, requestContent);
      
      log.info(`✅ Final specification written: ${requestPath}`);
      console.log(`\n✅ Final specification saved: ${path.basename(requestPath)}`);
    }
    
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    const summary = isPortuguese
      ? `Especificação final gerada com todas as questões resolvidas: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`
      : `Final specification generated with all issues resolved: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`;
    
    return {
      requestPath,
      summary,
      timestamp,
      outputDir: dryRun ? undefined : path.resolve(outputDir),
    };
    
  } catch (error) {
    log.error(`🚨 Resolution processing failed: ${error}`);
    throw new Error(`Failed to process resolved issues: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Creates a mock discussion object with resolved consensus from user selections
 */
function createResolvedDiscussion(resolvedIssuesData: any, config: any): any {
  // Create a simplified discussion object with resolved consensus
  // This bypasses the actual discussion and provides the resolved decisions
  
  const participants = [
    { name: 'Business Analyst', role: 'Business Analyst', objectives: ['Requirements analysis'] },
    { name: 'Key User', role: 'Key User', objectives: ['User experience'] },
    { name: 'Product Owner', role: 'Product Owner', objectives: ['Product strategy'] },
    { name: 'Scrum Master', role: 'Scrum Master', objectives: ['Process management'] },
    { name: 'Solutions Architect', role: 'Solutions Architect', objectives: ['Technical design'] },
    { name: 'UX/UI Designer', role: 'UX/UI Designer', objectives: ['User interface'] },
    { name: 'Support Representative', role: 'Support Representative', objectives: ['Customer support'] },
    { name: 'Business Stakeholder', role: 'Business Stakeholder', objectives: ['Business value'] },
  ];
  
  // Create mock rounds based on resolved issues
  const rounds = resolvedIssuesData.issues.map((issue: any, _index: number) => {
    const resolution = resolvedIssuesData.resolutions.find((r: any) => r.issueId === issue.id);
    const content = resolution 
      ? (resolution.selectedOption === 'custom' 
         ? resolution.customResolution 
         : `Selected ${resolution.personaName || resolution.selectedOption} approach for ${issue.title}`)
      : `Resolved: ${issue.title}`;
      
    return {
      round: 1,
      speaker: 'Resolution Processor',
      role: 'Resolution Processor',
      content,
    };
  });
  
  // Create decisions based on resolutions
  const decisions = resolvedIssuesData.resolutions.map((resolution: any) => {
    const issue = resolvedIssuesData.issues.find((i: any) => i.issueId === resolution.issueId);
    if (resolution.selectedOption === 'custom') {
      return `${issue?.title || 'Issue'}: ${resolution.customResolution}`;
    } else if (resolution.selectedOption === 'indifferent') {
      return `${issue?.title || 'Issue'}: Team to decide based on implementation context`;
    } else {
      return `${issue?.title || 'Issue'}: Adopt ${resolution.personaName} approach`;
    }
  });
  
  const nextSteps = [
    'Implement resolved technical decisions',
    'Begin development based on consensus specifications',
    'Set up regular review cycles to validate implementations'
  ];
  
  return {
    config,
    participants,
    rounds,
    decisions,
    nextSteps,
    consensusHistory: [{
      agreementScore: 100, // Full agreement after user resolution
      unresolvedIssues: [], // All issues resolved
      conflictingPositions: new Map(),
      confidenceLevel: 95,
      discussionPhase: 'finalization' as const,
    }],
    currentRound: 1,
    consensusReached: true,
  };
}