/**
 * Consensus tracking and dynamic round management types for PentaForge
 * These interfaces support the AI-driven consensus detection and adaptive discussion system
 */

import { Discussion, DiscussionConfig } from '../engine/discussion.js';

/**
 * Consensus metrics calculated by AI evaluation
 * Based on research: 0-100 scale using variance-convergence detection
 */
export interface ConsensusMetrics {
  /** Agreement score on 0-100 scale based on variance-convergence detection */
  agreementScore: number;
  
  /** List of issues that still require discussion or resolution */
  unresolvedIssues: string[];
  
  /** Map of conflicting positions: persona role -> conflicting viewpoints */
  conflictingPositions: Map<string, string[]>;
  
  /** AI confidence level in the consensus assessment (0-100) */
  confidenceLevel: number;
  
  /** Current phase of the discussion for adaptive guidance */
  discussionPhase: 'exploration' | 'alignment' | 'resolution' | 'finalization';
}

/**
 * Configuration for dynamic round behavior
 * Maintains backward compatibility with fixed-round mode
 */
export interface DynamicRoundConfig {
  /** Enable dynamic rounds vs fixed 3-round mode */
  enabled: boolean;
  
  /** Minimum rounds required before consensus evaluation (default: 2) */
  minRounds: number;
  
  /** Maximum rounds allowed to prevent infinite discussions (default: 10) */
  maxRounds: number;
  
  /** Required agreement percentage to reach consensus (default: 85) */
  consensusThreshold: number;
  
  /** Maximum number of unresolved conflicts tolerated (default: 15) */
  conflictTolerance: number;
  
  /** Include AI moderator in discussion rounds */
  moderatorEnabled: boolean;
}

/**
 * Enhanced discussion configuration supporting dynamic rounds
 * Extends the base DiscussionConfig with consensus capabilities
 */
export interface EnhancedDiscussionConfig extends DiscussionConfig {
  /** Dynamic round configuration (optional - defaults to fixed mode) */
  dynamicRounds?: DynamicRoundConfig;
}

/**
 * Enhanced discussion state with consensus tracking
 * Extends the base Discussion with consensus history and decision evolution
 */
export interface EnhancedDiscussion extends Discussion {
  /** Consensus metrics history for each round evaluation */
  consensusHistory: ConsensusMetrics[];
  
  /** Evolution of decisions throughout the discussion */
  decisionEvolution: DecisionEvolution[];
  
  /** Current round number in the discussion */
  currentRound: number;
  
  /** Whether consensus has been reached based on threshold */
  consensusReached: boolean;
  
  /** Configuration used for this discussion */
  config: EnhancedDiscussionConfig;
}

/**
 * Tracks how decisions evolved during the discussion
 * Provides insight into consensus-building process
 */
export interface DecisionEvolution {
  /** The round number when this decision state was recorded */
  round: number;
  
  /** The decision or topic being tracked */
  topic: string;
  
  /** Positions held by different personas on this topic */
  positions: Map<string, string>;
  
  /** Level of agreement on this topic (0-100) */
  agreementLevel: number;
  
  /** Whether this topic was resolved in this round */
  resolved: boolean;
}

/**
 * Result of a round evaluation by the consensus system
 * Used to determine whether to continue or terminate discussion
 */
export interface RoundEvaluationResult {
  /** Consensus metrics for this round */
  metrics: ConsensusMetrics;
  
  /** Whether consensus threshold has been met */
  shouldTerminate: boolean;
  
  /** Suggested focus areas for next round (if continuing) */
  nextRoundFocus: string[];
  
  /** Recommended persona ordering for next round */
  recommendedOrder: number[];
}

/**
 * Default configuration values for dynamic rounds
 * Provides sensible defaults while allowing customization
 */
export const DEFAULT_DYNAMIC_CONFIG: DynamicRoundConfig = {
  enabled: false,  // Backward compatibility - require explicit opt-in
  minRounds: 2,
  maxRounds: 10,
  consensusThreshold: 85,
  conflictTolerance: 15,
  moderatorEnabled: true,
};

/**
 * Helper function to create enhanced discussion config with defaults
 */
export function createEnhancedConfig(
  baseConfig: DiscussionConfig, 
  dynamicConfig?: Partial<DynamicRoundConfig>
): EnhancedDiscussionConfig {
  const enhancedConfig: EnhancedDiscussionConfig = {
    ...baseConfig,
  };

  if (dynamicConfig) {
    enhancedConfig.dynamicRounds = {
      ...DEFAULT_DYNAMIC_CONFIG,
      ...dynamicConfig,
      enabled: true, // If any dynamic config is provided, enable it
    };
  }

  return enhancedConfig;
}

/**
 * Helper function to check if discussion is using dynamic rounds
 */
export function isDynamicRoundsEnabled(config: EnhancedDiscussionConfig): boolean {
  return config.dynamicRounds?.enabled === true;
}

/**
 * Helper function to get consensus threshold from config
 */
export function getConsensusThreshold(config: EnhancedDiscussionConfig): number {
  return config.dynamicRounds?.consensusThreshold ?? DEFAULT_DYNAMIC_CONFIG.consensusThreshold;
}

/**
 * Helper function to check if max rounds reached
 */
export function isMaxRoundsReached(currentRound: number, config: EnhancedDiscussionConfig): boolean {
  const maxRounds = config.dynamicRounds?.maxRounds ?? DEFAULT_DYNAMIC_CONFIG.maxRounds;
  return currentRound >= maxRounds;
}

/**
 * Helper function to check if minimum rounds completed
 */
export function isMinRoundsCompleted(currentRound: number, config: EnhancedDiscussionConfig): boolean {
  const minRounds = config.dynamicRounds?.minRounds ?? DEFAULT_DYNAMIC_CONFIG.minRounds;
  return currentRound >= minRounds;
}