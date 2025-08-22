/**
 * AI-powered consensus evaluation service for dynamic discussions
 * Analyzes agreement levels, conflicts, and discussion progression
 */

import { AIService } from '../lib/aiService.js';
import { Turn } from '../personas/base.js';
import { log } from '../lib/log.js';
import {
  ConsensusMetrics,
  DynamicRoundConfig,
  RoundEvaluationResult,
  DecisionEvolution,
} from '../types/consensus.js';

export class ConsensusEvaluator {
  constructor(private aiService: AIService) {}

  /**
   * Evaluates consensus for a round of discussion
   * Uses AI analysis with fallback to rule-based evaluation
   */
  async evaluateRound(
    turns: Turn[],
    config: DynamicRoundConfig,
    currentRound: number
  ): Promise<RoundEvaluationResult> {
    try {
      log.debug(`🧠 ConsensusEvaluator: Analyzing round ${currentRound} with ${turns.length} turns`);
      
      const metrics = await this.generateConsensusMetrics(turns, config);
      const shouldTerminate = this.shouldTerminateDiscussion(metrics, config, currentRound);
      const nextRoundFocus = this.extractNextRoundFocus(metrics);
      const recommendedOrder = this.generateRecommendedOrder(metrics);

      log.debug(`✅ Consensus evaluation complete: agreement=${metrics.agreementScore}%, terminate=${shouldTerminate}`);

      return {
        metrics,
        shouldTerminate,
        nextRoundFocus,
        recommendedOrder,
      };
    } catch (error) {
      log.warn(`🚨 Consensus evaluation failed, using fallback. Error: ${error}`);
      return this.generateFallbackEvaluation(turns, config, currentRound);
    }
  }

