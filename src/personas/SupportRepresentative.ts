import { PersonaContext } from './base.js';
import { AIPersona } from './aiPersona.js';

export class SupportRepresentative extends AIPersona {
  constructor() {
    super(
      'Jordan Kim',
      'Support Representative',
      [
        'Identify customer pain points and support burden',
        'Provide user assistance perspective',
        'Evaluate feature impact on documentation needs',
        'Assess troubleshooting and maintenance requirements',
      ]
    );
  }

  protected getPersonaSpecificInstructions(isPortuguese: boolean): string {
    if (isPortuguese) {
      return `Instruções específicas como Support Representative:
- Identifique pontos de dor dos clientes e carga de suporte
- Forneça perspectiva de assistência ao usuário
- Avalie impacto da funcionalidade nas necessidades de documentação
- Analise requisitos de solução de problemas e manutenção
- Considere cenários comuns de suporte e casos extremos
- Priorize redução de tickets e auto-serviço`;
    }
    return `Specific instructions as Support Representative:
- Identify customer pain points and support burden
- Provide user assistance perspective
- Evaluate feature impact on documentation needs
- Assess troubleshooting and maintenance requirements
- Consider common support scenarios and edge cases
- Prioritize ticket reduction and self-service capabilities`;
  }

  protected generateFallbackResponse(context: PersonaContext): string {
    const { language } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    // Minimal fallback - only used when all AI attempts fail
    return isPortuguese 
      ? `Como representante de suporte, preciso garantir que esta funcionalidade minimize a carga de suporte e seja bem documentada.`
      : `As support representative, I need to ensure this functionality minimizes support burden and is well-documented.`;
  }
}