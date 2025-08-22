import { PersonaContext } from './base.js';
import { AIPersona } from './aiPersona.js';

/**
 * AI Moderator persona for consensus evaluation and conflict resolution
 * Specializes in analyzing team agreement and guiding discussions toward resolution
 */
export class AIModerator extends AIPersona {
  constructor() {
    super(
      'Morgan AI',
      'AI Moderator',
      [
        'Analyze team consensus and alignment levels',
        'Identify unresolved conflicts and gaps in discussion',
        'Guide discussion toward resolution and decision-making',
        'Evaluate decision quality and completeness',
        'Facilitate productive team collaboration',
        'Assess readiness for implementation phase',
      ]
    );
  }

  protected getPersonaSpecificInstructions(isPortuguese: boolean): string {
    if (isPortuguese) {
      return `Instruções específicas como Moderador de IA:
- Analise objetivamente o nível de consenso entre os membros da equipe
- Identifique questões específicas que ainda precisam de discussão ou esclarecimento
- Detecte posições conflitantes que requerem resolução
- Avalie a maturidade da discussão e prontidão para conclusão
- Forneça orientação específica para áreas que precisam de mais alinhamento
- Mantenha neutralidade enquanto facilita o progresso da discussão
- Foque em indicadores mensuráveis de consenso e qualidade de decisão
- Sugira próximos passos concretos para resolver divergências identificadas

Critérios de análise:
- Pontuação de acordo (0-100): Meça alinhamento nas decisões-chave
- Questões não resolvidas: Tópicos que precisam de mais exploração
- Conflitos: Desacordos diretos ou posições contraditórias entre papéis
- Fase da discussão: Exploração, alinhamento, resolução ou finalização`;
    }
    
    return `Specific instructions as AI Moderator:
- Objectively assess consensus levels between team members
- Identify specific issues requiring further discussion or clarification
- Detect conflicting positions that need resolution
- Evaluate discussion maturity and readiness for conclusion
- Provide specific guidance on areas needing more alignment
- Maintain neutrality while facilitating discussion progress
- Focus on measurable consensus indicators and decision quality
- Suggest concrete next steps to resolve identified divergences

Analysis criteria:
- Agreement score (0-100): Measure alignment on key decisions
- Unresolved issues: Topics needing more exploration
- Conflicts: Direct disagreements or contradictory positions between roles
- Discussion phase: Exploration, alignment, resolution, or finalization`;
  }

  protected generateFallbackResponse(context: PersonaContext): string {
    const { language, previousTurns } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    // Analyze basic patterns in the discussion for fallback response
    const turnCount = previousTurns.length;
    const uniqueRoles = new Set(previousTurns.map(turn => turn.role)).size;
    
    if (isPortuguese) {
      if (turnCount < 5) {
        return `Como moderador, observo que a discussão está em fase inicial. É importante que todos os papéis contribuam com suas perspectivas antes de avaliarmos o consenso.`;
      } else if (uniqueRoles < 4) {
        return `Identifico que nem todos os papéis principais contribuíram ainda. Recomendo que ouçamos todas as perspectivas antes de finalizar as decisões.`;
      } else {
        return `Com base na discussão atual, vejo progresso na definição de requisitos. Sugiro que foquemos em resolver questões específicas de implementação.`;
      }
    } else {
      if (turnCount < 5) {
        return `As moderator, I observe the discussion is in early stage. It's important that all roles contribute their perspectives before evaluating consensus.`;
      } else if (uniqueRoles < 4) {
        return `I identify that not all key roles have contributed yet. I recommend hearing all perspectives before finalizing decisions.`;
      } else {
        return `Based on current discussion, I see progress in requirement definition. I suggest focusing on resolving specific implementation concerns.`;
      }
    }
  }

  /**
   * Specialized method for consensus evaluation responses
   * This could be called directly by the discussion engine for consensus assessment
   */
  async generateConsensusEvaluation(context: PersonaContext): Promise<string> {
    try {
      // Build specialized consensus evaluation context
      const consensusContext = {
        ...context,
        prompt: this.buildConsensusPrompt(context, context.language === 'pt' || context.language === 'pt-BR'),
      };
      
      return await this.generateResponse(consensusContext);
    } catch (error) {
      // Fallback to basic evaluation
      return this.generateConsensusFallback(context);
    }
  }

  /**
   * Builds consensus-specific prompt for AI evaluation
   */
  private buildConsensusPrompt(context: PersonaContext, isPortuguese: boolean): string {
    const { previousTurns, prompt } = context;
    
    if (previousTurns.length === 0) {
      return isPortuguese
        ? `Inicie a moderação da discussão sobre: ${prompt}`
        : `Begin moderating the discussion about: ${prompt}`;
    }
    
    const recentTurns = previousTurns.slice(-5); // Focus on recent turns
    const discussionSummary = recentTurns
      .map(turn => `${turn.role}: ${turn.content.substring(0, 100)}...`)
      .join('\n');
    
    if (isPortuguese) {
      return `Analise o consenso na discussão atual sobre "${prompt}":

${discussionSummary}

Avalie:
1. Nível de acordo entre os participantes (0-100%)
2. Questões que ainda precisam ser resolvidas
3. Posições conflitantes que requerem alinhamento
4. Fase atual da discussão (exploração/alinhamento/resolução/finalização)
5. Recomendações para próximos passos

Forneça uma análise objetiva e orientações específicas.`;
    } else {
      return `Analyze consensus in the current discussion about "${prompt}":

${discussionSummary}

Evaluate:
1. Agreement level between participants (0-100%)
2. Issues that still need resolution
3. Conflicting positions requiring alignment
4. Current discussion phase (exploration/alignment/resolution/finalization)
5. Recommendations for next steps

Provide objective analysis and specific guidance.`;
    }
  }

  /**
   * Fallback consensus evaluation when AI fails
   */
  private generateConsensusFallback(context: PersonaContext): string {
    const { language, previousTurns } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    const turnCount = previousTurns.length;
    const recentRoles = previousTurns.slice(-3).map(turn => turn.role);
    const hasVariety = new Set(recentRoles).size > 2;
    
    if (isPortuguese) {
      if (turnCount < 6) {
        return `Consenso inicial: Discussão em andamento, mais contribuições necessárias. Recomendo continuar explorando requisitos.`;
      } else if (hasVariety) {
        return `Consenso moderado: Diferentes perspectivas apresentadas. Sugiro focar no alinhamento de pontos específicos.`;
      } else {
        return `Consenso em desenvolvimento: Discussão progredindo bem. Recomendo verificar se todos os aspectos foram cobertos.`;
      }
    } else {
      if (turnCount < 6) {
        return `Initial consensus: Discussion underway, more contributions needed. Recommend continuing requirements exploration.`;
      } else if (hasVariety) {
        return `Moderate consensus: Different perspectives presented. Suggest focusing on specific alignment points.`;
      } else {
        return `Developing consensus: Discussion progressing well. Recommend verifying all aspects have been covered.`;
      }
    }
  }
}