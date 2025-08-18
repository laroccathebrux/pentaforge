import { Turn } from '../personas/base.js';
import { BusinessAnalyst } from '../personas/BusinessAnalyst.js';
import { KeyUser } from '../personas/KeyUser.js';
import { ProductOwner } from '../personas/ProductOwner.js';
import { ScrumMaster } from '../personas/ScrumMaster.js';
import { SolutionsArchitect } from '../personas/SolutionsArchitect.js';
import { log } from '../lib/log.js';

export interface DiscussionConfig {
  prompt: string;
  language: string;
  tone: string;
  timestamp: string;
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
  
  const personas = [
    new BusinessAnalyst(),
    new KeyUser(),
    new ProductOwner(),
    new ScrumMaster(),
    new SolutionsArchitect(),
  ];

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
      
      const response = await persona.generateResponse({
        prompt: config.prompt,
        language: config.language,
        tone: config.tone,
        previousTurns: discussion.rounds,
      });

      const turn: Turn = {
        round,
        speaker: persona.name,
        role: persona.role,
        content: response,
      };

      discussion.rounds.push(turn);
      log.info(`${persona.role} (${persona.name}) completed turn in round ${round}`);
    }
  }

  discussion.decisions = extractDecisions(discussion);
  discussion.nextSteps = extractNextSteps(discussion);

  log.info('Discussion orchestration completed');
  return discussion;
}

function extractDecisions(discussion: Discussion): string[] {
  const { language } = discussion.config;
  const isPortuguese = language === 'pt' || language === 'pt-BR';

  const decisions = [];

  const architectTurns = discussion.rounds.filter(t => t.role === 'Solutions Architect');
  const poTurns = discussion.rounds.filter(t => t.role === 'Product Owner');
  const baTurns = discussion.rounds.filter(t => t.role === 'Business Analyst');

  if (architectTurns.length > 0) {
    const techDecision = isPortuguese
      ? 'Usar IndexedDB com Dexie.js para persistência local e REST API com PostgreSQL para backend'
      : 'Use IndexedDB with Dexie.js for local persistence and REST API with PostgreSQL for backend';
    decisions.push(techDecision);
  }

  if (poTurns.length > 0) {
    const mvpDecision = isPortuguese
      ? 'MVP em 2 sprints: Sprint 1 - persistência local, Sprint 2 - sincronização servidor'
      : 'MVP in 2 sprints: Sprint 1 - local persistence, Sprint 2 - server sync';
    decisions.push(mvpDecision);
  }

  if (baTurns.length > 0) {
    const reqDecision = isPortuguese
      ? 'Auto-salvamento a cada 2 segundos com indicador visual e recuperação de dados'
      : 'Auto-save every 2 seconds with visual indicator and data recovery';
    decisions.push(reqDecision);
  }

  const conflictDecision = isPortuguese
    ? 'Resolução de conflitos via last-write-wins com vetores de versão'
    : 'Conflict resolution via last-write-wins with version vectors';
  decisions.push(conflictDecision);

  const metricsDecision = isPortuguese
    ? 'Métricas de sucesso: 99,9% retenção de dados, <2s latência, zero perda de dados reportada'
    : 'Success metrics: 99.9% data retention, <2s latency, zero reported data loss';
  decisions.push(metricsDecision);

  return decisions;
}

function extractNextSteps(discussion: Discussion): string[] {
  const { language } = discussion.config;
  const isPortuguese = language === 'pt' || language === 'pt-BR';

  if (isPortuguese) {
    return [
      'Criar spike técnico para validar compatibilidade IndexedDB',
      'Definir contratos de API com equipe backend',
      'Configurar ambiente de desenvolvimento com Dexie.js',
      'Implementar prova de conceito de auto-salvamento',
      'Preparar plano de testes para cenários de perda de dados',
      'Documentar estratégia de migração de dados existentes',
    ];
  }

  return [
    'Create technical spike to validate IndexedDB compatibility',
    'Define API contracts with backend team',
    'Setup development environment with Dexie.js',
    'Implement auto-save proof of concept',
    'Prepare test plan for data loss scenarios',
    'Document migration strategy for existing data',
  ];
}