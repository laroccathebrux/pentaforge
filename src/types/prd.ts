/**
 * Product Requirements Document (PRD) type definitions for PentaForge
 * Industry-standard PRD structure supporting bilingual generation (English/Portuguese)
 */

// Language type definition
export type Language = 'en' | 'pt' | 'pt-BR';

/**
 * Complete PRD document structure following industry standards
 * Based on ProductSchool, Atlassian, and Aha! PRD templates
 */
export interface PRDDocument {
  readonly metadata: PRDMetadata;
  overview: PRDOverview;
  scope: PRDScope;
  functionalRequirements: FunctionalRequirement[];
  nonFunctionalRequirements: NonFunctionalRequirements;
  userJourney: UserJourneyStep[];
  acceptanceCriteria: AcceptanceCriterion[];
  stakeholders: Stakeholder[];
  /** Consensus data when using dynamic rounds */
  consensusData?: PRDConsensusData;
}

/**
 * PRD document metadata and generation information
 */
export interface PRDMetadata {
  readonly id: string;
  readonly title: string;
  readonly createdAt: Date;
  readonly language: Language;
  readonly version: string;
  readonly author: string;
  tags: string[];
  consensusScore?: number;
  discussionRounds?: number;
  generationMethod: 'persona' | 'ai' | 'fallback';
}

/**
 * Overview section containing problem statement and objectives
 * Primarily extracted from BusinessAnalyst and ProductOwner personas
 */
export interface PRDOverview {
  problemStatement: string;
  objectives: string[];
  businessContext?: string;
  targetAudience?: string;
  successMetrics?: SuccessMetric[];
}

/**
 * Project scope definition with included/excluded features
 * Extracted from ScrumMaster, ProductOwner, and SolutionsArchitect personas
 */
export interface PRDScope {
  included: ScopeItem[];
  excluded: ScopeItem[];
  assumptions?: string[];
  constraints?: string[];
  dependencies?: string[];
}

/**
 * Individual scope item with justification
 */
export interface ScopeItem {
  title: string;
  description: string;
  rationale?: string;
  priority?: Priority;
  source?: PersonaRole;
}

/**
 * Success metrics for measuring project outcomes
 */
export interface SuccessMetric {
  metric: string;
  target: string;
  timeframe?: string;
  measurement: string;
}

/**
 * Functional requirement with unique identifier and acceptance criteria
 * Extracted from BusinessAnalyst, KeyUser, and ProductOwner personas
 */
export interface FunctionalRequirement {
  readonly id: string; // FR001, FR002, etc.
  title: string;
  description: string;
  priority: Priority;
  category: RequirementCategory;
  acceptanceCriteria: string[];
  businessValue: string;
  dependencies?: string[];
  risks?: string[];
  source?: PersonaRole[];
}

/**
 * Non-functional requirements organized by category
 * Primarily extracted from SolutionsArchitect persona
 */
export interface NonFunctionalRequirements {
  performance: NFRItem[];
  security: NFRItem[];
  scalability: NFRItem[];
  usability: NFRItem[];
  reliability?: NFRItem[];
  compliance?: NFRItem[];
  maintainability?: NFRItem[];
}

/**
 * Individual non-functional requirement item
 */
export interface NFRItem {
  requirement: string;
  metric?: string;
  rationale: string;
  priority: Priority;
  testable: boolean;
  source?: PersonaRole;
}

/**
 * User journey step-by-step workflow
 * Extracted from KeyUser and UXUIDesigner personas
 */
export interface UserJourneyStep {
  step: number;
  actor: ActorType;
  action: string;
  systemResponse: string;
  outcome: string;
  alternatives?: string[];
  errorHandling?: string;
  duration?: string;
}

/**
 * Testable acceptance criterion in Given-When-Then format
 * Extracted from BusinessAnalyst and KeyUser personas
 */
export interface AcceptanceCriterion {
  readonly id: string; // AC001, AC002, etc.
  feature: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
  priority: Priority;
  testable: boolean;
  source?: PersonaRole;
}

/**
 * Project stakeholder with influence and interest levels
 * Extracted from BusinessStakeholder and ProductOwner personas
 */
export interface Stakeholder {
  role: string;
  type: StakeholderType;
  responsibilities: string[];
  concerns: string[];
  influence: InfluenceLevel;
  interest: InterestLevel;
  contactInfo?: string;
  decisionAuthority: boolean;
}

/**
 * Consensus data from dynamic rounds integration
 */
export interface PRDConsensusData {
  finalConsensusScore: number;
  totalRounds: number;
  keyDecisions: string[];
  unresolvedItems: string[];
  conflictResolutions: string[];
  consensusEvolution: number[];
}

/**
 * Configuration for PRD generation
 */
export interface PRDGenerationConfig {
  outputFormat: 'PRD' | 'REQUEST';
  template: PRDTemplate;
  language: Language;
  includeConsensusMetrics: boolean;
  validationLevel: ValidationLevel;
  fallbackBehavior: FallbackBehavior;
  sectionPriority: PRDSectionType[];
}

