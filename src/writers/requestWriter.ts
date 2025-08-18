import { Discussion } from '../engine/discussion.js';
import { WriterConfig } from './discussionWriter.js';
import { Turn } from '../personas/base.js';
import { AIContentGenerator } from '../lib/aiContentGenerator.js';
import { createAIServiceFromEnv } from '../lib/aiService.js';
import { log } from '../lib/log.js';

export async function writeRequestMarkdown(
  discussion: Discussion,
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

  // API Points - Generic structure
  lines.push(`## ${isPortuguese ? 'Pontos de Integração API' : 'API Integration Points'}`);
  lines.push('');
  lines.push(`**${isPortuguese ? 'Endpoints Necessários' : 'Required Endpoints'}:**`);
  lines.push(isPortuguese
    ? '- Definir endpoints baseados na funcionalidade requerida'
    : '- Define endpoints based on required functionality'
  );
  lines.push(isPortuguese
    ? '- Implementar autenticação e autorização adequadas'
    : '- Implement appropriate authentication and authorization'
  );
  lines.push(isPortuguese
    ? '- Seguir padrões REST/GraphQL conforme apropriado'
    : '- Follow REST/GraphQL standards as appropriate'
  );
  lines.push('');

  // Acceptance Criteria - Generic template
  if (includeAcceptanceCriteria) {
    lines.push(`## ${isPortuguese ? 'Critérios de Aceitação' : 'Acceptance Criteria'}`);
    lines.push('');
    lines.push('```gherkin');
    lines.push(isPortuguese ? 'Funcionalidade: Implementação da Solução' : 'Feature: Solution Implementation');
    lines.push('');
    lines.push(isPortuguese ? '  Cenário: Funcionalidade principal' : '  Scenario: Core functionality');
    lines.push(isPortuguese ? '    Dado que o usuário tem necessidades específicas' : '    Given user has specific needs');
    lines.push(isPortuguese ? '    Quando o sistema é usado conforme especificado' : '    When system is used as specified');
    lines.push(isPortuguese ? '    Então os requisitos devem ser atendidos' : '    Then requirements should be met');
    lines.push(isPortuguese ? '    E a experiência deve ser satisfatória' : '    And experience should be satisfactory');
    lines.push('```');
    lines.push('');
  }

  // Risks - Generic considerations
  lines.push(`## ${isPortuguese ? 'Riscos e Premissas' : 'Risks & Assumptions'}`);
  lines.push('');
  lines.push(`### ${isPortuguese ? 'Riscos' : 'Risks'}`);
  lines.push(isPortuguese
    ? '1. Dependências externas podem impactar funcionalidade'
    : '1. External dependencies may impact functionality'
  );
  lines.push(isPortuguese
    ? '2. Complexidade técnica pode afetar cronograma'
    : '2. Technical complexity may affect timeline'
  );
  lines.push(isPortuguese
    ? '3. Mudanças de requisitos durante desenvolvimento'
    : '3. Requirements changes during development'
  );
  lines.push('');
  
  lines.push(`### ${isPortuguese ? 'Premissas' : 'Assumptions'}`);
  lines.push(isPortuguese
    ? '- Recursos necessários estarão disponíveis'
    : '- Required resources will be available'
  );
  lines.push(isPortuguese
    ? '- Usuários têm ambiente técnico adequado'
    : '- Users have adequate technical environment'
  );
  lines.push(isPortuguese
    ? '- Integrações necessárias são factíveis'
    : '- Required integrations are feasible'
  );
  lines.push('');

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
    // Generic fallback content
    lines.push(`### ${isPortuguese ? 'Estratégia de Entrega' : 'Delivery Strategy'}`);
    lines.push(isPortuguese
      ? '- Dividir implementação em fases incrementais'
      : '- Split implementation into incremental phases'
    );
    lines.push(isPortuguese
      ? '- Priorizar funcionalidades core primeiro'
      : '- Prioritize core functionality first'
    );
    lines.push('');
  }

  // PRP-Ready Section
  lines.push(`## ${isPortuguese ? 'Artefatos PRP-Ready' : 'PRP-Ready Artifacts'}`);
  lines.push('');
  
  lines.push(`### ${isPortuguese ? 'Objetivo da Feature' : 'Feature Goal'}`);
  lines.push(isPortuguese
    ? 'Implementar solução eficaz para resolver o problema apresentado'
    : 'Implement effective solution to solve the presented problem'
  );
  lines.push('');
  
  lines.push(`### ${isPortuguese ? 'Entregável' : 'Deliverable'}`);
  lines.push(isPortuguese
    ? 'Sistema funcional que atende aos requisitos especificados'
    : 'Functional system that meets specified requirements'
  );
  lines.push('');
  
  lines.push(`### ${isPortuguese ? 'Definição de Sucesso' : 'Success Definition'}`);
  lines.push('- [ ] ' + (isPortuguese 
    ? 'Requisitos funcionais implementados e testados'
    : 'Functional requirements implemented and tested'
  ));
  lines.push('- [ ] ' + (isPortuguese
    ? 'Qualidade e performance dentro dos padrões'
    : 'Quality and performance within standards'
  ));
  lines.push('- [ ] ' + (isPortuguese
    ? 'Satisfação dos usuários finais validada'
    : 'End user satisfaction validated'
  ));
  lines.push('');

  // Key Decisions from Discussion
  if (discussion.decisions && discussion.decisions.length > 0) {
    lines.push(`### ${isPortuguese ? 'Decisões Chave da Discussão' : 'Key Decisions from Discussion'}`);
    discussion.decisions.forEach((decision, index) => {
      lines.push(`${index + 1}. ${decision}`);
    });
    lines.push('');
  }

  // Next Steps from Discussion  
  if (discussion.nextSteps && discussion.nextSteps.length > 0) {
    lines.push(`### ${isPortuguese ? 'Próximos Passos' : 'Next Steps'}`);
    discussion.nextSteps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
    lines.push('');
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