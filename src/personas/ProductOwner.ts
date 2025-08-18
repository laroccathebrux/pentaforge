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
    const { language, previousTurns } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    let response = isPortuguese 
      ? `Da perspectiva do produto, `
      : `From a product perspective, `;
    
    if (previousTurns.length < 2) {
      if (isPortuguese) {
        response += `esta funcionalidade impacta diretamente retenção do usuário. `;
        response += `Prioridade ALTA. MVP: armazenamento local, auto-save, indicador visual.`;
      } else {
        response += `this feature directly impacts user retention. `;
        response += `HIGH priority. MVP: local storage, auto-save, visual indicator.`;
      }
    } else {
      if (isPortuguese) {
        response += `alinhando MVP com necessidades imediatas. Release faseado reduz risco e entrega valor.`;
      } else {
        response += `aligning MVP with immediate needs. Phased release reduces risk and delivers value.`;
      }
    }
    
    return this.limitWords(response);
  }
}