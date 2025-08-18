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
    const { language, previousTurns } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    let response = isPortuguese 
      ? `Como usuário que enfrenta este problema diariamente, `
      : `As someone who experiences this problem daily, `;
    
    if (previousTurns.length === 0) {
      if (isPortuguese) {
        response += `o problema causa atrito significativo. A solução deve ser intuitiva, `;
        response += `funcionar perfeitamente ao atualizar página e fornecer feedback claro.`;
      } else {
        response += `the issue causes significant friction. The solution must be intuitive, `;
        response += `work seamlessly on page refresh, and provide clear feedback.`;
      }
    } else {
      if (isPortuguese) {
        response += `concordo com a análise. O mais crítico é confiabilidade - preciso de confirmação visual de salvamento.`;
      } else {
        response += `I agree with the analysis. Most critical is reliability - I need visual confirmation of saves.`;
      }
    }
    
    return this.limitWords(response);
  }
}