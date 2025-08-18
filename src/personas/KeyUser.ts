import { PersonaContext } from './base.js';
import { AIPersona } from './aiPersona.js';

export class KeyUser extends AIPersona {
  constructor() {
    super(
      'Alex Chen',
      'Key User',
      [
        'Describe pain points and frustrations',
        'Explain current workflows and workarounds',
        'Define acceptance criteria from user perspective',
        'Validate solution meets real-world needs',
      ]
    );
  }

  protected getPersonaSpecificInstructions(isPortuguese: boolean): string {
    if (isPortuguese) {
      return `Instruções específicas como Key User:
- Descreva pontos de dor e frustrações reais do usuário final
- Explique workflows atuais e workarounds necessários
- Defina critérios de aceitação da perspectiva do usuário
- Valide se a solução atende necessidades do mundo real
- Foque na experiência do usuário e usabilidade
- Priorize confiabilidade e feedback visual claro`;
    }
    return `Specific instructions as Key User:
- Describe real end-user pain points and frustrations
- Explain current workflows and necessary workarounds
- Define acceptance criteria from user perspective
- Validate solution meets real-world needs
- Focus on user experience and usability
- Prioritize reliability and clear visual feedback`;
  }

  protected generateFallbackResponse(context: PersonaContext): string {
    const { language } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    // Minimal fallback - only used when all AI attempts fail
    return isPortuguese 
      ? `Como usuário, preciso que a solução seja intuitiva e confiável para uso diário.`
      : `As a user, I need the solution to be intuitive and reliable for daily use.`;
  }
}