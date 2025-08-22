import { Turn } from '../personas/base.js';
import { AIPersona } from '../personas/aiPersona.js';
import { BusinessAnalyst } from '../personas/BusinessAnalyst.js';
import { KeyUser } from '../personas/KeyUser.js';
import { ProductOwner } from '../personas/ProductOwner.js';
import { ScrumMaster } from '../personas/ScrumMaster.js';
import { SolutionsArchitect } from '../personas/SolutionsArchitect.js';
import { AIModerator } from '../personas/AIModerator.js';
import { AIService } from '../lib/aiService.js';
import { ProjectContext } from '../lib/contextReader.js';
import { AIContentGenerator } from '../lib/aiContentGenerator.js';
import { createAIServiceFromEnv } from '../lib/aiService.js';
import { log } from '../lib/log.js';
import { existsSync } from 'fs';
import { ConsensusEvaluator } from './consensusEvaluator.js';
import { DynamicRoundStrategy } from './dynamicRoundStrategy.js';
import {
  EnhancedDiscussionConfig,
  EnhancedDiscussion,
  ConsensusMetrics,
  isDynamicRoundsEnabled,
  DEFAULT_DYNAMIC_CONFIG,
} from '../types/consensus.js';

export interface DiscussionConfig {
  prompt: string;
  language: string;
  tone: string;
  timestamp: string;
  model?: string;
  projectContext?: ProjectContext;
}

export interface Discussion {
  config: DiscussionConfig;
  participants: Array<{
    name: string;
    role: string;
    objectives: string[];
  }>;
  rounds: Turn[];
  decisions: string[];
  nextSteps: string[];
}

// Re-export EnhancedDiscussion from consensus types
export type { EnhancedDiscussion } from '../types/consensus.js';

export async function orchestrateDiscussion(config: EnhancedDiscussionConfig): Promise<EnhancedDiscussion> {
  log.info('Starting roundtable discussion orchestration');
  
  // Create AI service - either with custom model or from environment
  let aiService: AIService;
  const provider = (process.env.AI_PROVIDER || 'ollama') as any;
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
  
  const temperature = process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : 0.7;
  const maxTokens = process.env.AI_MAX_TOKENS ? parseInt(process.env.AI_MAX_TOKENS) : 500;
  
  // Use custom model if specified, otherwise use environment model
  const getDefaultModel = (p: string) => {
    switch (p) {
      case 'openai': return 'gpt-4o-mini';
      case 'anthropic': return 'claude-3-haiku-20240307';
      case 'ollama': return 'mistral:latest';
      default: return 'mistral:latest';
    }
  };
  const model = config.model || process.env.AI_MODEL || getDefaultModel(provider);
  
  aiService = new AIService({
    provider,
    apiKey,
    baseURL,
    model,
    temperature,
    maxTokens,
  });
  
  /*
  log.info(`🎯 AI Service Configuration for Discussion:`);
  log.info(`   Provider: ${provider}`);
  log.info(`   Model: ${model}`);
  log.info(`   Base URL: ${baseURL || 'default for provider'}`);
  log.info(`   API Key: ${apiKey ? '***configured***' : 'not set'}`);
  log.info(`   Temperature: ${temperature}`);
  log.info(`   Max Tokens: ${maxTokens}`);
  */
 
  const personas: AIPersona[] = [
    new BusinessAnalyst(),
    new KeyUser(),
    new ProductOwner(),
    new ScrumMaster(),
    new SolutionsArchitect(),
  ];
  
  // Add AI Moderator if dynamic rounds are enabled
  if (isDynamicRoundsEnabled(config)) {
    personas.push(new AIModerator());
    log.info('🤖 AI Moderator added to discussion for consensus evaluation');
  }
  
  // Set AI service for all personas
  personas.forEach(persona => {
    persona.setAIService(aiService);
  });

  const discussion: EnhancedDiscussion = {
    config,
    participants: personas.map(p => ({
      name: p.name,
      role: p.role,
      objectives: p.objectives,
    })),
    rounds: [],
    decisions: [],
    nextSteps: [],
    consensusHistory: [],
    decisionEvolution: [],
    currentRound: 0,
    consensusReached: false,
  };

  // Initialize consensus system if dynamic rounds enabled
  let consensusEvaluator: ConsensusEvaluator | null = null;
  let dynamicStrategy: DynamicRoundStrategy | null = null;
  let previousOrders: number[][] = [];
  
  if (isDynamicRoundsEnabled(config)) {
    consensusEvaluator = new ConsensusEvaluator(aiService);
    dynamicStrategy = new DynamicRoundStrategy();
    log.info('🔄 Dynamic rounds enabled - starting adaptive discussion');
  }

  // Determine round execution strategy
  if (isDynamicRoundsEnabled(config) && consensusEvaluator && dynamicStrategy) {
    // Dynamic rounds with consensus evaluation
    await executeDynamicRounds(discussion, personas, consensusEvaluator, dynamicStrategy, previousOrders);
  } else {
    // Fixed 3-round mode (backward compatibility)
    await executeFixedRounds(discussion, personas);
  }

  discussion.decisions = await extractDecisions(discussion);
  discussion.nextSteps = await extractNextSteps(discussion);

  log.info('Discussion orchestration completed');
  return discussion;
}

