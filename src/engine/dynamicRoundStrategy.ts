/**
 * Dynamic round generation strategy for adaptive consensus-driven discussions
 * Manages persona ordering, termination conditions, and context optimization
 */

import { log } from '../lib/log.js';
import {
  ConsensusMetrics,
  DynamicRoundConfig,
  EnhancedDiscussionConfig,
  isMaxRoundsReached,
  isMinRoundsCompleted,
  getConsensusThreshold,
} from '../types/consensus.js';

/**
 * Persona indices for dynamic ordering
 * 0: BusinessAnalyst, 1: KeyUser, 2: ProductOwner, 3: ScrumMaster, 4: SolutionsArchitect, 5: AIModerator
 */
const PERSONA_INDICES = {
  BUSINESS_ANALYST: 0,
  KEY_USER: 1,
  PRODUCT_OWNER: 2,
  SCRUM_MASTER: 3,
  SOLUTIONS_ARCHITECT: 4,
  AI_MODERATOR: 5,
} as const;

/**
 * Default round orders for different discussion phases
 */
const PHASE_ORDERS = {
  exploration: [0, 1, 2, 3, 4], // BA, User, PO, SM, Architect
  alignment: [2, 4, 0, 1, 3],   // PO, Architect, BA, User, SM
  resolution: [3, 0, 2, 4, 1],  // SM, BA, PO, Architect, User
  finalization: [2, 0, 4, 3, 1], // PO, BA, Architect, SM, User
} as const;

export class DynamicRoundStrategy {
  /**
   * Generates the next round order based on consensus metrics and discussion state
   */
  generateNextRound(
    currentRound: number,
    consensusMetrics: ConsensusMetrics,
    config: DynamicRoundConfig,
    previousOrders: number[][] = []
  ): number[] {
    log.debug(`🎯 Generating round ${currentRound + 1} order based on consensus metrics`);
    
    // Start with phase-appropriate base order
    let order = this.getPhaseBasedOrder(consensusMetrics.discussionPhase);
    
    // Add moderator if conflicts exist or needed for consensus evaluation
    if (this.shouldIncludeModerator(consensusMetrics, config, currentRound)) {
      order = this.addModeratorToOrder(order, consensusMetrics);
    }
    
    // Optimize order based on unresolved issues
    order = this.optimizeOrderForIssues(order, consensusMetrics);
    
    // Ensure variety to prevent repetitive patterns
    order = this.ensureOrderVariety(order, previousOrders);
    
    log.debug(`✅ Generated order for round ${currentRound + 1}: [${order.join(', ')}]`);
    return order;
  }

  /**
   * Determines if discussion should terminate based on consensus and configuration
   */
  shouldTerminateDiscussion(
    currentRound: number,
    consensusMetrics: ConsensusMetrics,
    config: EnhancedDiscussionConfig
  ): boolean {
    const dynamicConfig = config.dynamicRounds;
    if (!dynamicConfig) return false;

    // Hard stop at max rounds
    if (isMaxRoundsReached(currentRound, config)) {
      log.info(`🛑 Max rounds (${dynamicConfig.maxRounds}) reached - forcing termination`);
      return true;
    }

    // Don't terminate before minimum rounds
    if (!isMinRoundsCompleted(currentRound, config)) {
      log.debug(`⏳ Minimum rounds (${dynamicConfig.minRounds}) not completed yet`);
      return false;
    }

    // Check consensus criteria
    const threshold = getConsensusThreshold(config);
    const consensusReached = consensusMetrics.agreementScore >= threshold;
    const conflictsResolved = consensusMetrics.conflictingPositions.size === 0;
    const issuesResolved = consensusMetrics.unresolvedIssues.length <= dynamicConfig.conflictTolerance;

    const shouldTerminate = consensusReached && conflictsResolved && issuesResolved;
    
    log.debug(`🎯 Termination check (round ${currentRound}): consensus=${consensusReached} (${consensusMetrics.agreementScore}%>=${threshold}%), conflicts=${conflictsResolved}, issues=${issuesResolved} -> ${shouldTerminate}`);
    
    return shouldTerminate;
  }

