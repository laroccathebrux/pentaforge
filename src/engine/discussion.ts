import { Turn } from '../personas/base.js';
import { BusinessAnalyst } from '../personas/BusinessAnalyst.js';
import { KeyUser } from '../personas/KeyUser.js';
import { ProductOwner } from '../personas/ProductOwner.js';
import { ScrumMaster } from '../personas/ScrumMaster.js';
import { SolutionsArchitect } from '../personas/SolutionsArchitect.js';
import { AIService } from '../lib/aiService.js';
import { ProjectContext } from '../lib/contextReader.js';
import { AIContentGenerator } from '../lib/aiContentGenerator.js';
import { createAIServiceFromEnv } from '../lib/aiService.js';
import { log } from '../lib/log.js';

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

export async function orchestrateDiscussion(config: DiscussionConfig): Promise<Discussion> {
  log.info('Starting roundtable discussion orchestration');
  
  // Create AI service with custom model if specified
  let aiService: AIService | undefined;
  if (config.model) {
    const provider = (process.env.AI_PROVIDER || 'ollama') as any;
    const apiKey = process.env.AI_API_KEY;
    const baseURL = process.env.AI_BASE_URL;
    const temperature = process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : 0.7;
    const maxTokens = process.env.AI_MAX_TOKENS ? parseInt(process.env.AI_MAX_TOKENS) : 500;
    
    aiService = new AIService({
      provider,
      apiKey,
      baseURL,
      model: config.model,
      temperature,
      maxTokens,
    });
    
    log.info(`🎯 Custom AI Service Configuration:`);
    log.info(`   Provider: ${provider}`);
    log.info(`   Model: ${config.model}`);
    log.info(`   Base URL: ${baseURL || 'default'}`);
    log.info(`   API Key: ${apiKey ? '***configured***' : 'not set'}`);
    log.info(`   Temperature: ${temperature}`);
    log.info(`   Max Tokens: ${maxTokens}`);
  }
  
  const personas = [
    new BusinessAnalyst(),
    new KeyUser(),
    new ProductOwner(),
    new ScrumMaster(),
    new SolutionsArchitect(),
  ];
  
  // Override AI service for all personas if custom model specified
  if (aiService) {
    personas.forEach(persona => {
      persona.setAIService(aiService);
    });
  }

  const discussion: Discussion = {
    config,
    participants: personas.map(p => ({
      name: p.name,
      role: p.role,
      objectives: p.objectives,
    })),
    rounds: [],
    decisions: [],
    nextSteps: [],
  };

  const roundOrder = [
    [0, 1, 2, 3, 4], // Round 1: BA, User, PO, SM, Architect
    [1, 0, 2, 4, 3], // Round 2: User, BA, PO, Architect, SM  
    [2, 4, 1, 3, 0], // Round 3: PO, Architect, User, SM, BA
  ];

  for (let roundIndex = 0; roundIndex < roundOrder.length; roundIndex++) {
    const round = roundIndex + 1;
    log.info(`Starting round ${round}`);

    for (const personaIndex of roundOrder[roundIndex]) {
      const persona = personas[personaIndex];
      
      log.debug(`🎯 Round ${round}: ${persona.role} (${persona.name}) taking turn...`);
      
      const response = await persona.generateResponse({
        prompt: config.prompt,
        language: config.language,
        tone: config.tone,
        previousTurns: discussion.rounds,
        projectContext: config.projectContext,
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

  discussion.decisions = await extractDecisions(discussion);
  discussion.nextSteps = await extractNextSteps(discussion);

  log.info('Discussion orchestration completed');
  return discussion;
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