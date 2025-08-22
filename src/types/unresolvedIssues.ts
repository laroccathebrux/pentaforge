/**
 * Types for interactive unresolved issues resolution workflow
 * Supports structured decision-making when consensus cannot be reached
 */

/**
 * Represents a single unresolved issue that requires user input
 */
export interface UnresolvedIssue {
  /** Unique identifier for this issue */
  id: string;
  
  /** Human-readable title of the issue */
  title: string;
  
  /** Detailed context explaining why this issue remained unresolved */
  context: string;
  
  /** Array of persona positions on this issue */
  personaPositions: PersonaPosition[];
}

/**
 * Represents a single persona's position on an unresolved issue
 */
export interface PersonaPosition {
  /** Name of the persona (e.g., "BusinessAnalyst", "SolutionsArchitect") */
  personaName: string;
  
  /** The persona's specific position or recommendation */
  position: string;
  
  /** Detailed reasoning behind this position */
  reasoning: string;
  
  /** Confidence level in this position (0-100) */
  confidence?: number;
}

/**
 * Represents how a user resolved a specific issue
 */
export interface IssueResolution {
  /** ID of the issue being resolved */
  issueId: string;
  
  /** Type of resolution selected */
  selectedOption: 'persona' | 'indifferent' | 'custom';
  
  /** Name of persona whose position was selected (if selectedOption === 'persona') */
  personaName?: string;
  
  /** Custom resolution text (if selectedOption === 'custom') */
  customResolution?: string;
}

/**
 * Full structure of a resolved issues file including metadata
 */
export interface ResolvedIssuesFile {
  /** Unique identifier linking back to the original discussion */
  discussionId: string;
  
  /** Timestamp when the file was generated */
  timestamp: string;
  
  /** Total number of issues that needed resolution */
  totalIssues: number;
  
  /** Consensus threshold that was not met */
  consensusThreshold: number;
  
  /** Current status of the resolution process */
  status: 'pending' | 'resolved';
  
  /** All unresolved issues with their persona positions */
  issues: UnresolvedIssue[];
  
  /** User's resolutions for each issue (populated when parsed) */
  resolutions: IssueResolution[];
  
  /** Language of the original discussion for bilingual support */
  language: 'en' | 'pt-BR';
}

/**
 * Configuration for unresolved issues workflow behavior
 */
export interface UnresolvedIssuesConfig {
  /** Minimum number of unresolved issues to trigger interactive workflow */
  threshold: number;
  
  /** Whether to include custom resolution options */
  generateCustomOptions: boolean;
  
  /** Whether to include neutral "team decides" options */
  includeNeutralOptions: boolean;
  
  /** Maximum number of issues per file to prevent overwhelming complexity */
  maxIssuesPerFile: number;
}

/**
 * Validation result for user selections
 */
export interface ValidationResult {
  /** Whether all selections are valid */
  isValid: boolean;
  
  /** List of validation errors with helpful messages */
  errors: ValidationError[];
  
  /** Successfully parsed resolutions */
  resolutions: IssueResolution[];
}

/**
 * Detailed validation error information
 */
export interface ValidationError {
  /** ID of the issue with validation problems */
  issueId: string;
  
  /** Type of validation error */
  errorType: 'missing_selection' | 'multiple_selections' | 'missing_custom_input' | 'invalid_format';
  
  /** Human-readable error message */
  message: string;
  
  /** Suggested fix for the error */
  suggestion: string;
}

/**
 * Extended RoundtableInput interface with resolution workflow parameters
 */
export interface EnhancedRoundtableInput {
  /** Path to resolved UNRESOLVED_ISSUES.md file for final generation */
  unresolvedIssuesFile?: string;
  
  /** Threshold for unresolved issues before switching to interactive mode (default: 1) */
  unresolvedIssuesThreshold?: number;
  
  /** Configuration for unresolved issues workflow behavior */
  unresolvedIssuesConfig?: Partial<UnresolvedIssuesConfig>;
}

/**
 * Default configuration values for unresolved issues workflow
 */
export const DEFAULT_UNRESOLVED_ISSUES_CONFIG: UnresolvedIssuesConfig = {
  threshold: 1,
  generateCustomOptions: true,
  includeNeutralOptions: true,
  maxIssuesPerFile: 10,
};

/**
 * Helper function to validate issue ID format
 */
export function isValidIssueId(id: string): boolean {
  return /^issue_\d+$/.test(id);
}

/**
 * Helper function to generate a unique issue ID
 */
export function generateIssueId(index: number): string {
  return `issue_${index + 1}`;
}

/**
 * Helper function to categorize issues by complexity
 */
export function categorizeIssueComplexity(issue: UnresolvedIssue): 'simple' | 'moderate' | 'complex' {
  const positionCount = issue.personaPositions.length;
  
  if (positionCount <= 2) return 'simple';
  if (positionCount <= 4) return 'moderate';
  return 'complex';
}

/**
 * Helper function to extract unique personas from issues
 */
export function extractUniquePersonas(issues: UnresolvedIssue[]): string[] {
  const personaSet = new Set<string>();
  
  issues.forEach(issue => {
    issue.personaPositions.forEach(position => {
      personaSet.add(position.personaName);
    });
  });
  
  return Array.from(personaSet).sort();
}

/**
 * Helper function to check if all issues have been resolved
 */
export function areAllIssuesResolved(issues: UnresolvedIssue[], resolutions: IssueResolution[]): boolean {
  const resolvedIds = new Set(resolutions.map(r => r.issueId));
  return issues.every(issue => resolvedIds.has(issue.id));
}

/**
 * Helper function to validate resolution completeness
 */
export function validateResolutionCompleteness(
  issues: UnresolvedIssue[], 
  resolutions: IssueResolution[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const validResolutions: IssueResolution[] = [];
  
  // Create a map of resolutions by issue ID for easier lookup
  const resolutionMap = new Map<string, IssueResolution[]>();
  resolutions.forEach(resolution => {
    if (!resolutionMap.has(resolution.issueId)) {
      resolutionMap.set(resolution.issueId, []);
    }
    resolutionMap.get(resolution.issueId)!.push(resolution);
  });
  
  // Validate each issue
  issues.forEach(issue => {
    const issueResolutions = resolutionMap.get(issue.id) || [];
    
    if (issueResolutions.length === 0) {
      errors.push({
        issueId: issue.id,
        errorType: 'missing_selection',
        message: `No selection made for ${issue.title}`,
        suggestion: 'Please select exactly one option for this issue',
      });
    } else if (issueResolutions.length > 1) {
      errors.push({
        issueId: issue.id,
        errorType: 'multiple_selections',
        message: `Multiple selections found for ${issue.title}`,
        suggestion: 'Please select exactly one option for this issue',
      });
    } else {
      const resolution = issueResolutions[0];
      
      // Validate custom resolution has content
      if (resolution.selectedOption === 'custom' && (!resolution.customResolution || resolution.customResolution.trim() === '')) {
        errors.push({
          issueId: issue.id,
          errorType: 'missing_custom_input',
          message: `Custom resolution selected for ${issue.title} but no description provided`,
          suggestion: 'Please provide a description of your custom resolution',
        });
      } else {
        validResolutions.push(resolution);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    resolutions: validResolutions,
  };
}