  /**
   * Implements progressive context summarization to manage token usage
   */
  optimizeContext(
    currentRound: number
  ): { shouldSummarize: boolean; contextStrategy: string } {
    // Start summarizing after round 5 to manage token usage
    const shouldSummarize = currentRound > 5;
    
    let contextStrategy = 'full';
    
    if (currentRound > 8) {
      contextStrategy = 'aggressive_summary'; // Keep only key decisions and recent turns
    } else if (currentRound > 5) {
      contextStrategy = 'progressive_summary'; // Summarize early rounds, keep recent ones
    }

    if (shouldSummarize) {
      log.debug(`🔄 Context optimization: round ${currentRound}, strategy=${contextStrategy}`);
    }

    return { shouldSummarize, contextStrategy };
  }

  /**
   * Estimates token usage increase for dynamic rounds
   * Used for performance monitoring and validation
   */
  estimateTokenUsage(
    currentRound: number,
    averageResponseLength: number,
    baselineTokens: number
  ): { currentEstimate: number; increasePercentage: number } {
    // Rough estimation: each round adds ~5 personas * response length
    const dynamicTokens = currentRound * 5 * averageResponseLength * 1.3; // 1.3 factor for overhead
    const currentEstimate = baselineTokens + dynamicTokens;
    const increasePercentage = ((currentEstimate - baselineTokens) / baselineTokens) * 100;

    return { currentEstimate, increasePercentage };
  }

  /**
   * Gets base order for discussion phase
   */
  private getPhaseBasedOrder(phase: ConsensusMetrics['discussionPhase']): number[] {
    return [...PHASE_ORDERS[phase]]; // Clone to avoid mutation
  }

  /**
   * Determines if moderator should be included in this round
   */
  private shouldIncludeModerator(
    metrics: ConsensusMetrics,
    config: DynamicRoundConfig,
    currentRound: number
  ): boolean {
    if (!config.moderatorEnabled) return false;

    // Always include moderator if conflicts exist
    if (metrics.conflictingPositions.size > 0) {
      log.debug(`🤝 Including moderator due to ${metrics.conflictingPositions.size} conflicts`);
      return true;
    }

    // Include moderator for consensus evaluation every 2-3 rounds
    if (currentRound > 0 && currentRound % 3 === 0) {
      log.debug(`🤝 Including moderator for periodic consensus evaluation`);
      return true;
    }

    // Include if agreement score is borderline (within 10% of threshold)
    const threshold = config.consensusThreshold;
    const isNearThreshold = Math.abs(metrics.agreementScore - threshold) <= 10;
    if (isNearThreshold) {
      log.debug(`🤝 Including moderator due to borderline consensus (${metrics.agreementScore}% near ${threshold}%)`);
      return true;
    }

    return false;
  }

  /**
   * Adds moderator to order in optimal position
   */
  private addModeratorToOrder(order: number[], metrics: ConsensusMetrics): number[] {
    // If high conflicts, moderator goes first
    if (metrics.conflictingPositions.size > 2) {
      return [PERSONA_INDICES.AI_MODERATOR, ...order];
    }

    // If low agreement, moderator goes in middle for guidance
    if (metrics.agreementScore < 60) {
      const midPoint = Math.floor(order.length / 2);
      order.splice(midPoint, 0, PERSONA_INDICES.AI_MODERATOR);
      return order;
    }

    // Default: moderator at end for consensus evaluation
    return [...order, PERSONA_INDICES.AI_MODERATOR];
  }