/**
 * Executes dynamic rounds with consensus evaluation
 */
async function executeDynamicRounds(
  discussion: EnhancedDiscussion,
  personas: AIPersona[],
  consensusEvaluator: ConsensusEvaluator,
  dynamicStrategy: DynamicRoundStrategy,
  previousOrders: number[][]
): Promise<void> {
  const config = discussion.config.dynamicRounds || DEFAULT_DYNAMIC_CONFIG;
  let roundIndex = 0;
  let consensusReached = false;

  log.info(`🎯 Starting dynamic discussion (min: ${config.minRounds}, max: ${config.maxRounds}, threshold: ${config.consensusThreshold}%)`);

  while (!consensusReached && roundIndex < config.maxRounds) {
    const currentRound = roundIndex + 1;
    discussion.currentRound = currentRound;
    
    log.info(`🔄 Starting dynamic round ${currentRound}`);

    // Generate consensus metrics from previous rounds (skip for first round)
    let consensusMetrics: ConsensusMetrics;
    if (roundIndex === 0) {
      // Initial metrics for first round
      consensusMetrics = {
        agreementScore: 0,
        unresolvedIssues: ['Initial requirements exploration needed'],
        conflictingPositions: new Map(),
        confidenceLevel: 50,
        discussionPhase: 'exploration',
      };
    } else {
      try {
        const roundTurns = discussion.rounds.filter(turn => turn.round === currentRound - 1);
        const evaluationResult = await consensusEvaluator.evaluateRound(roundTurns, config, currentRound - 1);
        consensusMetrics = evaluationResult.metrics;
        
        // Check if we should terminate
        if (evaluationResult.shouldTerminate && currentRound > config.minRounds) {
          log.info(`✅ Consensus reached! Agreement: ${consensusMetrics.agreementScore}%, terminating discussion`);
          consensusReached = true;
          discussion.consensusReached = true;
          break;
        }
      } catch (error) {
        log.warn(`🚨 Consensus evaluation failed for round ${currentRound - 1}, continuing: ${error}`);
        consensusMetrics = {
          agreementScore: 60,
          unresolvedIssues: ['Consensus evaluation failed'],
          conflictingPositions: new Map(),
          confidenceLevel: 30,
          discussionPhase: 'exploration',
        };
      }
    }

    // Store consensus metrics
    discussion.consensusHistory.push(consensusMetrics);

    // Generate round order based on consensus metrics
    const roundOrder = dynamicStrategy.generateNextRound(
      roundIndex,
      consensusMetrics,
      config,
      previousOrders
    );
    previousOrders.push(roundOrder);

    log.info(`📋 Round ${currentRound} order: [${roundOrder.map(i => personas[i]?.role || 'Unknown').join(', ')}]`);

    // Execute turns for this round
    for (const personaIndex of roundOrder) {
      if (personaIndex >= personas.length) {
        log.warn(`⚠️ Invalid persona index ${personaIndex}, skipping`);
        continue;
      }

      const persona = personas[personaIndex];
      
      log.debug(`🎯 Round ${currentRound}: ${persona.role} (${persona.name}) taking turn...`);
      
      try {
        const response = await persona.generateResponse({
          prompt: discussion.config.prompt,
          language: discussion.config.language,
          tone: discussion.config.tone,
          previousTurns: discussion.rounds,
          projectContext: discussion.config.projectContext,
        });

        const turn: Turn = {
          round: currentRound,
          speaker: persona.name,
          role: persona.role,
          content: response,
        };

        discussion.rounds.push(turn);
        log.info(`✅ Round ${currentRound}: ${persona.role} (${persona.name}) completed turn`);
      } catch (error) {
        log.error(`🚨 Failed to generate response for ${persona.role}: ${error}`);
        // Continue with other personas even if one fails
      }
    }

    roundIndex++;
  }

  // Final consensus evaluation
  if (!consensusReached && roundIndex >= config.maxRounds) {
    log.warn(`⚠️ Maximum rounds (${config.maxRounds}) reached without consensus`);
    discussion.consensusReached = false;
  }

  log.info(`🏁 Dynamic discussion completed after ${roundIndex} rounds. Consensus: ${discussion.consensusReached}`);
}

