import { Persona, PersonaContext } from './base.js';

export class ProductOwner extends Persona {
  constructor() {
    super(
      'Michael Torres',
      'Product Owner',
      [
        'Define product vision and value proposition',
        'Prioritize features based on business value',
        'Set success metrics and acceptance criteria',
        'Determine release strategy and MVP scope',
      ]
    );
  }

  async generateResponse(context: PersonaContext): Promise<string> {
    const { prompt, language } = context;
    
    if (language === 'pt' || language === 'pt-BR') {
      return this.generatePortugueseResponse(context);
    }
    
    return this.generateEnglishResponse(context);
  }

  private generateEnglishResponse(context: PersonaContext): string {
    const { prompt, previousTurns } = context;
    const baInput = this.findPreviousTurn(previousTurns, 'Business Analyst');
    const userInput = this.findPreviousTurn(previousTurns, 'Key User');
    
    let response = `From a product perspective, `;
    
    if (previousTurns.length < 2) {
      response += `this persistence feature directly impacts user retention and satisfaction. `;
      response += `Priority: HIGH - data loss is a critical user trust issue. `;
      response += `MVP scope: 1) Local storage with IndexedDB, 2) Auto-save every 2 seconds, `;
      response += `3) Visual save indicator. `;
      response += `Phase 2: Server sync, conflict resolution, data export. `;
      response += `Success metrics: 50% reduction in "lost work" complaints, `;
      response += `95% user confidence score in data persistence, <1% data loss rate.`;
    } else if (baInput && userInput) {
      response += `I'm aligning the MVP with immediate user needs while managing technical complexity. `;
      response += `Release 1 (Week 1-2): Core local persistence with visual feedback. `;
      response += `Release 2 (Week 3-4): Server sync and conflict handling. `;
      response += `Out of scope for now: Real-time collaboration, advanced versioning. `;
      response += `This phased approach reduces risk while delivering value quickly.`;
    } else {
      response += `the business value is clear: reduced support tickets and increased user engagement. `;
      response += `Each hour of lost work costs users productivity and trust. `;
      response += `ROI: Implementing this will save ~500 support hours/month and improve NPS by 10+ points. `;
      response += `I'm setting a 2-week deadline for MVP with daily progress reviews.`;
    }
    
    return this.limitWords(response);
  }

  private generatePortugueseResponse(context: PersonaContext): string {
    const { prompt, previousTurns } = context;
    const baInput = this.findPreviousTurn(previousTurns, 'Business Analyst');
    const userInput = this.findPreviousTurn(previousTurns, 'Key User');
    
    let response = `Da perspectiva do produto, `;
    
    if (previousTurns.length < 2) {
      response += `esta funcionalidade de persistência impacta diretamente retenção e satisfação do usuário. `;
      response += `Prioridade: ALTA - perda de dados é questão crítica de confiança. `;
      response += `Escopo do MVP: 1) Armazenamento local com IndexedDB, 2) Auto-salvamento a cada 2 segundos, `;
      response += `3) Indicador visual de salvamento. `;
      response += `Fase 2: Sincronização com servidor, resolução de conflitos, exportação de dados. `;
      response += `Métricas de sucesso: 50% redução em reclamações de "trabalho perdido", `;
      response += `95% score de confiança em persistência, <1% taxa de perda de dados.`;
    } else if (baInput && userInput) {
      response += `estou alinhando o MVP com necessidades imediatas enquanto gerencio complexidade técnica. `;
      response += `Release 1 (Semana 1-2): Persistência local central com feedback visual. `;
      response += `Release 2 (Semana 3-4): Sincronização com servidor e tratamento de conflitos. `;
      response += `Fora do escopo agora: Colaboração em tempo real, versionamento avançado. `;
      response += `Esta abordagem faseada reduz risco enquanto entrega valor rapidamente.`;
    } else {
      response += `o valor de negócio é claro: redução de tickets de suporte e aumento de engajamento. `;
      response += `Cada hora de trabalho perdido custa produtividade e confiança dos usuários. `;
      response += `ROI: Implementar isso economizará ~500 horas de suporte/mês e melhorará NPS em 10+ pontos. `;
      response += `Estabeleço prazo de 2 semanas para MVP com revisões diárias de progresso.`;
    }
    
    return this.limitWords(response);
  }
}