  /**
   * Optimizes order based on unresolved issues
   */
  private optimizeOrderForIssues(order: number[], metrics: ConsensusMetrics): number[] {
    const issues = metrics.unresolvedIssues;
    if (issues.length === 0) return order;

    // Simple heuristic: prioritize personas based on issue types
    const priorityMap = new Map<number, number>();
    
    issues.forEach(issue => {
      const issueLower = issue.toLowerCase();
      
      if (issueLower.includes('requirement') || issueLower.includes('business')) {
        priorityMap.set(PERSONA_INDICES.BUSINESS_ANALYST, (priorityMap.get(PERSONA_INDICES.BUSINESS_ANALYST) || 0) + 1);
      }
      if (issueLower.includes('user') || issueLower.includes('interface') || issueLower.includes('ux')) {
        priorityMap.set(PERSONA_INDICES.KEY_USER, (priorityMap.get(PERSONA_INDICES.KEY_USER) || 0) + 1);
      }
      if (issueLower.includes('priority') || issueLower.includes('scope') || issueLower.includes('decision')) {
        priorityMap.set(PERSONA_INDICES.PRODUCT_OWNER, (priorityMap.get(PERSONA_INDICES.PRODUCT_OWNER) || 0) + 1);
      }
      if (issueLower.includes('delivery') || issueLower.includes('timeline') || issueLower.includes('process')) {
        priorityMap.set(PERSONA_INDICES.SCRUM_MASTER, (priorityMap.get(PERSONA_INDICES.SCRUM_MASTER) || 0) + 1);
      }
      if (issueLower.includes('technical') || issueLower.includes('architecture') || issueLower.includes('implementation')) {
        priorityMap.set(PERSONA_INDICES.SOLUTIONS_ARCHITECT, (priorityMap.get(PERSONA_INDICES.SOLUTIONS_ARCHITECT) || 0) + 1);
      }
    });

    // Re-sort order based on priority scores
    if (priorityMap.size > 0) {
      const moderatorIndex = order.indexOf(PERSONA_INDICES.AI_MODERATOR);
      const corePersonas = order.filter(idx => idx !== PERSONA_INDICES.AI_MODERATOR);
      
      corePersonas.sort((a, b) => (priorityMap.get(b) || 0) - (priorityMap.get(a) || 0));
      
      // Re-insert moderator in same relative position
      if (moderatorIndex !== -1) {
        if (moderatorIndex === 0) {
          return [PERSONA_INDICES.AI_MODERATOR, ...corePersonas];
        } else if (moderatorIndex === order.length - 1) {
          return [...corePersonas, PERSONA_INDICES.AI_MODERATOR];
        } else {
          const midPoint = Math.floor(corePersonas.length / 2);
          corePersonas.splice(midPoint, 0, PERSONA_INDICES.AI_MODERATOR);
          return corePersonas;
        }
      }
      
      return corePersonas;
    }

    return order;
  }

  /**
   * Ensures variety in round orders to prevent repetitive patterns
   */
  private ensureOrderVariety(order: number[], previousOrders: number[][]): number[] {
    if (previousOrders.length === 0) return order;

    const lastOrder = previousOrders[previousOrders.length - 1];
    
    // If identical to last order, introduce variation
    if (this.ordersAreIdentical(order, lastOrder)) {
      log.debug('🔄 Introducing order variation to prevent repetition');
      
      // Simple swap: exchange positions of first two core personas (excluding moderator)
      const coreIndices = order.filter(idx => idx !== PERSONA_INDICES.AI_MODERATOR);
      if (coreIndices.length >= 2) {
        const temp = coreIndices[0];
        coreIndices[0] = coreIndices[1];
        coreIndices[1] = temp;
        
        // Rebuild order with moderator in same position
        const moderatorPos = order.indexOf(PERSONA_INDICES.AI_MODERATOR);
        if (moderatorPos === -1) {
          return coreIndices;
        } else {
          const newOrder = [...coreIndices];
          newOrder.splice(moderatorPos, 0, PERSONA_INDICES.AI_MODERATOR);
          return newOrder;
        }
      }
    }

    return order;
  }

  /**
   * Checks if two orders are identical
   */
  private ordersAreIdentical(order1: number[], order2: number[]): boolean {
    if (order1.length !== order2.length) return false;
    return order1.every((value, index) => value === order2[index]);
  }

  /**
   * Generates fallback order when strategy fails
   */
  getFallbackOrder(includesModerator: boolean = false): number[] {
    const baseOrder = [0, 1, 2, 3, 4]; // Default fixed order
    return includesModerator ? [...baseOrder, 5] : baseOrder;
  }

  /**
   * Validates that generated order is valid
   */
  validateOrder(order: number[]): boolean {
    // Check for valid persona indices (0-5)
    const validIndices = order.every(idx => idx >= 0 && idx <= 5);
    // Check for no duplicates
    const noDuplicates = new Set(order).size === order.length;
    // Check for reasonable length (3-6 personas)
    const reasonableLength = order.length >= 3 && order.length <= 6;
    
    return validIndices && noDuplicates && reasonableLength;
  }
}