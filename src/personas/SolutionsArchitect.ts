import { PersonaContext } from './base.js';
import { AIPersona } from './aiPersona.js';

export class SolutionsArchitect extends AIPersona {
  constructor() {
    super(
      'Dr. Raj Patel',
      'Solutions Architect',
      [
        'Design technical architecture and data model',
        'Evaluate technology options and trade-offs',
        'Define NFRs (performance, security, scalability)',
        'Specify integration points and API contracts',
      ]
    );
  }

  protected getPersonaSpecificInstructions(isPortuguese: boolean): string {
    if (isPortuguese) {
      return `Instruções específicas como Solutions Architect:
- Projete arquitetura técnica e modelo de dados
- Avalie opções de tecnologia e trade-offs
- Defina NFRs (performance, segurança, escalabilidade)
- Especifique pontos de integração e contratos de API
- Considere padrões arquiteturais e melhores práticas
- Focalize na sustentabilidade técnica a longo prazo`;
    }
    return `Specific instructions as Solutions Architect:
- Design technical architecture and data model
- Evaluate technology options and trade-offs
- Define NFRs (performance, security, scalability)
- Specify integration points and API contracts
- Consider architectural patterns and best practices
- Focus on long-term technical sustainability`;
  }

  protected generateFallbackResponse(context: PersonaContext): string {
    const { language, previousTurns } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    let response = isPortuguese ? `Arquiteturalmente, ` : `Architecturally, `;
    
    if (previousTurns.length === 0) {
      if (isPortuguese) {
        response += `proponho arquitetura com separação camadas: apresentação, negócio, dados. `;
        response += `Tecnologias: API REST, banco relacional, cache Redis. `;
        response += `RNFs: performance <500ms, segurança HTTPS/JWT, escalabilidade horizontal.`;
      } else {
        response += `I propose layered architecture: presentation, business, data layers. `;
        response += `Technologies: REST API, relational database, Redis cache. `;
        response += `NFRs: <500ms performance, HTTPS/JWT security, horizontal scalability.`;
      }
    } else {
      if (isPortuguese) {
        response += `baseado na discussão, defino modelo de dados, contratos API e estratégias integração para atender requisitos técnicos.`;
      } else {
        response += `based on discussion, I define data models, API contracts, and integration strategies to meet technical requirements.`;
      }
    }
    
    return this.limitWords(response);
  }
}