// Enums for type safety and standardization

/**
 * Priority levels following industry standards
 */
export enum Priority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

/**
 * Requirement categories for functional requirements
 */
export enum RequirementCategory {
  AUTHENTICATION = 'Authentication',
  AUTHORIZATION = 'Authorization',
  DATA_MANAGEMENT = 'Data Management',
  INTEGRATION = 'Integration',
  UI_UX = 'UI/UX',
  SECURITY = 'Security',
  PERFORMANCE = 'Performance',
  MONITORING = 'Monitoring',
  WORKFLOW = 'Workflow',
  REPORTING = 'Reporting',
  CONFIGURATION = 'Configuration'
}

/**
 * Actor types for user journey steps
 */
export enum ActorType {
  END_USER = 'End User',
  ADMIN = 'Admin',
  SYSTEM = 'System',
  EXTERNAL_SERVICE = 'External Service',
  GUEST = 'Guest',
  API_CLIENT = 'API Client'
}

/**
 * Stakeholder classification
 */
export enum StakeholderType {
  PRIMARY = 'Primary',
  SECONDARY = 'Secondary',
  KEY_DECISION_MAKER = 'Key Decision Maker'
}

/**
 * Influence levels for stakeholder analysis
 */
export enum InfluenceLevel {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

/**
 * Interest levels for stakeholder analysis
 */
export enum InterestLevel {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

/**
 * PRD template variants
 */
export enum PRDTemplate {
  STANDARD = 'standard',    // Full 7-section PRD
  MINIMAL = 'minimal',      // Overview + Requirements + Acceptance Criteria only
  ENTERPRISE = 'enterprise' // Extended with compliance and governance sections
}

/**
 * Validation levels for PRD content
 */
export enum ValidationLevel {
  BASIC = 'basic',           // Required fields only
  COMPREHENSIVE = 'comprehensive' // Full content validation
}

/**
 * Fallback behavior when content extraction fails
 */
export enum FallbackBehavior {
  TEMPLATE = 'template',     // Use hardcoded templates
  ERROR = 'error',          // Throw error and abort
  MINIMAL = 'minimal'       // Generate minimal content
}

/**
 * PRD section types for content mapping
 */
export type PRDSectionType = 
  | 'overview' 
  | 'scope' 
  | 'functional-requirements'
  | 'non-functional-requirements'
  | 'user-journey'
  | 'acceptance-criteria'
  | 'stakeholders';

/**
 * Persona roles from PentaForge discussion system
 */
export type PersonaRole = 
  | 'BusinessAnalyst'
  | 'KeyUser'
  | 'ProductOwner'
  | 'SolutionsArchitect'
  | 'UXUIDesigner'
  | 'ScrumMaster'
  | 'SupportRepresentative'
  | 'BusinessStakeholder'
  | 'AIModerator';

/**
 * Persona-to-PRD section mapping for content extraction
 */
export const PERSONA_PRD_MAPPING: Record<PersonaRole, PRDSectionType[]> = {
  'BusinessAnalyst': ['overview', 'scope', 'functional-requirements', 'acceptance-criteria'],
  'KeyUser': ['user-journey', 'acceptance-criteria', 'functional-requirements'],
  'ProductOwner': ['overview', 'stakeholders', 'scope'],
  'SolutionsArchitect': ['non-functional-requirements', 'scope'],
  'UXUIDesigner': ['user-journey', 'non-functional-requirements'],
  'ScrumMaster': ['scope', 'stakeholders'],
  'SupportRepresentative': ['non-functional-requirements', 'stakeholders'],
  'BusinessStakeholder': ['stakeholders', 'overview'],
  'AIModerator': [] // Moderator doesn't contribute to specific sections
};

/**
 * Default PRD generation configuration
 */
export const DEFAULT_PRD_CONFIG: PRDGenerationConfig = {
  outputFormat: 'PRD',
  template: PRDTemplate.STANDARD,
  language: 'en',
  includeConsensusMetrics: true,
  validationLevel: ValidationLevel.BASIC,
  fallbackBehavior: FallbackBehavior.TEMPLATE,
  sectionPriority: [
    'overview',
    'scope', 
    'functional-requirements',
    'non-functional-requirements',
    'user-journey',
    'acceptance-criteria',
    'stakeholders'
  ]
};

// Type guards for runtime validation

/**
 * Type guard to check if object is a PRD document
 */
export function isPRDDocument(obj: any): obj is PRDDocument {
  return (
    obj &&
    typeof obj === 'object' &&
    'metadata' in obj &&
    'overview' in obj &&
    'scope' in obj &&
    Array.isArray(obj.functionalRequirements) &&
    'nonFunctionalRequirements' in obj &&
    Array.isArray(obj.userJourney) &&
    Array.isArray(obj.acceptanceCriteria) &&
    Array.isArray(obj.stakeholders)
  );
}

/**
 * Type guard to check if object is a functional requirement
 */
export function isFunctionalRequirement(obj: any): obj is FunctionalRequirement {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.id.startsWith('FR') &&
    typeof obj.title === 'string' &&
    typeof obj.description === 'string' &&
    Object.values(Priority).includes(obj.priority) &&
    Object.values(RequirementCategory).includes(obj.category) &&
    Array.isArray(obj.acceptanceCriteria) &&
    typeof obj.businessValue === 'string'
  );
}

/**
 * Type guard to check if object is an acceptance criterion
 */
export function isAcceptanceCriterion(obj: any): obj is AcceptanceCriterion {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.id.startsWith('AC') &&
    typeof obj.feature === 'string' &&
    typeof obj.scenario === 'string' &&
    typeof obj.given === 'string' &&
    typeof obj.when === 'string' &&
    typeof obj.then === 'string' &&
    Object.values(Priority).includes(obj.priority) &&
    typeof obj.testable === 'boolean'
  );
}

