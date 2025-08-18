import { Persona, PersonaContext } from './base.js';

export class SolutionsArchitect extends Persona {
  constructor() {
    super(
      'Dr. Raj Patel',
      'Solutions Architect',
      [
        'Design technical architecture and data model',
        'Evaluate technology options and trade-offs',
        'Define NFRs (performance, security, scalability)',
        'Specify integration points and API contracts',
      ]
    );
  }

  async generateResponse(context: PersonaContext): Promise<string> {
    const { language } = context;
    
    if (language === 'pt' || language === 'pt-BR') {
      return this.generatePortugueseResponse(context);
    }
    
    return this.generateEnglishResponse(context);
  }

  private generateEnglishResponse(context: PersonaContext): string {
    const { previousTurns } = context;
    const baInput = this.findPreviousTurn(previousTurns, 'Business Analyst');
    const smInput = this.findPreviousTurn(previousTurns, 'Scrum Master');
    
    let response = `Architecturally, `;
    
    if (previousTurns.length < 4) {
      response += `I propose a hybrid persistence strategy: IndexedDB for local storage with a REST API backend. `;
      response += `Data model: {id: UUID, content: JSON, version: number, lastModified: timestamp, syncStatus: enum}. `;
      response += `Technology stack: Dexie.js for IndexedDB wrapper, debounced auto-save, `;
      response += `REST API with optimistic locking, PostgreSQL for server persistence. `;
      response += `NFRs: <100ms local save, <500ms server sync, 99.99% availability, `;
      response += `encryption at rest and in transit, WCAG 2.1 AA compliance.`;
    } else if (baInput && smInput) {
      response += `based on requirements and timeline, here's the detailed design: `;
      response += `API contracts: POST /api/todos/sync (batch upsert), GET /api/todos/changes?since={timestamp}. `;
      response += `Conflict resolution: Last-write-wins with version vectors for detection. `;
      response += `Performance: Use Web Workers for background sync, implement request batching. `;
      response += `Security: JWT auth, rate limiting (100 req/min), input sanitization. `;
      response += `Fallback: If IndexedDB fails, use localStorage with 5MB limit.`;
    } else {
      response += `addressing scalability and reliability concerns: `;
      response += `Implement event sourcing for audit trail and recovery capability. `;
      response += `Database schema: todos table with JSONB column for flexibility, indexes on user_id and modified_at. `;
      response += `Monitoring: OpenTelemetry for observability, alerts on sync failures >1%. `;
      response += `Disaster recovery: Daily backups, point-in-time recovery, multi-region replication for enterprise. `;
      response += `This architecture supports 10K concurrent users with horizontal scaling.`;
    }
    
    return this.limitWords(response);
  }

  private generatePortugueseResponse(context: PersonaContext): string {
    const { previousTurns } = context;
    const baInput = this.findPreviousTurn(previousTurns, 'Business Analyst');
    const smInput = this.findPreviousTurn(previousTurns, 'Scrum Master');
    
    let response = `Arquiteturalmente, `;
    
    if (previousTurns.length < 4) {
      response += `proponho estratégia de persistência híbrida: IndexedDB para armazenamento local com backend REST API. `;
      response += `Modelo de dados: {id: UUID, content: JSON, version: number, lastModified: timestamp, syncStatus: enum}. `;
      response += `Stack tecnológico: Dexie.js para wrapper IndexedDB, auto-save com debounce, `;
      response += `REST API com locking otimista, PostgreSQL para persistência servidor. `;
      response += `RNFs: <100ms salvamento local, <500ms sync servidor, 99,99% disponibilidade, `;
      response += `criptografia em repouso e trânsito, conformidade WCAG 2.1 AA.`;
    } else if (baInput && smInput) {
      response += `baseado em requisitos e cronograma, aqui está o design detalhado: `;
      response += `Contratos API: POST /api/todos/sync (batch upsert), GET /api/todos/changes?since={timestamp}. `;
      response += `Resolução conflitos: Last-write-wins com vetores versão para detecção. `;
      response += `Performance: Usar Web Workers para sync background, implementar batching requisições. `;
      response += `Segurança: Auth JWT, rate limiting (100 req/min), sanitização input. `;
      response += `Fallback: Se IndexedDB falhar, usar localStorage com limite 5MB.`;
    } else {
      response += `abordando preocupações de escalabilidade e confiabilidade: `;
      response += `Implementar event sourcing para trilha auditoria e capacidade recuperação. `;
      response += `Schema banco: tabela todos com coluna JSONB para flexibilidade, índices em user_id e modified_at. `;
      response += `Monitoramento: OpenTelemetry para observabilidade, alertas em falhas sync >1%. `;
      response += `Recuperação desastres: Backups diários, recuperação point-in-time, replicação multi-região para enterprise. `;
      response += `Esta arquitetura suporta 10K usuários concorrentes com escalabilidade horizontal.`;
    }
    
    return this.limitWords(response);
  }
}