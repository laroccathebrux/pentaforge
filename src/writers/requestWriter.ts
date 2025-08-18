import { Discussion } from '../engine/discussion.js';
import { WriterConfig } from './discussionWriter.js';
import { Turn } from '../personas/base.js';

export async function writeRequestMarkdown(
  discussion: Discussion,
  config: WriterConfig
): Promise<string> {
  const { language, timestamp, prompt, includeAcceptanceCriteria = true } = config;
  const isPortuguese = language === 'pt' || language === 'pt-BR';

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
    // Fallback to generic content
    lines.push(`### ${isPortuguese ? 'Atual' : 'Current'}`);
    lines.push(isPortuguese
      ? '- Dados são perdidos ao atualizar a página'
      : '- Data is lost on page refresh'
    );
    lines.push(`### ${isPortuguese ? 'Desejado' : 'Desired'}`);
    lines.push(isPortuguese
      ? '- Dados persistem automaticamente'
      : '- Data persists automatically'
    );
    lines.push('');
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
    // Fallback content
    lines.push(isPortuguese
      ? '- **Objetivo Principal:** Eliminar perda de dados e aumentar confiança do usuário'
      : '- **Primary Goal:** Eliminate data loss and increase user trust'
    );
    lines.push('');
  }

  // Scope
  lines.push(`## ${isPortuguese ? 'Escopo' : 'Scope'}`);
  lines.push('');
  lines.push(`### ${isPortuguese ? 'Dentro do Escopo' : 'In Scope'}`);
  lines.push(isPortuguese
    ? '- Persistência local usando IndexedDB'
    : '- Local persistence using IndexedDB'
  );
  lines.push(isPortuguese
    ? '- Auto-salvamento com debounce'
    : '- Auto-save with debounce'
  );
  lines.push(isPortuguese
    ? '- Indicador visual de status de salvamento'
    : '- Visual save status indicator'
  );
  lines.push(isPortuguese
    ? '- Sincronização com servidor (fase 2)'
    : '- Server synchronization (phase 2)'
  );
  lines.push('');
  
  lines.push(`### ${isPortuguese ? 'Fora do Escopo' : 'Out of Scope'}`);
  lines.push(isPortuguese
    ? '- Colaboração em tempo real'
    : '- Real-time collaboration'
  );
  lines.push(isPortuguese
    ? '- Versionamento avançado de documentos'
    : '- Advanced document versioning'
  );
  lines.push(isPortuguese
    ? '- Sincronização offline complexa'
    : '- Complex offline sync'
  );
  lines.push('');

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
  
  // If no AI insights available, use fallback
  if (techInsights.length === 0 && requirementInsights.length === 0) {
    lines.push(isPortuguese
      ? '1. Sistema deve salvar dados automaticamente'
      : '1. System shall auto-save data automatically'
    );
    lines.push('');
  }

  // NFRs
  lines.push(`## ${isPortuguese ? 'Requisitos Não-Funcionais' : 'Non-Functional Requirements'}`);
  lines.push('');
  lines.push(isPortuguese
    ? '- **Performance:** Salvamento local < 100ms, sincronização servidor < 500ms'
    : '- **Performance:** Local save < 100ms, server sync < 500ms'
  );
  lines.push(isPortuguese
    ? '- **Segurança:** Criptografia em repouso e trânsito, autenticação JWT'
    : '- **Security:** Encryption at rest and in transit, JWT authentication'
  );
  lines.push(isPortuguese
    ? '- **Confiabilidade:** 99,99% disponibilidade, zero perda de dados'
    : '- **Reliability:** 99.99% availability, zero data loss'
  );
  lines.push(isPortuguese
    ? '- **Escalabilidade:** Suportar 10K usuários concorrentes'
    : '- **Scalability:** Support 10K concurrent users'
  );
  lines.push('');

  // Data Model
  lines.push(`## ${isPortuguese ? 'Modelo de Dados e Estratégia de Persistência' : 'Data Model & Persistence Strategy'}`);
  lines.push('');
  lines.push('```typescript');
  lines.push('interface TodoItem {');
  lines.push('  id: string;           // UUID v4');
  lines.push('  content: any;         // JSON payload');
  lines.push('  version: number;      // Optimistic locking');
  lines.push('  lastModified: Date;   // ISO 8601');
  lines.push('  syncStatus: "pending" | "synced" | "conflict";');
  lines.push('  userId: string;       // User identifier');
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push(`**${isPortuguese ? 'Estratégia' : 'Strategy'}:**`);
  lines.push(isPortuguese
    ? '- IndexedDB para armazenamento primário (Dexie.js wrapper)'
    : '- IndexedDB for primary storage (Dexie.js wrapper)'
  );
  lines.push(isPortuguese
    ? '- PostgreSQL com coluna JSONB para backend'
    : '- PostgreSQL with JSONB column for backend'
  );
  lines.push(isPortuguese
    ? '- Event sourcing para auditoria e recuperação'
    : '- Event sourcing for audit and recovery'
  );
  lines.push('');

  // API Points
  lines.push(`## ${isPortuguese ? 'Pontos de Integração API' : 'API Integration Points'}`);
  lines.push('');
  lines.push('```http');
  lines.push('POST /api/todos/sync');
  lines.push('Content-Type: application/json');
  lines.push('Authorization: Bearer {token}');
  lines.push('');
  lines.push('{');
  lines.push('  "items": [TodoItem],');
  lines.push('  "clientTimestamp": "2024-01-01T00:00:00Z"');
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('```http');
  lines.push('GET /api/todos/changes?since={timestamp}');
  lines.push('Authorization: Bearer {token}');
  lines.push('');
  lines.push('Response: {');
  lines.push('  "changes": [TodoItem],');
  lines.push('  "deletions": [string],');
  lines.push('  "serverTimestamp": "2024-01-01T00:00:00Z"');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // Acceptance Criteria
  if (includeAcceptanceCriteria) {
    lines.push(`## ${isPortuguese ? 'Critérios de Aceitação' : 'Acceptance Criteria'}`);
    lines.push('');
    lines.push('```gherkin');
    lines.push(isPortuguese ? 'Funcionalidade: Persistência de Dados' : 'Feature: Data Persistence');
    lines.push('');
    lines.push(isPortuguese ? '  Cenário: Auto-salvamento após mudanças' : '  Scenario: Auto-save after changes');
    lines.push(isPortuguese ? '    Dado que estou editando um item' : '    Given I am editing an item');
    lines.push(isPortuguese ? '    Quando eu paro de digitar por 2 segundos' : '    When I stop typing for 2 seconds');
    lines.push(isPortuguese ? '    Então os dados devem ser salvos automaticamente' : '    Then the data should be saved automatically');
    lines.push(isPortuguese ? '    E um indicador visual deve mostrar "Salvo"' : '    And a visual indicator should show "Saved"');
    lines.push('');
    lines.push(isPortuguese ? '  Cenário: Recuperação após refresh' : '  Scenario: Recovery after refresh');
    lines.push(isPortuguese ? '    Dado que eu tenho dados não salvos' : '    Given I have unsaved data');
    lines.push(isPortuguese ? '    Quando eu atualizo a página' : '    When I refresh the page');
    lines.push(isPortuguese ? '    Então meus dados devem ser restaurados' : '    Then my data should be restored');
    lines.push(isPortuguese ? '    E nenhum trabalho deve ser perdido' : '    And no work should be lost');
    lines.push('```');
    lines.push('');
  }

  // Risks
  lines.push(`## ${isPortuguese ? 'Riscos e Premissas' : 'Risks & Assumptions'}`);
  lines.push('');
  lines.push(`### ${isPortuguese ? 'Riscos' : 'Risks'}`);
  lines.push(isPortuguese
    ? '1. Incompatibilidade de navegador com IndexedDB (~5% dos usuários)'
    : '1. Browser incompatibility with IndexedDB (~5% of users)'
  );
  lines.push(isPortuguese
    ? '2. Limites de cota de armazenamento podem ser atingidos'
    : '2. Storage quota limits may be reached'
  );
  lines.push(isPortuguese
    ? '3. Conflitos de sincronização em múltiplas abas'
    : '3. Sync conflicts across multiple tabs'
  );
  lines.push('');
  
  lines.push(`### ${isPortuguese ? 'Premissas' : 'Assumptions'}`);
  lines.push(isPortuguese
    ? '- Usuários têm navegadores modernos (Chrome 90+, Firefox 88+, Safari 14+)'
    : '- Users have modern browsers (Chrome 90+, Firefox 88+, Safari 14+)'
  );
  lines.push(isPortuguese
    ? '- Dados por usuário < 10MB'
    : '- Data per user < 10MB'
  );
  lines.push(isPortuguese
    ? '- Conexão de rede disponível para sincronização'
    : '- Network connection available for sync'
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
    // Fallback content
    lines.push(`### ${isPortuguese ? 'Sprint 1 (Semana 1-2)' : 'Sprint 1 (Week 1-2)'}`);
    lines.push(isPortuguese
      ? '- Implementar persistência local'
      : '- Implement local persistence'
    );
    lines.push('');
  }

  // PRP-Ready Section
  lines.push(`## ${isPortuguese ? 'Artefatos PRP-Ready' : 'PRP-Ready Artifacts'}`);
  lines.push('');
  
  lines.push(`### ${isPortuguese ? 'Objetivo da Feature' : 'Feature Goal'}`);
  lines.push(isPortuguese
    ? 'Implementar persistência de dados confiável para eliminar perda de trabalho do usuário'
    : 'Implement reliable data persistence to eliminate user work loss'
  );
  lines.push('');
  
  lines.push(`### ${isPortuguese ? 'Entregável' : 'Deliverable'}`);
  lines.push(isPortuguese
    ? 'Sistema de persistência com auto-salvamento, recuperação e sincronização'
    : 'Persistence system with auto-save, recovery, and synchronization'
  );
  lines.push('');
  
  lines.push(`### ${isPortuguese ? 'Definição de Sucesso' : 'Success Definition'}`);
  lines.push('- [ ] ' + (isPortuguese 
    ? 'Zero perda de dados reportada em produção'
    : 'Zero data loss reported in production'
  ));
  lines.push('- [ ] ' + (isPortuguese
    ? 'Latência de salvamento < 2 segundos'
    : 'Save latency < 2 seconds'
  ));
  lines.push('- [ ] ' + (isPortuguese
    ? 'Taxa de satisfação do usuário > 95%'
    : 'User satisfaction rate > 95%'
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