/**
 * Type guard to check if object is a stakeholder
 */
export function isStakeholder(obj: any): obj is Stakeholder {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.role === 'string' &&
    Object.values(StakeholderType).includes(obj.type) &&
    Array.isArray(obj.responsibilities) &&
    Array.isArray(obj.concerns) &&
    Object.values(InfluenceLevel).includes(obj.influence) &&
    Object.values(InterestLevel).includes(obj.interest) &&
    typeof obj.decisionAuthority === 'boolean'
  );
}

/**
 * Helper function to create PRD metadata with defaults
 */
export function createPRDMetadata(
  overrides: Partial<PRDMetadata>,
  language: Language = 'en'
): PRDMetadata {
  const isPortuguese = language === 'pt' || language === 'pt-BR';
  
  return {
    id: overrides.id ?? `PRD-${Date.now()}`,
    title: overrides.title ?? (isPortuguese 
      ? 'Documento de Requisitos do Produto (PRD)'
      : 'Product Requirements Document (PRD)'),
    createdAt: overrides.createdAt ?? new Date(),
    language,
    version: overrides.version ?? '1.0',
    author: overrides.author ?? 'PentaForge MCP Server',
    tags: overrides.tags ?? [],
    consensusScore: overrides.consensusScore,
    discussionRounds: overrides.discussionRounds,
    generationMethod: overrides.generationMethod ?? 'persona'
  } as PRDMetadata;
}

/**
 * Helper function to generate unique requirement IDs
 */
export function generateRequirementId(type: 'FR' | 'AC', index: number): string {
  return `${type}${(index + 1).toString().padStart(3, '0')}`;
}

/**
 * Helper function to create empty PRD structure
 */
export function createEmptyPRD(language: Language = 'en'): PRDDocument {
  return {
    metadata: createPRDMetadata({}, language),
    overview: {
      problemStatement: '',
      objectives: []
    },
    scope: {
      included: [],
      excluded: []
    },
    functionalRequirements: [],
    nonFunctionalRequirements: {
      performance: [],
      security: [],
      scalability: [],
      usability: []
    },
    userJourney: [],
    acceptanceCriteria: [],
    stakeholders: []
  };
}

/**
 * Helper function to validate PRD completeness
 */
export interface PRDValidationResult {
  isValid: boolean;
  missingRequired: string[];
  warnings: string[];
  completeness: number; // 0-100 percentage
}

/**
 * Validate PRD document completeness
 */
export function validatePRDCompleteness(prd: PRDDocument): PRDValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  let completedSections = 0;
  const totalSections = 7;

  // Check required sections
  if (!prd.overview.problemStatement) missing.push('Overview: Problem Statement');
  if (prd.overview.objectives.length === 0) missing.push('Overview: Objectives');
  else completedSections++;

  if (prd.scope.included.length === 0) missing.push('Scope: Included Items');
  else completedSections++;

  if (prd.functionalRequirements.length === 0) missing.push('Functional Requirements');
  else completedSections++;

  // Check NFR completeness
  const nfrCategories = Object.keys(prd.nonFunctionalRequirements);
  const hasNFRs = nfrCategories.some(category => {
    const items = prd.nonFunctionalRequirements[category as keyof NonFunctionalRequirements];
    return items && items.length > 0;
  });
  if (!hasNFRs) missing.push('Non-Functional Requirements');
  else completedSections++;

  if (prd.userJourney.length === 0) missing.push('User Journey');
  else completedSections++;

  if (prd.acceptanceCriteria.length === 0) missing.push('Acceptance Criteria');
  else completedSections++;

  if (prd.stakeholders.length === 0) missing.push('Stakeholders');
  else completedSections++;

  // Generate warnings
  if (prd.overview.objectives.length > 10) {
    warnings.push('Too many objectives (>10) may reduce focus');
  }
  
  if (prd.functionalRequirements.length > 50) {
    warnings.push('Large number of functional requirements (>50) may indicate insufficient scoping');
  }

  const completeness = Math.round((completedSections / totalSections) * 100) || 0;

  return {
    isValid: missing.length === 0,
    missingRequired: missing,
    warnings,
    completeness
  };
}