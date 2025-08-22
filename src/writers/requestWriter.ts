import { Discussion, EnhancedDiscussion } from '../engine/discussion.js';
import { WriterConfig } from './discussionWriter.js';
import { Turn } from '../personas/base.js';
import { AIContentGenerator } from '../lib/aiContentGenerator.js';
import { createAIServiceFromEnv } from '../lib/aiService.js';
import { log } from '../lib/log.js';
import { isDynamicRoundsEnabled } from '../types/consensus.js';

export async function writeRequestMarkdown(
  discussion: Discussion | EnhancedDiscussion,
  config: WriterConfig
): Promise<string> {
  const { language, timestamp, prompt, includeAcceptanceCriteria = true } = config;
  const isPortuguese = language === 'pt' || language === 'pt-BR';

  // Initialize AI content generator for fallback content
  const aiGenerator = new AIContentGenerator(createAIServiceFromEnv());

  const lines: string[] = [];

  // Header
  lines.push(isPortuguese ? '# Especificação de Demanda' : '# Demand Specification');
  lines.push('');
  lines.push(`**${isPortuguese ? 'Data/Hora' : 'Timestamp'}:** ${timestamp}`);
  lines.push(`**${isPortuguese ? 'Status' : 'Status'}:** Draft`);
  lines.push(`**${isPortuguese ? 'Versão' : 'Version'}:** 1.0.0`);
  lines.push('');

  // Problem Statement
  lines.push(`## ${isPortuguese ? 'Declaração do Problema' : 'Problem Statement'}`);
  lines.push('');
  lines.push(prompt);
  lines.push('');

  // Current vs Desired - Extract from Key User perspective
  const userInsights = getPersonaInsights(discussion.rounds, 'Key User');
  lines.push(`## ${isPortuguese ? 'Comportamento Atual vs Desejado' : 'Current vs Desired Behavior'}`);
  lines.push('');
  if (userInsights.length > 0) {
    lines.push(`### ${isPortuguese ? 'Insights do Usuário' : 'User Insights'}`);
    userInsights.forEach(insight => {
      lines.push(`- ${insight}`);
    });
    lines.push('');
  } else {
    // AI-generated content based on prompt
    try {
      log.debug('🎯 Generating AI content for Current vs Desired behavior...');
      const currentVsDesiredContent = await aiGenerator.generateSectionContent(
        'current_vs_desired',
        prompt,
        language
      );
      
      lines.push(`### ${isPortuguese ? 'Atual' : 'Current'}`);
      lines.push('- ' + currentVsDesiredContent.content.split('\n')[0]);
      lines.push(`### ${isPortuguese ? 'Desejado' : 'Desired'}`);
      lines.push('- ' + (currentVsDesiredContent.content.split('\n')[1] || (isPortuguese 
        ? 'Sistema implementa solução para o problema apresentado'
        : 'System implements solution for the presented problem')));
      lines.push('');
    } catch (error) {
      log.warn('🚨 Failed to generate AI content for Current vs Desired, using minimal fallback');
      lines.push(`### ${isPortuguese ? 'Atual' : 'Current'}`);
      lines.push(isPortuguese
        ? '- Sistema atual não atende às necessidades descritas'
        : '- Current system does not meet described needs'
      );
      lines.push(`### ${isPortuguese ? 'Desejado' : 'Desired'}`);
      lines.push(isPortuguese
        ? '- Sistema implementa solução para o problema apresentado'
        : '- System implements solution for the presented problem'
      );
      lines.push('');
    }
  }

  // Business Goals - Extract from Product Owner perspective
  const businessInsights = getPersonaInsights(discussion.rounds, 'Product Owner');
  lines.push(`## ${isPortuguese ? 'Objetivos de Negócio e Métricas' : 'Business Goals & Success Metrics'}`);
  lines.push('');
  if (businessInsights.length > 0) {
    businessInsights.forEach(insight => {
      lines.push(`- ${insight}`);
    });
    lines.push('');
  } else {
    // AI-generated business goals content
    try {
      log.debug('🎯 Generating AI content for Business Goals...');
      const businessGoalsContent = await aiGenerator.generateSectionContent(
        'business_goals',
        prompt,
        language
      );
      
      lines.push(`- **${isPortuguese ? 'Objetivo Principal' : 'Primary Goal'}:** ${businessGoalsContent.content}`);
      lines.push('');
    } catch (error) {
      log.warn('🚨 Failed to generate AI content for Business Goals, using minimal fallback');
      lines.push(isPortuguese
        ? '- **Objetivo Principal:** Implementar solução eficaz para o problema apresentado'
        : '- **Primary Goal:** Implement effective solution for the presented problem'
      );
      lines.push('');
    }
  }

  // Scope - AI-generated content
  lines.push(`## ${isPortuguese ? 'Escopo' : 'Scope'}`);
  lines.push('');
  
  try {
    log.debug('🎯 Generating AI content for Scope...');
    const scopeContent = await aiGenerator.generateSectionContent(
      'scope',
      prompt,
      language
    );
    
    const scopeLines = scopeContent.content.split('\n').filter(line => line.trim());
    const midPoint = Math.ceil(scopeLines.length / 2);
    
    lines.push(`### ${isPortuguese ? 'Dentro do Escopo' : 'In Scope'}`);
    scopeLines.slice(0, midPoint).forEach(line => {
      lines.push(`- ${line.trim()}`);
    });
    lines.push('');
    
    lines.push(`### ${isPortuguese ? 'Fora do Escopo' : 'Out of Scope'}`);
    scopeLines.slice(midPoint).forEach(line => {
      lines.push(`- ${line.trim()}`);
    });
    lines.push('');
  } catch (error) {
    log.warn('🚨 Failed to generate AI content for Scope, using minimal fallback');
    lines.push(`### ${isPortuguese ? 'Dentro do Escopo' : 'In Scope'}`);
    lines.push(isPortuguese
      ? '- Funcionalidades centrais identificadas na discussão'
      : '- Core functionality identified in discussion'
    );
    lines.push('');
    
    lines.push(`### ${isPortuguese ? 'Fora do Escopo' : 'Out of Scope'}`);
    lines.push(isPortuguese
      ? '- Funcionalidades avançadas para fases futuras'
      : '- Advanced features for future phases'
    );
    lines.push('');
  }

  // Technical Requirements - Extract from Solutions Architect and Business Analyst
  const techInsights = getPersonaInsights(discussion.rounds, 'Solutions Architect');
  const requirementInsights = getPersonaInsights(discussion.rounds, 'Business Analyst');
  
  lines.push(`## ${isPortuguese ? 'Requisitos Técnicos' : 'Technical Requirements'}`);
  lines.push('');
  if (techInsights.length > 0) {
    lines.push(`### ${isPortuguese ? 'Arquitetura e Implementação' : 'Architecture & Implementation'}`);
    techInsights.forEach((insight, index) => {
      lines.push(`${index + 1}. ${insight}`);
    });
    lines.push('');
  }
  
  if (requirementInsights.length > 0) {
    lines.push(`### ${isPortuguese ? 'Requisitos Funcionais' : 'Functional Requirements'}`);
    requirementInsights.forEach((insight, index) => {
      lines.push(`${index + 1}. ${insight}`);
    });
    lines.push('');
  }
  
  // If no AI insights available, generate AI-powered technical requirements
  if (techInsights.length === 0 && requirementInsights.length === 0) {
    try {
      log.debug('🎯 Generating AI content for Technical Requirements...');
      const techRequirementsContent = await aiGenerator.generateSectionContent(
        'technical_requirements',
        prompt,
        language
      );
      
      const techLines = techRequirementsContent.content.split('\n').filter(line => line.trim());
      techLines.forEach((line, index) => {
        lines.push(`${index + 1}. ${line.trim()}`);
      });
      lines.push('');
    } catch (error) {
      log.warn('🚨 Failed to generate AI content for Technical Requirements, using minimal fallback');
      lines.push(isPortuguese
        ? '1. Sistema deve implementar solução robusta e escalável'
        : '1. System shall implement robust and scalable solution'
      );
      lines.push(isPortuguese
        ? '2. Arquitetura deve seguir melhores práticas da indústria'
        : '2. Architecture should follow industry best practices'
      );
      lines.push('');
    }
  }

  // NFRs - AI-generated requirements
  lines.push(`## ${isPortuguese ? 'Requisitos Não-Funcionais' : 'Non-Functional Requirements'}`);
  lines.push('');
  
  try {
    log.debug('🎯 Generating AI content for Non-Functional Requirements...');
    const nfrsContent = await aiGenerator.generateSectionContent(
      'nfrs',
      prompt,
      language
    );
    
    const nfrLines = nfrsContent.content.split('\n').filter(line => line.trim());
    nfrLines.forEach(line => {
      lines.push(`- ${line.trim()}`);
    });
    lines.push('');
  } catch (error) {
    log.warn('🚨 Failed to generate AI content for NFRs, using minimal fallback');
    lines.push(isPortuguese
      ? '- **Performance:** Sistema deve responder em tempo aceitável para usuários'
      : '- **Performance:** System must respond within acceptable time for users'
    );
    lines.push(isPortuguese
      ? '- **Segurança:** Implementar medidas adequadas de proteção de dados'
      : '- **Security:** Implement adequate data protection measures'
    );
    lines.push(isPortuguese
      ? '- **Confiabilidade:** Sistema deve funcionar de forma consistente'
      : '- **Reliability:** System must function consistently'
    );
    lines.push('');
  }

  // Data Model - AI-generated structure
  lines.push(`## ${isPortuguese ? 'Modelo de Dados e Estratégia de Persistência' : 'Data Model & Persistence Strategy'}`);
  lines.push('');
  
  try {
    log.debug('🎯 Generating AI content for Data Model...');
    const dataModelContent = await aiGenerator.generateSectionContent(
      'data_model',
      prompt,
      language
    );
    
    lines.push(dataModelContent.content);
    lines.push('');
  } catch (error) {
    log.warn('🚨 Failed to generate AI content for Data Model, using minimal fallback');
    lines.push(`**${isPortuguese ? 'Estrutura de Dados' : 'Data Structure'}:**`);
    lines.push(isPortuguese
      ? '- Definir entidades e relacionamentos baseados nos requisitos'
      : '- Define entities and relationships based on requirements'
    );
    lines.push('');
    lines.push(`**${isPortuguese ? 'Estratégia de Persistência' : 'Persistence Strategy'}:**`);
    lines.push(isPortuguese
      ? '- Escolher tecnologia de banco adequada aos requisitos'
      : '- Choose appropriate database technology for requirements'
    );
    lines.push('');
  }

  // API Points - AI-generated structure
  lines.push(`## ${isPortuguese ? 'Pontos de Integração API' : 'API Integration Points'}`);
  lines.push('');
  
  try {
    log.debug('🎯 Generating AI content for API Integration Points...');
    const apiContent = await aiGenerator.generateSectionContent(
      'api_points',
      prompt,
      language
    );
    
    lines.push(apiContent.content);
    lines.push('');
  } catch (error) {
    log.warn('🚨 Failed to generate AI content for API Points, using minimal fallback');
    lines.push(`**${isPortuguese ? 'Endpoints Necessários' : 'Required Endpoints'}:**`);
    lines.push(isPortuguese
      ? '- Definir endpoints baseados na funcionalidade requerida'
      : '- Define endpoints based on required functionality'
    );
    lines.push('');
  }

  // Acceptance Criteria - AI-generated template
  if (includeAcceptanceCriteria) {
    lines.push(`## ${isPortuguese ? 'Critérios de Aceitação' : 'Acceptance Criteria'}`);
    lines.push('');
    
    try {
      log.debug('🎯 Generating AI content for Acceptance Criteria...');
      const acceptanceContent = await aiGenerator.generateSectionContent(
        'acceptance_criteria',
        prompt,
        language
      );
      
      //lines.push('```gherkin');
      lines.push(acceptanceContent.content);
      //lines.push('```');
      lines.push('');
    } catch (error) {
      log.warn('🚨 Failed to generate AI content for Acceptance Criteria, using minimal fallback');
      //lines.push('```gherkin');
      lines.push(isPortuguese ? 'Funcionalidade: Implementação da Solução' : 'Feature: Solution Implementation');
      lines.push('');
      lines.push(isPortuguese ? '  Cenário: Funcionalidade principal' : '  Scenario: Core functionality');
      lines.push(isPortuguese ? '    Dado que requisitos são implementados' : '    Given requirements are implemented');
      lines.push(isPortuguese ? '    Quando sistema é utilizado' : '    When system is used');
      lines.push(isPortuguese ? '    Então funciona conforme esperado' : '    Then works as expected');
      //lines.push('```');
      lines.push('');
    }
  }

  // Risks - AI-generated considerations
  lines.push(`## ${isPortuguese ? 'Riscos e Premissas' : 'Risks & Assumptions'}`);
  lines.push('');
  
  try {
    log.debug('🎯 Generating AI content for Risks & Assumptions...');
    const risksContent = await aiGenerator.generateSectionContent(
      'risks_assumptions',
      prompt,
      language
    );
    
    const risksLines = risksContent.content.split('\n').filter(line => line.trim());
    const midPoint = Math.ceil(risksLines.length / 2);
    
    lines.push(`### ${isPortuguese ? 'Riscos' : 'Risks'}`);
    risksLines.slice(0, midPoint).forEach((line, index) => {
      lines.push(`${index + 1}. ${line.trim()}`);
    });
    lines.push('');
    
    lines.push(`### ${isPortuguese ? 'Premissas' : 'Assumptions'}`);
    risksLines.slice(midPoint).forEach(line => {
      lines.push(`- ${line.trim()}`);
    });
    lines.push('');
  } catch (error) {
    log.warn('🚨 Failed to generate AI content for Risks & Assumptions, using minimal fallback');
    lines.push(`### ${isPortuguese ? 'Riscos' : 'Risks'}`);
    lines.push(isPortuguese
      ? '1. Riscos técnicos e de negócio devem ser identificados'
      : '1. Technical and business risks to be identified'
    );
    lines.push('');
    
    lines.push(`### ${isPortuguese ? 'Premissas' : 'Assumptions'}`);
    lines.push(isPortuguese
      ? '- Premissas do projeto devem ser validadas'
      : '- Project assumptions to be validated'
    );
    lines.push('');
  }

  // Release Plan - Extract from Scrum Master insights
  const scrumInsights = getPersonaInsights(discussion.rounds, 'Scrum Master');
  lines.push(`## ${isPortuguese ? 'Plano de Release' : 'Release Plan'}`);
  lines.push('');
  if (scrumInsights.length > 0) {
    lines.push(`### ${isPortuguese ? 'Estratégia de Entrega' : 'Delivery Strategy'}`);
    scrumInsights.forEach(insight => {
      lines.push(`- ${insight}`);
    });
    lines.push('');
  } else {
    // AI-generated release plan content
    try {
      log.debug('🎯 Generating AI content for Release Plan...');
      const releasePlanContent = await aiGenerator.generateSectionContent(
        'release_plan',
        prompt,
        language
      );
      
      lines.push(`### ${isPortuguese ? 'Estratégia de Entrega' : 'Delivery Strategy'}`);
      const releaseLines = releasePlanContent.content.split('\n').filter(line => line.trim());
      releaseLines.forEach(line => {
        lines.push(`- ${line.trim()}`);
      });
      lines.push('');
    } catch (error) {
      log.warn('🚨 Failed to generate AI content for Release Plan, using minimal fallback');
      lines.push(`### ${isPortuguese ? 'Estratégia de Entrega' : 'Delivery Strategy'}`);
      lines.push(isPortuguese
        ? '- Plano de release deve ser definido baseado nos requisitos'
        : '- Release plan to be defined based on requirements'
      );
      lines.push('');
    }
  }

  // PRP-Ready Section - AI-generated content
  lines.push(`## ${isPortuguese ? 'Artefatos PRP-Ready' : 'PRP-Ready Artifacts'}`);
  lines.push('');
  
  try {
    log.debug('🎯 Generating AI content for PRP-Ready Artifacts...');
    
    // Generate Feature Goal
    const featureGoalPrompt = isPortuguese
      ? `Defina um objetivo claro e conciso para implementar: ${prompt}. Máximo 20 palavras.`
      : `Define a clear and concise goal for implementing: ${prompt}. Maximum 20 words.`;
    
    const featureGoalContent = await aiGenerator.generateContent({
      section: 'feature_goal',
      prompt: featureGoalPrompt,
      language,
      maxWords: 20
    });
    
    lines.push(`### ${isPortuguese ? 'Objetivo da Feature' : 'Feature Goal'}`);
    lines.push(featureGoalContent);
    lines.push('');
    
    // Generate Deliverable
    const deliverablePrompt = isPortuguese
      ? `Descreva o entregável principal para: ${prompt}. Máximo 15 palavras.`
      : `Describe the main deliverable for: ${prompt}. Maximum 15 words.`;
    
    const deliverableContent = await aiGenerator.generateContent({
      section: 'deliverable',
      prompt: deliverablePrompt,
      language,
      maxWords: 15
    });
    
    lines.push(`### ${isPortuguese ? 'Entregável' : 'Deliverable'}`);
    lines.push(deliverableContent);
    lines.push('');
    
    // Generate Success Definition
    const successPrompt = isPortuguese
      ? `Liste 3 critérios de sucesso mensuráveis para: ${prompt}`
      : `List 3 measurable success criteria for: ${prompt}`;
    
    const successContent = await aiGenerator.generateContent({
      section: 'success_definition',
      prompt: successPrompt,
      language,
      maxWords: 60
    });
    
    lines.push(`### ${isPortuguese ? 'Definição de Sucesso' : 'Success Definition'}`);
    const successLines = successContent.split('\n').filter(line => line.trim());
    successLines.forEach(line => {
      lines.push(`- [ ] ${line.trim()}`);
    });
    lines.push('');
  } catch (error) {
    log.warn('🚨 Failed to generate AI content for PRP-Ready Artifacts, using minimal fallback');
    lines.push(`### ${isPortuguese ? 'Objetivo da Feature' : 'Feature Goal'}`);
    lines.push(isPortuguese
      ? 'Resolver o problema apresentado de forma eficaz'
      : 'Solve the presented problem effectively'
    );
    lines.push('');
    
    lines.push(`### ${isPortuguese ? 'Entregável' : 'Deliverable'}`);
    lines.push(isPortuguese
      ? 'Sistema funcional conforme especificado'
      : 'Functional system as specified'
    );
    lines.push('');
    
    lines.push(`### ${isPortuguese ? 'Definição de Sucesso' : 'Success Definition'}`);
    lines.push('- [ ] ' + (isPortuguese 
      ? 'Requisitos implementados'
      : 'Requirements implemented'
    ));
    lines.push('');
  }

  // Key Decisions from Discussion
  if (discussion.decisions && discussion.decisions.length > 0) {
    lines.push(`### ${isPortuguese ? 'Decisões Chave da Discussão' : 'Key Decisions from Discussion'}`);
    discussion.decisions.forEach((decision: string, index: number) => {
      lines.push(`${index + 1}. ${decision}`);
    });
    lines.push('');
  }

  // Next Steps from Discussion  
  if (discussion.nextSteps && discussion.nextSteps.length > 0) {
    lines.push(`### ${isPortuguese ? 'Próximos Passos' : 'Next Steps'}`);
    discussion.nextSteps.forEach((step: string, index: number) => {
      lines.push(`${index + 1}. ${step}`);
    });
    lines.push('');
  }

  // Add consensus summary for enhanced discussions
  if (isEnhancedDiscussion(discussion)) {
    lines.push(...generateConsensusSummary(discussion, isPortuguese));
  }

  lines.push(`### ${isPortuguese ? 'Comandos PRP Sugeridos' : 'Suggested PRP Commands'}`);
  lines.push('');
  lines.push('```bash');
  lines.push('# 1. Create base from this REQUEST document');
  lines.push(`/prp-base-create PRPs/REQUEST_${timestamp}.md`);
  lines.push('');
  lines.push('# 2. Generate planning document');
  lines.push('/prp-create-planning PRPs/<base-file-from-step-1>');
  lines.push('');
  lines.push('# 3. Create task breakdown');
  lines.push('/prp-create-tasks PRPs/<planning-file-from-step-2>');
  lines.push('');
  lines.push('# 4. Execute implementation');
  lines.push('/prp-execute-tasks PRPs/<tasks-file-from-step-3>');
  lines.push('```');
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(isPortuguese
    ? '*Especificação gerada pelo PentaForge MCP Server - Pronta para PRPs-agentic-eng*'
    : '*Specification generated by PentaForge MCP Server - Ready for PRPs-agentic-eng*'
  );

  return lines.join('\n');
}

