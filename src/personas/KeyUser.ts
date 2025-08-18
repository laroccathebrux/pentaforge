import { Persona, PersonaContext } from './base.js';

export class KeyUser extends Persona {
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

  async generateResponse(context: PersonaContext): Promise<string> {
    const { language } = context;
    
    if (language === 'pt' || language === 'pt-BR') {
      return this.generatePortugueseResponse(context);
    }
    
    return this.generateEnglishResponse(context);
  }

  private generateEnglishResponse(context: PersonaContext): string {
    const { prompt, previousTurns } = context;
    const baInput = this.findPreviousTurn(previousTurns, 'Business Analyst');
    
    let response = `As someone who experiences this problem daily, `;
    
    if (previousTurns.length === 0) {
      response += `the issue with "${prompt.substring(0, 50)}..." causes significant friction. `;
      response += `Currently, I have to manually work around this, which wastes 15-30 minutes per day. `;
      response += `The solution must be intuitive - I shouldn't need training. `;
      response += `Key acceptance: it should work seamlessly on page refresh, handle edge cases like network interruptions, `;
      response += `and provide clear feedback when actions succeed or fail.`;
    } else if (baInput) {
      response += `I agree with the requirements analysis. `;
      response += `From my experience, the most critical aspect is data reliability - I've lost work before. `;
      response += `The solution must auto-save within 2 seconds of any change, `;
      response += `show a sync indicator, and handle conflicts gracefully when multiple sessions exist.`;
    } else {
      response += `the implementation should prioritize user confidence. `;
      response += `I need visual confirmation that my data is saved (like a checkmark), `;
      response += `ability to see sync status, and most importantly, zero data loss scenarios. `;
      response += `Even if the browser crashes, my work must persist.`;
    }
    
    return this.limitWords(response);
  }

  private generatePortugueseResponse(context: PersonaContext): string {
    const { prompt, previousTurns } = context;
    const baInput = this.findPreviousTurn(previousTurns, 'Business Analyst');
    
    let response = `Como alguém que enfrenta este problema diariamente, `;
    
    if (previousTurns.length === 0) {
      response += `o problema com "${prompt.substring(0, 50)}..." causa atrito significativo. `;
      response += `Atualmente, preciso contornar isso manualmente, perdendo 15-30 minutos por dia. `;
      response += `A solução deve ser intuitiva - não deveria precisar de treinamento. `;
      response += `Critérios chave: deve funcionar perfeitamente ao atualizar a página, lidar com interrupções de rede, `;
      response += `e fornecer feedback claro quando ações são bem-sucedidas ou falham.`;
    } else if (baInput) {
      response += `concordo com a análise de requisitos. `;
      response += `Pela minha experiência, o aspecto mais crítico é a confiabilidade dos dados - já perdi trabalho antes. `;
      response += `A solução deve auto-salvar em 2 segundos após qualquer mudança, `;
      response += `mostrar indicador de sincronização e lidar com conflitos quando múltiplas sessões existem.`;
    } else {
      response += `a implementação deve priorizar a confiança do usuário. `;
      response += `Preciso de confirmação visual de que meus dados foram salvos (como um checkmark), `;
      response += `capacidade de ver status de sincronização e, principalmente, zero cenários de perda de dados. `;
      response += `Mesmo se o navegador travar, meu trabalho deve persistir.`;
    }
    
    return this.limitWords(response);
  }
}