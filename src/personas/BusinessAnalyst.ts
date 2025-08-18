import { Persona, PersonaContext } from './base.js';

export class BusinessAnalyst extends Persona {
  constructor() {
    super(
      'Sarah Mitchell',
      'Business Analyst',
      [
        'Analyze and document requirements',
        'Identify constraints and dependencies',
        'Define business rules and edge cases',
        'Establish KPIs and success metrics',
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
    const { prompt, previousTurns } = context;
    
    let response = `Analyzing the requirement: "${prompt.substring(0, 40)}...", `;
    
    if (previousTurns.length === 0) {
      response += `I identify the core need as data persistence with session continuity. `;
      response += `Key functional requirements: 1) Auto-save mechanism with <3s latency, `;
      response += `2) Local storage with IndexedDB for offline capability, `;
      response += `3) Server sync when online with conflict resolution, `;
      response += `4) Data versioning for recovery. `;
      response += `Constraints: Browser storage limits (10MB typical), network reliability, concurrent access. `;
      response += `Success KPIs: 99.9% data retention rate, <2s save latency, zero reported data loss incidents.`;
    } else {
      const userInput = this.findPreviousTurn(previousTurns, 'Key User');
      if (userInput) {
        response += `building on user feedback, I'll add requirements for: `;
        response += `5) Visual save indicators with states (saving/saved/error), `;
        response += `6) Automatic retry with exponential backoff, `;
        response += `7) Data export functionality for user control. `;
      } else {
        response += `the system must handle: `;
        response += `Edge cases: quota exceeded, corrupted data, browser incompatibility. `;
        response += `Business rules: LIFO for conflict resolution, 30-day data retention, GDPR compliance for EU users.`;
      }
    }
    
    return this.limitWords(response);
  }

  private generatePortugueseResponse(context: PersonaContext): string {
    const { prompt, previousTurns } = context;
    
    let response = `Analisando o requisito: "${prompt.substring(0, 40)}...", `;
    
    if (previousTurns.length === 0) {
      response += `identifico a necessidade principal como persistência de dados com continuidade de sessão. `;
      response += `Requisitos funcionais chave: 1) Mecanismo de auto-salvamento com latência <3s, `;
      response += `2) Armazenamento local com IndexedDB para capacidade offline, `;
      response += `3) Sincronização com servidor quando online com resolução de conflitos, `;
      response += `4) Versionamento de dados para recuperação. `;
      response += `Restrições: Limites de armazenamento do navegador (10MB típico), confiabilidade de rede, acesso concorrente. `;
      response += `KPIs de sucesso: 99,9% taxa de retenção de dados, <2s latência de salvamento, zero incidentes de perda de dados.`;
    } else {
      const userInput = this.findPreviousTurn(previousTurns, 'Key User');
      if (userInput) {
        response += `baseando no feedback do usuário, adiciono requisitos para: `;
        response += `5) Indicadores visuais de salvamento com estados (salvando/salvo/erro), `;
        response += `6) Retry automático com backoff exponencial, `;
        response += `7) Funcionalidade de exportação para controle do usuário. `;
      } else {
        response += `o sistema deve tratar: `;
        response += `Casos extremos: cota excedida, dados corrompidos, incompatibilidade de navegador. `;
        response += `Regras de negócio: LIFO para resolução de conflitos, retenção de 30 dias, conformidade LGPD.`;
      }
    }
    
    return this.limitWords(response);
  }
}