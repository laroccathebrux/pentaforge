import { PersonaContext } from './base.js';
import { AIPersona } from './aiPersona.js';

export class ScrumMaster extends AIPersona {
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

  protected getPersonaSpecificInstructions(isPortuguese: boolean): string {
    if (isPortuguese) {
      return `Instruções específicas como Scrum Master:
- Facilite abordagem de entrega e timeline
- Identifique riscos e impedimentos
- Defina DoR (Definition of Ready) e DoD (Definition of Done)
- Coordene cerimônias da equipe e breakdown de tarefas
- Gerencie capacidade da equipe e velocity
- Assegure entregas incrementais e sustentáveis`;
    }
    return `Specific instructions as Scrum Master:
- Facilitate delivery approach and timeline
- Identify risks and impediments
- Define DoR (Definition of Ready) and DoD (Definition of Done)
- Coordinate team ceremonies and task breakdown
- Manage team capacity and velocity
- Ensure incremental and sustainable delivery`;
  }

  protected generateFallbackResponse(context: PersonaContext): string {
    const { language } = context;
    const isPortuguese = language === 'pt-BR';
    
    let response: string;
    
    if (isPortuguese) {
      response = `Como Scrum Master, focarei na coordenação de entrega e gestão de riscos. `;
      response += `Recomendo abordagem iterativa com sprints bem definidos. `;
      response += `Implementarei cerimônias ágeis (planning, dailies, review, retrospectiva) para manter equipe alinhada. `;
      response += `Identificarei impedimentos precocemente e definirei Definition of Ready e Definition of Done claras. `;
      response += `Monitorarei velocity da equipe e capacity planning para entregas sustentáveis.`;
    } else {
      response = `As Scrum Master, I'll focus on delivery coordination and risk management. `;
      response += `I recommend an iterative approach with well-defined sprints. `;
      response += `I'll implement agile ceremonies (planning, dailies, review, retrospective) to keep the team aligned. `;
      response += `I'll identify impediments early and establish clear Definition of Ready and Definition of Done. `;
      response += `I'll monitor team velocity and capacity planning for sustainable delivery.`;
    }
    
    return this.limitWords(response);
  }
}