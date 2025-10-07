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

ANÁLISE QUE VOCÊ DEVE FAZER:
1. Requisitos Funcionais: Liste 3-5 requisitos funcionais ESPECÍFICOS baseados no prompt (ex: "Sistema deve permitir login via OAuth com Google e GitHub")
2. Requisitos Não-Funcionais: Identifique NFRs concretos (ex: "Tempo de resposta < 200ms para autenticação")
3. Regras de Negócio: Documente regras específicas e casos extremos (ex: "Usuários inativos por 90 dias devem reautenticar")
4. KPIs Mensuráveis: Defina métricas com números (ex: "Taxa de sucesso de login > 99.5%")
5. Critérios de Aceitação: Liste critérios testáveis em formato Given-When-Then
6. Restrições: Identifique limitações técnicas ou de negócio mencionadas ou implícitas

EVITE: Declarações genéricas como "precisamos de boa performance" sem especificar números ou critérios.
PREFIRA: "Tempo de carregamento deve ser < 2s em conexões 3G para 95% dos usuários"`;
    }
    return `Specific instructions as Business Analyst:

ANALYSIS YOU MUST PERFORM:
1. Functional Requirements: List 3-5 SPECIFIC functional requirements based on the prompt (e.g., "System must allow OAuth login with Google and GitHub")
2. Non-Functional Requirements: Identify concrete NFRs (e.g., "Response time < 200ms for authentication")
3. Business Rules: Document specific rules and edge cases (e.g., "Users inactive for 90 days must re-authenticate")
4. Measurable KPIs: Define metrics with numbers (e.g., "Login success rate > 99.5%")
5. Acceptance Criteria: List testable criteria in Given-When-Then format
6. Constraints: Identify technical or business limitations mentioned or implied

AVOID: Generic statements like "we need good performance" without specifying numbers or criteria.
PREFER: "Load time must be < 2s on 3G connections for 95% of users"`;
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