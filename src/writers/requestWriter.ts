import { Discussion } from '../engine/discussion.js';
import { WriterConfig } from './discussionWriter.js';

export async function writeRequestMarkdown(
  _discussion: Discussion,
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

  // Current vs Desired
  lines.push(`## ${isPortuguese ? 'Comportamento Atual vs Desejado' : 'Current vs Desired Behavior'}`);
  lines.push('');
  lines.push(`### ${isPortuguese ? 'Atual' : 'Current'}`);
  lines.push(isPortuguese
    ? '- Dados são perdidos ao atualizar a página'
    : '- Data is lost on page refresh'
  );
  lines.push(isPortuguese
    ? '- Nenhuma persistência entre sessões'
    : '- No persistence between sessions'
  );
  lines.push(isPortuguese
    ? '- Usuários precisam recriar trabalho perdido'
    : '- Users must recreate lost work'
  );
  lines.push('');
  
  lines.push(`### ${isPortuguese ? 'Desejado' : 'Desired'}`);
  lines.push(isPortuguese
    ? '- Dados persistem automaticamente'
    : '- Data persists automatically'
  );
  lines.push(isPortuguese
    ? '- Recuperação transparente após refresh'
    : '- Seamless recovery after refresh'
  );
  lines.push(isPortuguese
    ? '- Sincronização entre dispositivos (fase 2)'
    : '- Cross-device sync (phase 2)'
  );
  lines.push('');

  // Business Goals
  lines.push(`## ${isPortuguese ? 'Objetivos de Negócio e Métricas' : 'Business Goals & Success Metrics'}`);
  lines.push('');
  lines.push(isPortuguese
    ? '- **Objetivo Principal:** Eliminar perda de dados e aumentar confiança do usuário'
    : '- **Primary Goal:** Eliminate data loss and increase user trust'
  );
  lines.push(isPortuguese
    ? '- **KPI 1:** Taxa de retenção de dados > 99,9%'
    : '- **KPI 1:** Data retention rate > 99.9%'
  );
  lines.push(isPortuguese
    ? '- **KPI 2:** Latência de salvamento < 2 segundos'
    : '- **KPI 2:** Save latency < 2 seconds'
  );
  lines.push(isPortuguese
    ? '- **KPI 3:** Redução de 50% em reclamações sobre perda de trabalho'
    : '- **KPI 3:** 50% reduction in "lost work" complaints'
  );
  lines.push('');

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

  // Functional Requirements
  lines.push(`## ${isPortuguese ? 'Requisitos Funcionais' : 'Functional Requirements'}`);
  lines.push('');
  lines.push(isPortuguese
    ? '1. Sistema deve salvar dados automaticamente a cada 2 segundos após mudanças'
    : '1. System shall auto-save data every 2 seconds after changes'
  );
  lines.push(isPortuguese
    ? '2. Sistema deve usar IndexedDB para armazenamento local'
    : '2. System shall use IndexedDB for local storage'
  );
  lines.push(isPortuguese
    ? '3. Sistema deve mostrar indicador visual de status (salvando/salvo/erro)'
    : '3. System shall display visual status indicator (saving/saved/error)'
  );
  lines.push(isPortuguese
    ? '4. Sistema deve recuperar dados ao recarregar página'
    : '4. System shall recover data on page reload'
  );
  lines.push(isPortuguese
    ? '5. Sistema deve implementar fallback para localStorage se IndexedDB falhar'
    : '5. System shall implement localStorage fallback if IndexedDB fails'
  );
  lines.push('');

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

  // Release Plan
  lines.push(`## ${isPortuguese ? 'Plano de Release' : 'Release Plan'}`);
  lines.push('');
  lines.push(`### ${isPortuguese ? 'Sprint 1 (Semana 1-2)' : 'Sprint 1 (Week 1-2)'}`);
  lines.push(isPortuguese
    ? '- Implementar persistência local com IndexedDB'
    : '- Implement local persistence with IndexedDB'
  );
  lines.push(isPortuguese
    ? '- Criar mecanismo de auto-salvamento'
    : '- Create auto-save mechanism'
  );
  lines.push(isPortuguese
    ? '- Adicionar indicador visual de status'
    : '- Add visual status indicator'
  );
  lines.push(isPortuguese
    ? '- Testes unitários e de integração'
    : '- Unit and integration tests'
  );
  lines.push('');
  
  lines.push(`### ${isPortuguese ? 'Sprint 2 (Semana 3-4)' : 'Sprint 2 (Week 3-4)'}`);
  lines.push(isPortuguese
    ? '- Implementar API de sincronização'
    : '- Implement sync API'
  );
  lines.push(isPortuguese
    ? '- Adicionar resolução de conflitos'
    : '- Add conflict resolution'
  );
  lines.push(isPortuguese
    ? '- Implementar fallback para localStorage'
    : '- Implement localStorage fallback'
  );
  lines.push(isPortuguese
    ? '- Testes end-to-end e de carga'
    : '- End-to-end and load testing'
  );
  lines.push('');

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