/**
 * Executes fixed 3-round mode for backward compatibility
 */
async function executeFixedRounds(
  discussion: EnhancedDiscussion,
  personas: AIPersona[]
): Promise<void> {
  log.info('🔄 Executing fixed 3-round discussion (backward compatibility mode)');
  
  const roundOrder = [
    [0, 1, 2, 3, 4], // Round 1: BA, User, PO, SM, Architect
    [1, 0, 2, 4, 3], // Round 2: User, BA, PO, Architect, SM  
    [2, 4, 1, 3, 0], // Round 3: PO, Architect, User, SM, BA
  ];

  for (let roundIndex = 0; roundIndex < roundOrder.length; roundIndex++) {
    const round = roundIndex + 1;
    discussion.currentRound = round;
    log.info(`Starting round ${round}`);

    for (const personaIndex of roundOrder[roundIndex]) {
      const persona = personas[personaIndex];
      
      log.debug(`🎯 Round ${round}: ${persona.role} (${persona.name}) taking turn...`);
      
      const response = await persona.generateResponse({
        prompt: discussion.config.prompt,
        language: discussion.config.language,
        tone: discussion.config.tone,
        previousTurns: discussion.rounds,
        projectContext: discussion.config.projectContext,
      });

      const turn: Turn = {
        round,
        speaker: persona.name,
        role: persona.role,
        content: response,
      };

      discussion.rounds.push(turn);
      log.info(`✅ Round ${round}: ${persona.role} (${persona.name}) completed turn`);
    }
  }
  
  // Fixed rounds always complete without consensus evaluation
  discussion.consensusReached = true; // Assume consensus for backward compatibility
  log.info('✅ Fixed rounds completed');
}

async function extractDecisions(discussion: Discussion): Promise<string[]> {
  const { language, prompt } = discussion.config;
  const isPortuguese = language === 'pt' || language === 'pt-BR';

  if (discussion.rounds.length === 0) {
    log.debug('🎯 No discussion rounds, using AI to generate decisions...');
    return await generateAIDecisions(prompt, language);
  }

  try {
    log.debug('🎯 Extracting decisions from discussion using AI...');
    const aiGenerator = new AIContentGenerator(createAIServiceFromEnv());
    
    // Compile all discussion content
    const discussionContent = discussion.rounds
      .map(turn => `${turn.role}: ${turn.content}`)
      .join('\n\n');
    
    const decisionsPrompt = isPortuguese
      ? `Baseado na discussão abaixo sobre "${prompt}", extraia as 3-5 decisões técnicas e de negócio mais importantes tomadas pela equipe. Liste cada decisão como um item separado e numerado.\n\nDiscussão:\n${discussionContent}`
      : `Based on the discussion below about "${prompt}", extract the 3-5 most important technical and business decisions made by the team. List each decision as a separate numbered item.\n\nDiscussion:\n${discussionContent}`;

    const decisionsContent = await aiGenerator.generateContent({
      section: 'decisions',
      prompt: decisionsPrompt,
      language,
      maxWords: 100
    });

    // Parse the AI response into individual decisions
    const decisions = decisionsContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(decision => decision.length > 10);

    return decisions.length > 0 ? decisions : await generateAIDecisions(prompt, language);
  } catch (error) {
    log.warn('🚨 Failed to extract decisions using AI, generating fallback decisions');
    return await generateAIDecisions(prompt, language);
  }
}

