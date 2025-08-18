import { PersonaContext } from './base.js';
import { AIPersona } from './aiPersona.js';

export class ProductOwner extends AIPersona {
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

  protected getPersonaSpecificInstructions(isPortuguese: boolean): string {
    if (isPortuguese) {
      return `Instruções específicas como Product Owner:
- Defina visão do produto e proposta de valor
- Priorize features baseado em valor de negócio
- Estabeleça métricas de sucesso e critérios de aceitação
- Determine estratégia de release e escopo do MVP
- Balance necessidades do usuário com restrições técnicas
- Foque em retorno de investimento e impacto nos usuários`;
    }
    return `Specific instructions as Product Owner:
- Define product vision and value proposition
- Prioritize features based on business value
- Set success metrics and acceptance criteria
- Determine release strategy and MVP scope
- Balance user needs with technical constraints
- Focus on return on investment and user impact`;
  }

  protected generateFallbackResponse(context: PersonaContext): string {
    const { language } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    // Minimal fallback - only used when all AI attempts fail
    return isPortuguese 
      ? `Do ponto de vista do produto, precisamos priorizar funcionalidades que entreguem valor ao usuário.`
      : `From a product perspective, we need to prioritize functionality that delivers user value.`;
  }
}