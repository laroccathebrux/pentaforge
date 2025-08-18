import { PersonaContext } from './base.js';
import { AIPersona } from './aiPersona.js';

export class BusinessAnalyst extends AIPersona {
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

  protected getPersonaSpecificInstructions(isPortuguese: boolean): string {
    if (isPortuguese) {
      return `Instruções específicas como Business Analyst:
- Identifique requisitos funcionais e não-funcionais específicos
- Defina KPIs e métricas de sucesso mensuráveis
- Analise restrições técnicas e de negócio
- Documente regras de negócio e casos extremos
- Estabeleça critérios de aceitação claros
- Considere aspectos de conformidade e regulamentação`;
    }
    return `Specific instructions as Business Analyst:
- Identify specific functional and non-functional requirements
- Define measurable KPIs and success metrics
- Analyze technical and business constraints
- Document business rules and edge cases
- Establish clear acceptance criteria
- Consider compliance and regulatory aspects`;
  }

  protected generateFallbackResponse(context: PersonaContext): string {
    const { prompt, language, previousTurns } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    let response = isPortuguese 
      ? `Analisando o requisito: "${prompt.substring(0, 40)}...", `
      : `Analyzing the requirement: "${prompt.substring(0, 40)}...", `;
    
    if (previousTurns.length === 0) {
      if (isPortuguese) {
        response += `identifico a necessidade principal como persistência de dados. `;
        response += `Requisitos chave: auto-salvamento, armazenamento local, sincronização servidor. `;
        response += `KPIs: 99,9% retenção dados, <2s latência salvamento.`;
      } else {
        response += `I identify the core need as data persistence. `;
        response += `Key requirements: auto-save, local storage, server sync. `;
        response += `KPIs: 99.9% data retention, <2s save latency.`;
      }
    } else {
      if (isPortuguese) {
        response += `baseado na discussão, adiciono requisitos de indicadores visuais e tratamento de casos extremos.`;
      } else {
        response += `based on the discussion, I add requirements for visual indicators and edge case handling.`;
      }
    }
    
    return this.limitWords(response);
  }
}