async function generateAIDecisions(prompt: string, language: string): Promise<string[]> {
  try {
    const aiGenerator = new AIContentGenerator(createAIServiceFromEnv());
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    const decisionsPrompt = isPortuguese
      ? `Para o projeto "${prompt}", liste 3-5 decisões técnicas e de negócio importantes que uma equipe deve tomar. Use formato de lista numerada.`
      : `For the project "${prompt}", list 3-5 important technical and business decisions that a team should make. Use numbered list format.`;

    const decisionsContent = await aiGenerator.generateContent({
      section: 'project_decisions',
      prompt: decisionsPrompt,
      language,
      maxWords: 100
    });

    const decisions = decisionsContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(decision => decision.length > 10);

    return decisions.length > 0 ? decisions : [
      isPortuguese 
        ? 'Decisões técnicas devem ser baseadas nos requisitos do projeto'
        : 'Technical decisions should be based on project requirements'
    ];
  } catch (error) {
    log.warn('🚨 Failed to generate AI decisions, using minimal fallback');
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    return [
      isPortuguese 
        ? 'Decisões técnicas devem ser baseadas nos requisitos do projeto'
        : 'Technical decisions should be based on project requirements'
    ];
  }
}

async function extractNextSteps(discussion: Discussion): Promise<string[]> {
  const { language, prompt } = discussion.config;
  const isPortuguese = language === 'pt' || language === 'pt-BR';

  if (discussion.rounds.length === 0) {
    log.debug('🎯 No discussion rounds, using AI to generate next steps...');
    return await generateAINextSteps(prompt, language);
  }

  try {
    log.debug('🎯 Extracting next steps from discussion using AI...');
    const aiGenerator = new AIContentGenerator(createAIServiceFromEnv());
    
    // Compile all discussion content
    const discussionContent = discussion.rounds
      .map(turn => `${turn.role}: ${turn.content}`)
      .join('\n\n');
    
    const nextStepsPrompt = isPortuguese
      ? `Baseado na discussão abaixo sobre "${prompt}", liste os 4-6 próximos passos mais importantes que a equipe deve tomar para implementar o projeto. Use formato de lista numerada.\n\nDiscussão:\n${discussionContent}`
      : `Based on the discussion below about "${prompt}", list the 4-6 most important next steps the team should take to implement the project. Use numbered list format.\n\nDiscussion:\n${discussionContent}`;

    const nextStepsContent = await aiGenerator.generateContent({
      section: 'next_steps',
      prompt: nextStepsPrompt,
      language,
      maxWords: 120
    });

    // Parse the AI response into individual next steps
    const nextSteps = nextStepsContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(step => step.length > 10);

    return nextSteps.length > 0 ? nextSteps : await generateAINextSteps(prompt, language);
  } catch (error) {
    log.warn('🚨 Failed to extract next steps using AI, generating fallback steps');
    return await generateAINextSteps(prompt, language);
  }
}

async function generateAINextSteps(prompt: string, language: string): Promise<string[]> {
  try {
    const aiGenerator = new AIContentGenerator(createAIServiceFromEnv());
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    const nextStepsPrompt = isPortuguese
      ? `Para implementar o projeto "${prompt}", liste 4-6 próximos passos práticos que uma equipe de desenvolvimento deve seguir. Use formato de lista numerada.`
      : `To implement the project "${prompt}", list 4-6 practical next steps that a development team should follow. Use numbered list format.`;

    const nextStepsContent = await aiGenerator.generateContent({
      section: 'implementation_steps',
      prompt: nextStepsPrompt,
      language,
      maxWords: 120
    });

    const nextSteps = nextStepsContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(step => step.length > 10);

    return nextSteps.length > 0 ? nextSteps : [
      isPortuguese 
        ? 'Definir próximos passos baseados nos requisitos do projeto'
        : 'Define next steps based on project requirements'
    ];
  } catch (error) {
    log.warn('🚨 Failed to generate AI next steps, using minimal fallback');
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    return [
      isPortuguese 
        ? 'Definir próximos passos baseados nos requisitos do projeto'
        : 'Define next steps based on project requirements'
    ];
  }
}