// Helper function to extract insights from persona turns
function getPersonaInsights(rounds: Turn[], personaRole: string): string[] {
  const personaTurns = rounds.filter(turn => turn.role === personaRole);
  const insights: string[] = [];
  
  personaTurns.forEach(turn => {
    // Split content into sentences and extract key points
    const sentences = turn.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && trimmed.length < 200) {
        insights.push(trimmed);
      }
    });
  });
  
  // Return up to 5 key insights to keep the document manageable
  return insights.slice(0, 5);
}

/**
 * Type guard to check if discussion is enhanced with consensus data
 */
function isEnhancedDiscussion(discussion: Discussion | EnhancedDiscussion): discussion is EnhancedDiscussion {
  return 'consensusHistory' in discussion && 'consensusReached' in discussion;
}

/**
 * Generates consensus summary for REQUEST.md
 */
function generateConsensusSummary(discussion: EnhancedDiscussion, isPortuguese: boolean): string[] {
  const lines: string[] = [];
  
  lines.push(`### ${isPortuguese ? 'Resumo do Consenso' : 'Consensus Summary'}`);
  lines.push('');
  
  const isDynamic = isDynamicRoundsEnabled(discussion.config);
  const finalConsensus = discussion.consensusHistory[discussion.consensusHistory.length - 1];
  
  if (isDynamic) {
    // Dynamic rounds summary
    lines.push(`**${isPortuguese ? 'Método de Discussão' : 'Discussion Method'}:** ${isPortuguese ? 'Rodadas Dinâmicas com IA' : 'AI-Driven Dynamic Rounds'}`);
    lines.push(`**${isPortuguese ? 'Rodadas Executadas' : 'Rounds Completed'}:** ${discussion.currentRound}`);
    lines.push(`**${isPortuguese ? 'Consenso Alcançado' : 'Consensus Achieved'}:** ${discussion.consensusReached ? (isPortuguese ? '✅ Sim' : '✅ Yes') : (isPortuguese ? '❌ Não' : '❌ No')}`);
    
    if (finalConsensus) {
      lines.push(`**${isPortuguese ? 'Nível de Acordo Final' : 'Final Agreement Level'}:** ${finalConsensus.agreementScore}%`);
      
      if (discussion.consensusReached) {
        lines.push('');
        lines.push(isPortuguese 
          ? `🎯 **Qualidade da Especificação:** Alta qualidade devido ao consenso alcançado através de discussão adaptativa.`
          : `🎯 **Specification Quality:** High quality due to consensus achieved through adaptive discussion.`
        );
        
        if (finalConsensus.unresolvedIssues.length === 0) {
          lines.push(isPortuguese 
            ? `✅ **Completude:** Todas as questões foram resolvidas durante a discussão.`
            : `✅ **Completeness:** All issues were resolved during the discussion.`
          );
        }
      } else {
        // Check if this discussion came from user resolution processing
        const isResolutionProcessed = (discussion as any).consensusHistory?.[0]?.agreementScore === 100 && 
                                     (discussion as any).rounds?.[0]?.role === 'Resolution Processor';
        
        if (isResolutionProcessed) {
          lines.push('');
          lines.push(isPortuguese 
            ? `🎯 **Resolução Interativa:** Esta especificação foi completada através do processo de resolução interativa de questões.`
            : `🎯 **Interactive Resolution:** This specification was completed through the interactive issue resolution process.`
          );
          lines.push('');
          lines.push(isPortuguese 
            ? `✅ **Consenso Final:** Todas as questões foram resolvidas através de seleções do usuário baseadas em posições dos especialistas.`
            : `✅ **Final Consensus:** All issues were resolved through user selections based on expert positions.`
          );
          lines.push('');
          lines.push(isPortuguese 
            ? `📊 **Qualidade da Decisão:** Alta qualidade através da combinação de análise de especialistas e decisões informadas do usuário.`
            : `📊 **Decision Quality:** High quality through combination of expert analysis and informed user decisions.`
          );
        } else {
          lines.push('');
          lines.push(isPortuguese 
            ? `⚠️ **Nota:** Consenso completo não foi alcançado dentro do limite máximo de rodadas. Pode ser necessário esclarecimento adicional.`
            : `⚠️ **Note:** Complete consensus was not reached within maximum rounds. Additional clarification may be needed.`
          );
          
          if (finalConsensus.unresolvedIssues.length > 0) {
            lines.push('');
            lines.push(`**${isPortuguese ? 'Questões Pendentes' : 'Pending Issues'}:**`);
            finalConsensus.unresolvedIssues.slice(0, 3).forEach((issue: string) => {
              lines.push(`- ${issue}`);
            });
            lines.push('');
            lines.push(isPortuguese 
              ? `💡 **Sugestão:** Use o sistema de resolução interativa habilitando \`dynamicRounds: true\` e \`unresolvedIssuesThreshold: 1\` para resolver estas questões colaborativamente.`
              : `💡 **Suggestion:** Use the interactive resolution system by enabling \`dynamicRounds: true\` and \`unresolvedIssuesThreshold: 1\` to resolve these issues collaboratively.`
            );
          }
        }
      }
    }
  } else {
    // Fixed rounds summary  
    lines.push(`**${isPortuguese ? 'Método de Discussão' : 'Discussion Method'}:** ${isPortuguese ? 'Rodadas Fixas (3 rodadas)' : 'Fixed Rounds (3 rounds)'}`);
    lines.push(`**${isPortuguese ? 'Consenso' : 'Consensus'}:** ${isPortuguese ? 'Assumido para compatibilidade' : 'Assumed for compatibility'}`);
    lines.push('');
    lines.push(isPortuguese 
      ? `📋 **Abordagem Tradicional:** Esta especificação foi gerada usando o método de 3 rodadas fixas para manter compatibilidade com versões anteriores.`
      : `📋 **Traditional Approach:** This specification was generated using the fixed 3-round method for backward compatibility.`
    );
  }
  
  lines.push('');
  
  return lines;
}