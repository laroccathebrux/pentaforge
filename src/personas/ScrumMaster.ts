import { Persona, PersonaContext } from './base.js';

export class ScrumMaster extends Persona {
  constructor() {
    super(
      'Jamie Park',
      'Scrum Master',
      [
        'Facilitate delivery approach and timeline',
        'Identify risks and impediments',
        'Define DoR (Definition of Ready) and DoD (Definition of Done)',
        'Coordinate team ceremonies and task breakdown',
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
    const poInput = this.findPreviousTurn(previousTurns, 'Product Owner');
    
    let response = `For delivery coordination, `;
    
    if (previousTurns.length < 3) {
      response += `I recommend a 2-sprint approach with clear checkpoints. `;
      response += `Sprint 1: Local persistence implementation (5-8 story points). `;
      response += `Tasks: 1) Setup IndexedDB wrapper (3h), 2) Implement auto-save logic (4h), `;
      response += `3) Create save indicator UI (2h), 4) Write unit tests (3h), 5) Integration testing (2h). `;
      response += `DoD: Code reviewed, 80% test coverage, no critical bugs, documentation updated. `;
      response += `Risks: Browser compatibility issues, storage quota limits. Mitigation: Early spike for validation.`;
    } else if (poInput) {
      response += `I'll structure the team's work to meet the PO's timeline. `;
      response += `Daily standups at 9 AM to track progress. `;
      response += `Sprint 2: Server sync and conflict resolution (8-13 points). `;
      response += `Key impediment: Need backend API specification by Day 3. `;
      response += `Team allocation: 2 frontend devs, 1 backend, 1 QA throughout. `;
      response += `Definition of Ready: User stories have acceptance criteria, mockups approved, API contracts defined.`;
    } else {
      response += `tracking velocity and removing blockers is critical. `;
      response += `Current team capacity: 40 points/sprint. This feature: ~18 points total. `;
      response += `Ceremony schedule: Planning (4h), Daily standups (15min), Review (1h), Retro (1h). `;
      response += `Success indicators: Burndown on track, no blockers >1 day, all acceptance criteria met. `;
      response += `I'll prepare a risk register and update it daily.`;
    }
    
    return this.limitWords(response);
  }

  private generatePortugueseResponse(context: PersonaContext): string {
    const { previousTurns } = context;
    const poInput = this.findPreviousTurn(previousTurns, 'Product Owner');
    
    let response = `Para coordenação de entrega, `;
    
    if (previousTurns.length < 3) {
      response += `recomendo abordagem de 2 sprints com checkpoints claros. `;
      response += `Sprint 1: Implementação de persistência local (5-8 story points). `;
      response += `Tarefas: 1) Setup wrapper IndexedDB (3h), 2) Implementar lógica auto-save (4h), `;
      response += `3) Criar UI indicador salvamento (2h), 4) Escrever testes unitários (3h), 5) Testes integração (2h). `;
      response += `DoD: Código revisado, 80% cobertura testes, sem bugs críticos, documentação atualizada. `;
      response += `Riscos: Problemas compatibilidade navegador, limites cota armazenamento. Mitigação: Spike inicial para validação.`;
    } else if (poInput) {
      response += `estruturarei o trabalho da equipe para atender prazo do PO. `;
      response += `Daily standups às 9h para acompanhar progresso. `;
      response += `Sprint 2: Sincronização servidor e resolução conflitos (8-13 pontos). `;
      response += `Impedimento chave: Preciso especificação API backend até Dia 3. `;
      response += `Alocação equipe: 2 devs frontend, 1 backend, 1 QA durante todo período. `;
      response += `Definition of Ready: User stories com critérios aceitação, mockups aprovados, contratos API definidos.`;
    } else {
      response += `acompanhar velocidade e remover bloqueios é crítico. `;
      response += `Capacidade atual equipe: 40 pontos/sprint. Esta feature: ~18 pontos total. `;
      response += `Agenda cerimônias: Planning (4h), Daily standups (15min), Review (1h), Retro (1h). `;
      response += `Indicadores sucesso: Burndown no prazo, sem bloqueios >1 dia, todos critérios aceitação atendidos. `;
      response += `Prepararei registro de riscos e atualizarei diariamente.`;
    }
    
    return this.limitWords(response);
  }
}