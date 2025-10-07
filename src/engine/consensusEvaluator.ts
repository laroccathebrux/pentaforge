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
import { PersonaPosition } from '../types/unresolvedIssues.js';

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
  * 0-40%: Initial exploration, many divergent views
  * 40-60%: Some alignment emerging, but significant gaps remain
  * 60-80%: Good alignment on major points, minor details to resolve
  * 80-100%: Strong consensus, ready to conclude
- Unresolved issues: Topics needing more exploration or clarification
- Conflicts: Direct disagreements or contradictory positions between roles
- Confidence: Your certainty in the consensus assessment
- Phase: Current stage of discussion progression

IMPORTANT SCORING GUIDELINES:
- Be CONSERVATIVE with agreement scores for complex topics (e.g., full e-commerce system, authentication architecture)
- Complex projects should rarely exceed 60% agreement in early rounds
- Only assign 80%+ when there's EXPLICIT agreement and specific technical decisions are documented
- If participants are still exploring options or haven't addressed all aspects, score should be ≤ 50%
- Look for CONCRETE decisions, not just general statements

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
    const currentRound = turns.length > 0 ? Math.max(...turns.map(t => t.round)) : 1;

    // More conservative scoring for complex discussions
    // Base score starts low and increases gradually
    let agreementScore = 20; // Start conservative

    // Factor 1: Participation coverage (max +20)
    const participationBonus = Math.min(20, (uniqueRoles.size / 8) * 20);
    agreementScore += participationBonus;

    // Factor 2: Discussion depth (max +15)
    // More turns suggest deeper exploration, but don't immediately mean consensus
    const depthBonus = Math.min(15, (totalTurns / 24) * 15);
    agreementScore += depthBonus;

    // Factor 3: Round progression penalty
    // Early rounds should have lower scores
    if (currentRound <= 2) {
      agreementScore = Math.min(agreementScore, 45); // Cap at 45% for first 2 rounds
    } else if (currentRound <= 4) {
      agreementScore = Math.min(agreementScore, 65); // Cap at 65% for rounds 3-4
    }

    // Extract potential issues from short responses (likely indicating concerns)
    const shortResponses = turns.filter(turn => turn.content.split(' ').length < 30);
    const unresolvedIssues: string[] = [];

    if (shortResponses.length > 2) {
      unresolvedIssues.push('Implementation details need clarification');
    }

    // Always add issues for early rounds
    if (currentRound <= 2) {
      unresolvedIssues.push('Technical approach requires more discussion');
      unresolvedIssues.push('Architecture decisions need consensus');
    }

    // Basic conflict detection - look for negative sentiment words
    const conflictIndicators = ['however', 'but', 'concern', 'issue', 'problem', 'disagree', 'alternatively', 'instead'];
    const conflictingPositions = new Map<string, string[]>();

    turns.forEach(turn => {
      const hasConflictIndicators = conflictIndicators.some(indicator =>
        turn.content.toLowerCase().includes(indicator)
      );
      if (hasConflictIndicators) {
        conflictingPositions.set(turn.role, ['Concerns raised about approach']);
      }
    });

    // Determine phase more conservatively
    let discussionPhase: 'exploration' | 'alignment' | 'resolution' | 'finalization' = 'exploration';
    if (currentRound > 5 && agreementScore > 70) {
      discussionPhase = 'finalization';
    } else if (currentRound > 3 && agreementScore > 55) {
      discussionPhase = 'resolution';
    } else if (currentRound > 1 && agreementScore > 35) {
      discussionPhase = 'alignment';
    }

    log.debug(`📊 Rule-based evaluation: round=${currentRound}, agreement=${agreementScore}%, issues=${unresolvedIssues.length}, conflicts=${conflictingPositions.size}`);

    return {
      agreementScore: Math.floor(agreementScore),
      unresolvedIssues,
      conflictingPositions,
      confidenceLevel: 50, // Lower confidence for rule-based evaluation
      discussionPhase,
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

  /**
   * Extracts detailed persona positions for unresolved issues
   * Maps specific issues to persona positions with reasoning
   */
  extractPersonaPositions(turns: Turn[]): Map<string, PersonaPosition[]> {
    const personaPositionsMap = new Map<string, PersonaPosition[]>();
    
    try {
      log.debug('🔍 Extracting persona positions from discussion turns');
      
      // Group turns by persona for analysis
      const turnsByPersona = new Map<string, Turn[]>();
      turns.forEach(turn => {
        if (!turnsByPersona.has(turn.role)) {
          turnsByPersona.set(turn.role, []);
        }
        turnsByPersona.get(turn.role)!.push(turn);
      });
      
      // Extract issues from the turns
      const detectedIssues = this.detectIssuesFromTurns(turns);
      
      // For each detected issue, find persona positions
      detectedIssues.forEach(issue => {
        const positions: PersonaPosition[] = [];
        
        turnsByPersona.forEach((personaTurns, personaName) => {
          const relevantTurns = personaTurns.filter(turn => 
            this.isRelevantToIssue(turn.content, issue)
          );
          
          if (relevantTurns.length > 0) {
            const position = this.extractPositionFromTurns(relevantTurns, issue);
            if (position) {
              positions.push({
                personaName: personaName.replace(/\s+/g, ''),
                position: position.position,
                reasoning: position.reasoning,
                confidence: position.confidence,
              });
            }
          }
        });
        
        if (positions.length > 0) {
          personaPositionsMap.set(issue, positions);
        }
      });
      
      log.debug(`✅ Extracted ${personaPositionsMap.size} issues with persona positions`);
      return personaPositionsMap;
      
    } catch (error) {
      log.warn(`🚨 Failed to extract persona positions: ${error}`);
      return new Map();
    }
  }
  
  /**
   * Detects key issues from discussion turns
   */
  private detectIssuesFromTurns(turns: Turn[]): string[] {
    const issues: string[] = [];
    const content = turns.map(turn => turn.content).join(' ').toLowerCase();
    
    // Technical decision patterns
    const technicalPatterns = [
      { keywords: ['auth', 'authentication', 'login'], issue: 'Authentication approach' },
      { keywords: ['database', 'db', 'storage', 'persistence'], issue: 'Data storage strategy' },
      { keywords: ['api', 'endpoint', 'service'], issue: 'API design approach' },
      { keywords: ['frontend', 'ui', 'interface'], issue: 'User interface approach' },
      { keywords: ['deploy', 'deployment', 'hosting'], issue: 'Deployment strategy' },
      { keywords: ['test', 'testing', 'qa'], issue: 'Testing approach' },
      { keywords: ['security', 'secure', 'protect'], issue: 'Security implementation' },
      { keywords: ['performance', 'scale', 'optimize'], issue: 'Performance optimization' },
    ];
    
    // Check for pattern matches
    technicalPatterns.forEach(pattern => {
      const matches = pattern.keywords.some(keyword => content.includes(keyword));
      if (matches) {
        issues.push(pattern.issue);
      }
    });
    
    // Detect disagreement indicators
    const disagreementIndicators = ['however', 'but', 'concern', 'issue', 'problem', 'disagree', 'instead', 'alternatively'];
    const hasDisagreement = disagreementIndicators.some(indicator => content.includes(indicator));
    
    if (hasDisagreement && issues.length === 0) {
      issues.push('Technical approach disagreement');
    }
    
    // Fallback if no specific issues detected
    if (issues.length === 0) {
      issues.push('Implementation details');
    }
    
    return issues.slice(0, 5); // Limit to 5 main issues
  }
  
  /**
   * Checks if a turn content is relevant to a specific issue
   */
  private isRelevantToIssue(content: string, issue: string): boolean {
    const contentLower = content.toLowerCase();
    const issueLower = issue.toLowerCase();
    
    // Direct keyword matching
    const issueKeywords = issueLower.split(' ');
    const directMatch = issueKeywords.some(keyword => 
      keyword.length > 3 && contentLower.includes(keyword)
    );
    
    if (directMatch) return true;
    
    // Semantic similarity for common technical terms
    const semanticMatches: Record<string, string[]> = {
      'authentication': ['login', 'auth', 'user', 'security', 'credential'],
      'database': ['data', 'storage', 'persist', 'query', 'table'],
      'api': ['service', 'endpoint', 'rest', 'request', 'response'],
      'interface': ['ui', 'frontend', 'view', 'component', 'design'],
      'deployment': ['host', 'server', 'cloud', 'deploy', 'infrastructure'],
    };
    
    for (const [concept, keywords] of Object.entries(semanticMatches)) {
      if (issueLower.includes(concept)) {
        const semanticMatch = keywords.some(keyword => contentLower.includes(keyword));
        if (semanticMatch) return true;
      }
    }
    
    return false;
  }
  
  /**
   * Extracts position and reasoning from persona turns
   */
  private extractPositionFromTurns(turns: Turn[], _issue: string): {
    position: string;
    reasoning: string;
    confidence: number;
  } | null {
    if (turns.length === 0) return null;
    
    // Use the most recent, comprehensive turn
    const primaryTurn = turns.reduce((prev, current) => 
      current.content.length > prev.content.length ? current : prev
    );
    
    const content = primaryTurn.content;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Extract position (look for recommendation/suggestion patterns)
    const positionIndicators = [
      'recommend', 'suggest', 'should', 'propose', 'prefer', 
      'think', 'believe', 'approach', 'solution', 'implement'
    ];
    
    let position = '';
    let reasoning = '';
    
    // Find position sentences
    const positionSentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return positionIndicators.some(indicator => lower.includes(indicator));
    });
    
    if (positionSentences.length > 0) {
      position = positionSentences[0].trim();
    } else {
      // Fallback: use first substantial sentence
      const substantialSentences = sentences.filter(s => s.trim().length > 20);
      position = substantialSentences.length > 0 
        ? substantialSentences[0].trim() 
        : content.substring(0, 100).trim() + '...';
    }
    
    // Extract reasoning (look for explanation patterns)
    const reasoningIndicators = [
      'because', 'since', 'due to', 'given that', 'considering', 
      'as', 'for', 'this will', 'this ensures', 'this provides'
    ];
    
    const reasoningSentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return reasoningIndicators.some(indicator => lower.includes(indicator));
    });
    
    if (reasoningSentences.length > 0) {
      reasoning = reasoningSentences[0].trim();
    } else {
      // Fallback: use different section of content
      if (sentences.length > 1) {
        reasoning = sentences[Math.min(1, sentences.length - 1)].trim();
      } else {
        reasoning = 'Based on discussion context and persona expertise.';
      }
    }
    
    // Calculate confidence based on content quality
    let confidence = 75; // Base confidence
    
    if (content.length > 200) confidence += 10; // Comprehensive response
    if (positionSentences.length > 0) confidence += 10; // Clear position
    if (reasoningSentences.length > 0) confidence += 5; // Clear reasoning
    
    confidence = Math.min(95, confidence); // Cap at 95%
    
    return {
      position: position.replace(/^[,\s]+|[,\s]+$/g, ''), // Clean whitespace
      reasoning: reasoning.replace(/^[,\s]+|[,\s]+$/g, ''), // Clean whitespace
      confidence,
    };
  }
}