  /**
   * Generates consensus metrics using AI analysis
   * Falls back to rule-based evaluation if AI fails
   */
  private async generateConsensusMetrics(
    turns: Turn[],
    config: DynamicRoundConfig
  ): Promise<ConsensusMetrics> {
    try {
      const prompt = this.buildConsensusAnalysisPrompt(turns, config);
      const response = await this.aiService.generateResponse([
        {
          role: 'system',
          content: this.getConsensusSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      return this.parseAIConsensusResponse(response.content, turns);
    } catch (error) {
      log.warn('🚨 AI consensus analysis failed, using rule-based evaluation');
      return this.generateRuleBasedConsensus(turns);
    }
  }

  /**
   * Builds the AI prompt for consensus analysis
   */
  private buildConsensusAnalysisPrompt(turns: Turn[], config: DynamicRoundConfig): string {
    const discussionContent = turns
      .map(turn => `${turn.role}: ${turn.content}`)
      .join('\n\n');

    return `Analyze the following roundtable discussion for consensus and agreement levels.

CONSENSUS THRESHOLD: ${config.consensusThreshold}%
CONFLICT TOLERANCE: ${config.conflictTolerance} unresolved issues

DISCUSSION:
${discussionContent}

Evaluate:
1. Overall agreement score (0-100) based on alignment between participants
2. Specific unresolved issues that need more discussion
3. Conflicting positions between roles (if any)
4. Confidence level in your assessment (0-100)
5. Current discussion phase: exploration, alignment, resolution, or finalization

Format your response as JSON:
{
  "agreementScore": <number>,
  "unresolvedIssues": ["issue1", "issue2"],
  "conflictingPositions": {"role1": ["position1"], "role2": ["position2"]},
  "confidenceLevel": <number>,
  "discussionPhase": "<phase>"
}`;
  }

  /**
   * System prompt for AI consensus evaluation
   */
  private getConsensusSystemPrompt(): string {
    return `You are an expert facilitator analyzing team discussions for consensus.

Your role:
- Objectively assess agreement levels between team members
- Identify specific unresolved issues requiring further discussion
- Detect conflicting positions that need resolution
- Evaluate discussion maturity and readiness for conclusion

Analysis criteria:
- Agreement score: Measure alignment on key decisions (variance-convergence method)
- Unresolved issues: Topics needing more exploration or clarification
- Conflicts: Direct disagreements or contradictory positions between roles
- Confidence: Your certainty in the consensus assessment
- Phase: Current stage of discussion progression

Be precise and analytical. Focus on measurable consensus indicators.`;
  }

  /**
   * Parses AI response into consensus metrics
   */
  private parseAIConsensusResponse(response: string, turns: Turn[]): ConsensusMetrics {
    try {
      // Find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Convert conflictingPositions object to Map
      const conflictingPositions = new Map<string, string[]>();
      if (parsed.conflictingPositions && typeof parsed.conflictingPositions === 'object') {
        Object.entries(parsed.conflictingPositions).forEach(([role, positions]) => {
          if (Array.isArray(positions)) {
            conflictingPositions.set(role, positions);
          }
        });
      }

      return {
        agreementScore: Math.max(0, Math.min(100, Number(parsed.agreementScore) || 0)),
        unresolvedIssues: Array.isArray(parsed.unresolvedIssues) ? parsed.unresolvedIssues : [],
        conflictingPositions,
        confidenceLevel: Math.max(0, Math.min(100, Number(parsed.confidenceLevel) || 0)),
        discussionPhase: this.validateDiscussionPhase(parsed.discussionPhase),
      };
    } catch (error) {
      log.warn('🚨 Failed to parse AI consensus response, using rule-based fallback');
      return this.generateRuleBasedConsensus(turns);
    }
  }

  /**
   * Validates discussion phase from AI response
   */
  private validateDiscussionPhase(phase: string): 'exploration' | 'alignment' | 'resolution' | 'finalization' {
    const validPhases: Array<'exploration' | 'alignment' | 'resolution' | 'finalization'> = [
      'exploration', 'alignment', 'resolution', 'finalization'
    ];
    
    return validPhases.includes(phase as any) ? (phase as any) : 'exploration';
  }

  /**
   * Rule-based consensus evaluation fallback
   * Used when AI analysis fails
   */
  private generateRuleBasedConsensus(turns: Turn[]): ConsensusMetrics {
    log.debug('🔄 Generating rule-based consensus evaluation');

    const uniqueRoles = new Set(turns.map(turn => turn.role));
    const totalTurns = turns.length;
    
    // Simple heuristics for rule-based evaluation
    const agreementScore = Math.min(100, (uniqueRoles.size / 5) * 60 + (totalTurns / 15) * 40);
    
    // Extract potential issues from short responses (likely indicating concerns)
    const shortResponses = turns.filter(turn => turn.content.split(' ').length < 30);
    const unresolvedIssues = shortResponses.length > 2 ? 
      ['Implementation details need clarification', 'Technical approach requires consensus'] : [];

    // Basic conflict detection - look for negative sentiment words
    const conflictIndicators = ['however', 'but', 'concern', 'issue', 'problem', 'disagree'];
    const conflictingPositions = new Map<string, string[]>();
    
    turns.forEach(turn => {
      const hasConflictIndicators = conflictIndicators.some(indicator => 
        turn.content.toLowerCase().includes(indicator)
      );
      if (hasConflictIndicators) {
        conflictingPositions.set(turn.role, ['Concerns raised about approach']);
      }
    });

    return {
      agreementScore,
      unresolvedIssues,
      conflictingPositions,
      confidenceLevel: 60, // Lower confidence for rule-based evaluation
      discussionPhase: totalTurns > 10 ? 'resolution' : 'exploration',
    };
  }

  /**
   * Determines whether discussion should terminate based on consensus metrics
   */
  private shouldTerminateDiscussion(
    metrics: ConsensusMetrics,
    config: DynamicRoundConfig,
    currentRound: number
  ): boolean {
    // Always respect max rounds limit
    if (currentRound >= config.maxRounds) {
      log.debug(`🛑 Max rounds (${config.maxRounds}) reached, forcing termination`);
      return true;
    }

    // Don't terminate before min rounds
    if (currentRound < config.minRounds) {
      log.debug(`⏳ Min rounds (${config.minRounds}) not reached yet`);
      return false;
    }

    // Check consensus threshold
    const consensusReached = metrics.agreementScore >= config.consensusThreshold;
    const conflictsResolved = metrics.conflictingPositions.size === 0;
    const issuesResolved = metrics.unresolvedIssues.length <= config.conflictTolerance;

    const shouldTerminate = consensusReached && conflictsResolved && issuesResolved;
    
    log.debug(`🎯 Termination evaluation: consensus=${consensusReached}, conflicts=${conflictsResolved}, issues=${issuesResolved} -> ${shouldTerminate}`);
    
    return shouldTerminate;
  }

  /**
   * Extracts focus areas for the next round based on unresolved issues
   */
  private extractNextRoundFocus(metrics: ConsensusMetrics): string[] {
    const focus: string[] = [];

    // Add unresolved issues as focus areas
    focus.push(...metrics.unresolvedIssues.slice(0, 3)); // Limit to top 3

    // Add conflict resolution focus
    if (metrics.conflictingPositions.size > 0) {
      focus.push('Resolve conflicting viewpoints and find common ground');
    }

    // Phase-specific focus
    switch (metrics.discussionPhase) {
      case 'exploration':
        focus.push('Explore requirements and constraints thoroughly');
        break;
      case 'alignment':
        focus.push('Align on technical approach and implementation strategy');
        break;
      case 'resolution':
        focus.push('Finalize decisions and resolve remaining concerns');
        break;
      case 'finalization':
        focus.push('Confirm final specifications and next steps');
        break;
    }

    return focus.slice(0, 4); // Limit to 4 focus areas
  }

  /**
   * Generates recommended persona order for next round
   * Prioritizes personas based on unresolved issues and conflicts
   */
  private generateRecommendedOrder(metrics: ConsensusMetrics): number[] {
    // Default order: [BA, User, PO, SM, Architect] = [0, 1, 2, 3, 4]
    // Add Moderator at index 5 if needed
    let order = [0, 1, 2, 3, 4];

    // If conflicts exist, start with moderator
    if (metrics.conflictingPositions.size > 0) {
      order = [5, ...order]; // Moderator first
    }

    // Adjust order based on discussion phase
    switch (metrics.discussionPhase) {
      case 'exploration':
        // BA and User first for requirements exploration
        order = [0, 1, 2, 3, 4];
        break;
      case 'alignment':
        // PO and Architect first for technical alignment
        order = [2, 4, 0, 1, 3];
        break;
      case 'resolution':
        // SM first for coordination, then others
        order = [3, 0, 2, 4, 1];
        break;
      case 'finalization':
        // PO first for final decisions
        order = [2, 0, 4, 3, 1];
        break;
    }

    // Add moderator if conflicts exist and not already included
    if (metrics.conflictingPositions.size > 0 && !order.includes(5)) {
      order.unshift(5);
    }

    return order;
  }

  /**
   * Generates fallback evaluation when consensus analysis completely fails
   */
  private generateFallbackEvaluation(
    turns: Turn[],
    config: DynamicRoundConfig,
    currentRound: number
  ): RoundEvaluationResult {
    log.debug('🔄 Generating complete fallback evaluation');

    const metrics = this.generateRuleBasedConsensus(turns);
    const shouldTerminate = currentRound >= config.maxRounds || 
                           (currentRound >= config.minRounds && metrics.agreementScore >= config.consensusThreshold);

    return {
      metrics,
      shouldTerminate,
      nextRoundFocus: ['Continue discussion to reach consensus'],
      recommendedOrder: [0, 1, 2, 3, 4], // Default order
    };
  }

  /**
   * Tracks decision evolution throughout the discussion
   * Used for enhanced output generation
   */
  async trackDecisionEvolution(
    turns: Turn[],
    previousEvolution: DecisionEvolution[],
    currentRound: number
  ): Promise<DecisionEvolution[]> {
    try {
      // For now, implement basic decision tracking
      // This could be enhanced with AI analysis of position changes
      const evolution: DecisionEvolution[] = [...previousEvolution];

      // Simple heuristic: track major topics mentioned in current round
      const currentContent = turns
        .filter(turn => turn.round === currentRound)
        .map(turn => turn.content)
        .join(' ');

      // Extract key topics (simple keyword-based approach)
      const topics = this.extractKeyTopics(currentContent);
      
      topics.forEach(topic => {
        const positions = new Map<string, string>();
        turns
          .filter(turn => turn.round === currentRound)
          .forEach(turn => {
            positions.set(turn.role, turn.content.substring(0, 100)); // First 100 chars as position
          });

        evolution.push({
          round: currentRound,
          topic,
          positions,
          agreementLevel: 70, // Placeholder - could be AI-calculated
          resolved: false, // Placeholder - could be AI-determined
        });
      });

      return evolution;
    } catch (error) {
      log.warn('🚨 Decision evolution tracking failed, returning previous state');
      return previousEvolution;
    }
  }

  /**
   * Simple keyword extraction for decision topics
   * Could be enhanced with NLP or AI analysis
   */
  private extractKeyTopics(content: string): string[] {
    const keywords = ['authentication', 'database', 'api', 'frontend', 'backend', 'security', 'performance'];
    const foundTopics = keywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    return foundTopics.length > 0 ? foundTopics : ['General implementation'];
  }
}