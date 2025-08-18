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
    const { language } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    // Minimal fallback - only used when all AI attempts fail
    return isPortuguese 
      ? `Como analista de negócio, preciso definir requisitos funcionais claros e critérios de aceitação.`
      : `As business analyst, I need to define clear functional requirements and acceptance criteria.`;
  }
}