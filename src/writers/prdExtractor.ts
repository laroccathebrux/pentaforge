/**
 * PRD Content Extraction Engine
 * Maps persona contributions from roundtable discussions to appropriate PRD sections
 */

import { Discussion, EnhancedDiscussion } from '../engine/discussion.js';
import { Turn } from '../personas/base.js';
import { 
  PRDDocument, 
  PRDOverview, 
  PRDScope, 
  ScopeItem,
  FunctionalRequirement, 
  NonFunctionalRequirements,
  NFRItem,
  UserJourneyStep,
  AcceptanceCriterion,
  Stakeholder,
  PersonaRole,
  PERSONA_PRD_MAPPING,
  Priority,
  RequirementCategory,
  ActorType,
  StakeholderType,
  InfluenceLevel,
  InterestLevel,
  generateRequirementId,
  createEmptyPRD,
  createPRDMetadata
} from '../types/prd.js';
import { Language } from '../types/prd.js';
import { log } from '../lib/log.js';


/**
 * Parsed insights from persona contributions
 */
interface PersonaInsight {
  persona: PersonaRole;
  content: string;
  type: 'requirement' | 'constraint' | 'goal' | 'concern' | 'solution';
  confidence: number;
  round: number;
}

/**
 * PRD Content Extractor class
 * Intelligently maps persona discussions to PRD structure
 */
export class PRDExtractor {
  private insights: PersonaInsight[] = [];
  private language: Language;

  constructor(language: Language = 'en') {
    this.language = language;
  }

  /**
   * Extract complete PRD structure from discussion
   */
  async extractPRDFromDiscussion(
    discussion: Discussion | EnhancedDiscussion,
    prompt: string
  ): Promise<PRDDocument> {
    log.debug('🔍 Starting PRD extraction from discussion');
    
    // Parse all persona insights
    this.insights = this.parsePersonaInsights(discussion.rounds);
    
    // Create base PRD structure
    const prd = createEmptyPRD(this.language);
    
    // Extract each section
    prd.overview = await this.extractOverview(prompt);
    prd.scope = await this.extractScope();
    prd.functionalRequirements = await this.extractFunctionalRequirements();
    prd.nonFunctionalRequirements = await this.extractNonFunctionalRequirements();
    prd.userJourney = await this.extractUserJourney();
    prd.acceptanceCriteria = await this.extractAcceptanceCriteria();
    prd.stakeholders = await this.extractStakeholders();

    // Add consensus data if available
    if (this.isEnhancedDiscussion(discussion)) {
      prd.consensusData = this.extractConsensusData(discussion);
    }

    // Update metadata
    // Update metadata - need to recreate since it's readonly
    const newMetadata = createPRDMetadata({
      ...prd.metadata,
      generationMethod: this.insights.length > 0 ? 'persona' : 'fallback'
    }, this.language);
    
    (prd as any).metadata = newMetadata;
    
    log.debug(`✅ PRD extraction complete. Generated ${prd.functionalRequirements.length} FRs, ${prd.acceptanceCriteria.length} ACs`);
    
    return prd;
  }

  /**
   * Extract overview section from Business Analyst and Product Owner insights
   */
  private async extractOverview(prompt: string): Promise<PRDOverview> {
    const relevantPersonas: PersonaRole[] = ['BusinessAnalyst', 'ProductOwner'];
    const insights = this.getInsightsByPersonas(relevantPersonas);
    
    const overview: PRDOverview = {
      problemStatement: prompt,
      objectives: []
    };

    // Extract objectives from persona insights
    const objectives = insights
      .filter(insight => insight.type === 'goal' || insight.content.toLowerCase().includes('objective'))
      .map(insight => this.cleanInsightContent(insight.content))
      .filter(obj => obj.length > 10)
      .slice(0, 6); // Limit to 6 objectives
    
    if (objectives.length > 0) {
      overview.objectives = objectives;
    } else {
      // Default objectives based on prompt analysis
      overview.objectives = this.generateDefaultObjectives(prompt);
    }

    // Extract business context if available
    const businessContext = insights
      .filter(insight => insight.persona === 'BusinessAnalyst')
      .find(insight => insight.content.toLowerCase().includes('context') || 
                      insight.content.toLowerCase().includes('business'))?.content;
    
    if (businessContext) {
      overview.businessContext = this.cleanInsightContent(businessContext);
    }

    log.debug(`📋 Extracted overview with ${overview.objectives.length} objectives`);
    return overview;
  }

  /**
   * Extract scope section from Scrum Master and Solutions Architect insights
   */
  private async extractScope(): Promise<PRDScope> {
    const relevantPersonas: PersonaRole[] = ['ScrumMaster', 'ProductOwner', 'SolutionsArchitect'];
    const insights = this.getInsightsByPersonas(relevantPersonas);
    
    const scope: PRDScope = {
      included: [],
      excluded: []
    };

    // Extract included features
    const includedInsights = insights.filter(insight => 
      insight.type === 'requirement' || 
      insight.content.toLowerCase().includes('include') ||
      insight.content.toLowerCase().includes('feature') ||
      insight.content.toLowerCase().includes('must have')
    );

    scope.included = includedInsights
      .map(insight => this.createScopeItem(insight, 'included'))
      .slice(0, 10); // Limit scope items

    // Extract excluded features
    const excludedInsights = insights.filter(insight => 
      insight.content.toLowerCase().includes('exclude') ||
      insight.content.toLowerCase().includes('not include') ||
      insight.content.toLowerCase().includes('out of scope') ||
      insight.content.toLowerCase().includes('future')
    );

    scope.excluded = excludedInsights
      .map(insight => this.createScopeItem(insight, 'excluded'))
      .slice(0, 5); // Limit excluded items

    // Extract constraints
    const constraints = insights
      .filter(insight => insight.type === 'constraint' || 
                        insight.content.toLowerCase().includes('constraint') ||
                        insight.content.toLowerCase().includes('limitation'))
      .map(insight => this.cleanInsightContent(insight.content))
      .slice(0, 5);

    if (constraints.length > 0) {
      scope.constraints = constraints;
    }

    log.debug(`🎯 Extracted scope with ${scope.included.length} included, ${scope.excluded.length} excluded items`);
    return scope;
  }

  /**
   * Extract functional requirements from multiple persona insights
   */
  private async extractFunctionalRequirements(): Promise<FunctionalRequirement[]> {
    const relevantPersonas: PersonaRole[] = ['BusinessAnalyst', 'KeyUser', 'ProductOwner'];
    const insights = this.getInsightsByPersonas(relevantPersonas);
    
    const requirements: FunctionalRequirement[] = [];
    let requirementIndex = 0;

    // Extract requirements from insights
    const requirementInsights = insights
      .filter(insight => insight.type === 'requirement' || 
                        insight.content.toLowerCase().includes('must') ||
                        insight.content.toLowerCase().includes('should') ||
                        insight.content.toLowerCase().includes('need'))
      .slice(0, 20); // Limit to 20 requirements

    for (const insight of requirementInsights) {
      const requirement: FunctionalRequirement = {
        id: generateRequirementId('FR', requirementIndex++),
        title: this.generateRequirementTitle(insight.content),
        description: this.cleanInsightContent(insight.content),
        priority: this.determinePriority(insight),
        category: this.categorizeRequirement(insight.content),
        acceptanceCriteria: this.generateBasicAcceptanceCriteria(insight.content),
        businessValue: this.extractBusinessValue(insight.content),
        source: [insight.persona]
      };
      
      requirements.push(requirement);
    }

    // Ensure minimum requirements if none extracted
    if (requirements.length === 0) {
      requirements.push(this.createDefaultRequirement(requirementIndex));
    }

    log.debug(`⚙️ Extracted ${requirements.length} functional requirements`);
    return requirements;
  }

  /**
   * Extract non-functional requirements from Solutions Architect insights
   */
  private async extractNonFunctionalRequirements(): Promise<NonFunctionalRequirements> {
    const relevantPersonas: PersonaRole[] = ['SolutionsArchitect'];
    const insights = this.getInsightsByPersonas(relevantPersonas);
    
    const nfrs: NonFunctionalRequirements = {
      performance: [],
      security: [],
      scalability: [],
      usability: []
    };

    // Categorize NFR insights
    insights.forEach(insight => {
      const content = insight.content.toLowerCase();
      const nfrItem: NFRItem = {
        requirement: this.cleanInsightContent(insight.content),
        rationale: `Identified by ${insight.persona}`,
        priority: this.determinePriority(insight),
        testable: this.isTestableRequirement(insight.content),
        source: insight.persona
      };

      // Categorize by content keywords
      if (content.includes('performance') || content.includes('speed') || content.includes('response time')) {
        nfrs.performance.push(nfrItem);
      } else if (content.includes('security') || content.includes('auth') || content.includes('encrypt')) {
        nfrs.security.push(nfrItem);
      } else if (content.includes('scale') || content.includes('concurrent') || content.includes('load')) {
        nfrs.scalability.push(nfrItem);
      } else if (content.includes('usability') || content.includes('user experience') || content.includes('accessible')) {
        nfrs.usability.push(nfrItem);
      } else {
        // Default to performance category
        nfrs.performance.push(nfrItem);
      }
    });

    // Add UX insights to usability
    const uxInsights = this.getInsightsByPersonas(['UXUIDesigner']);
    uxInsights.forEach(insight => {
      const nfrItem: NFRItem = {
        requirement: this.cleanInsightContent(insight.content),
        rationale: `UX requirement from ${insight.persona}`,
        priority: this.determinePriority(insight),
        testable: true,
        source: insight.persona
      };
      nfrs.usability.push(nfrItem);
    });

    log.debug(`📊 Extracted NFRs: ${nfrs.performance.length} perf, ${nfrs.security.length} security, ${nfrs.usability.length} UX`);
    return nfrs;
  }

  /**
   * Extract user journey from Key User and UX Designer insights
   */
  private async extractUserJourney(): Promise<UserJourneyStep[]> {
    const relevantPersonas: PersonaRole[] = ['KeyUser', 'UXUIDesigner'];
    const insights = this.getInsightsByPersonas(relevantPersonas);
    
    const journey: UserJourneyStep[] = [];
    let stepNumber = 1;

    // Extract journey steps from insights
    const journeyInsights = insights
      .filter(insight => 
        insight.content.toLowerCase().includes('user') ||
        insight.content.toLowerCase().includes('step') ||
        insight.content.toLowerCase().includes('flow') ||
        insight.content.toLowerCase().includes('journey')
      )
      .slice(0, 10); // Limit journey steps

    for (const insight of journeyInsights) {
      const step: UserJourneyStep = {
        step: stepNumber++,
        actor: this.determineActor(insight.content),
        action: this.extractUserAction(insight.content),
        systemResponse: this.extractSystemResponse(insight.content),
        outcome: this.extractOutcome(insight.content)
      };
      
      journey.push(step);
    }

    // Create default journey if none extracted
    if (journey.length === 0) {
      journey.push(this.createDefaultJourneyStep());
    }

    log.debug(`🚶 Extracted ${journey.length} user journey steps`);
    return journey;
  }

  /**
   * Extract acceptance criteria from Business Analyst and Key User insights
   */
  private async extractAcceptanceCriteria(): Promise<AcceptanceCriterion[]> {
    const relevantPersonas: PersonaRole[] = ['BusinessAnalyst', 'KeyUser'];
    const insights = this.getInsightsByPersonas(relevantPersonas);
    
    const criteria: AcceptanceCriterion[] = [];
    let criterionIndex = 0;

    // Extract criteria from insights
    const criteriaInsights = insights
      .filter(insight => 
        insight.content.toLowerCase().includes('accept') ||
        insight.content.toLowerCase().includes('criteria') ||
        insight.content.toLowerCase().includes('test') ||
        insight.content.toLowerCase().includes('validate')
      )
      .slice(0, 15); // Limit acceptance criteria

    for (const insight of criteriaInsights) {
      const criterion: AcceptanceCriterion = {
        id: generateRequirementId('AC', criterionIndex++),
        feature: this.extractFeatureName(insight.content),
        scenario: this.generateScenario(insight.content),
        given: this.extractGivenClause(insight.content),
        when: this.extractWhenClause(insight.content),
        then: this.extractThenClause(insight.content),
        priority: this.determinePriority(insight),
        testable: true,
        source: insight.persona
      };
      
      criteria.push(criterion);
    }

    // Create default criteria if none extracted
    if (criteria.length === 0) {
      criteria.push(this.createDefaultAcceptanceCriterion(criterionIndex));
    }

    log.debug(`✅ Extracted ${criteria.length} acceptance criteria`);
    return criteria;
  }

  /**
   * Extract stakeholders from Business Stakeholder and Product Owner insights
   */
  private async extractStakeholders(): Promise<Stakeholder[]> {
    const relevantPersonas: PersonaRole[] = ['BusinessStakeholder', 'ProductOwner'];
    const insights = this.getInsightsByPersonas(relevantPersonas);
    
    const stakeholders: Stakeholder[] = [];

    // Extract stakeholder mentions from insights
    const stakeholderInsights = insights
      .filter(insight => 
        insight.content.toLowerCase().includes('stakeholder') ||
        insight.content.toLowerCase().includes('user') ||
        insight.content.toLowerCase().includes('team') ||
        insight.content.toLowerCase().includes('customer')
      );

    // Create stakeholders from insights
    stakeholderInsights.forEach(insight => {
      const stakeholder: Stakeholder = {
        role: this.extractStakeholderRole(insight.content),
        type: this.determineStakeholderType(insight.content),
        responsibilities: this.extractResponsibilities(insight.content),
        concerns: [this.cleanInsightContent(insight.content)],
        influence: this.determineInfluence(insight.persona),
        interest: InterestLevel.HIGH,
        decisionAuthority: insight.persona === 'ProductOwner'
      };
      
      stakeholders.push(stakeholder);
    });

    // Add default stakeholders based on personas present
    if (stakeholders.length === 0) {
      stakeholders.push(...this.createDefaultStakeholders());
    }

    log.debug(`👥 Extracted ${stakeholders.length} stakeholders`);
    return stakeholders;
  }

  // Helper methods for content extraction and processing

  /**
   * Parse all persona insights from discussion turns
   */
  private parsePersonaInsights(rounds: Turn[]): PersonaInsight[] {
    const insights: PersonaInsight[] = [];
    
    rounds.forEach((turn, roundIndex) => {
      if (this.isValidPersona(turn.role)) {
        // Split turn content into sentences
        const sentences = turn.content
          .split(/[.!?]+/)
          .filter(s => s.trim().length > 20)
          .slice(0, 10); // Limit sentences per turn

        sentences.forEach(sentence => {
          const insight: PersonaInsight = {
            persona: turn.role as PersonaRole,
            content: sentence.trim(),
            type: this.classifyInsightType(sentence),
            confidence: this.calculateConfidence(sentence, turn.role as PersonaRole),
            round: roundIndex
          };
          
          insights.push(insight);
        });
      }
    });

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get insights filtered by specific personas
   */
  private getInsightsByPersonas(personas: PersonaRole[]): PersonaInsight[] {
    return this.insights.filter(insight => personas.includes(insight.persona));
  }

  /**
   * Clean and format insight content
   */
  private cleanInsightContent(content: string): string {
    return content
      .replace(/^\s*[-*•]\s*/, '') // Remove bullet points
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .replace(/^./, c => c.toUpperCase()); // Capitalize first letter
  }

  /**
   * Classify insight type based on content
   */
  private classifyInsightType(content: string): PersonaInsight['type'] {
    const lower = content.toLowerCase();
    
    if (lower.includes('must') || lower.includes('should') || lower.includes('requirement')) {
      return 'requirement';
    } else if (lower.includes('constraint') || lower.includes('limitation') || lower.includes('cannot')) {
      return 'constraint';
    } else if (lower.includes('goal') || lower.includes('objective') || lower.includes('aim')) {
      return 'goal';
    } else if (lower.includes('concern') || lower.includes('risk') || lower.includes('issue')) {
      return 'concern';
    } else {
      return 'solution';
    }
  }

  /**
   * Calculate confidence score for insight
   */
  private calculateConfidence(content: string, persona: PersonaRole): number {
    let confidence = 50; // Base confidence
    
    // Boost confidence for relevant personas
    const contentLower = content.toLowerCase();
    
    if (persona === 'BusinessAnalyst' && (contentLower.includes('requirement') || contentLower.includes('business'))) {
      confidence += 30;
    } else if (persona === 'SolutionsArchitect' && (contentLower.includes('technical') || contentLower.includes('architecture'))) {
      confidence += 30;
    } else if (persona === 'KeyUser' && (contentLower.includes('user') || contentLower.includes('experience'))) {
      confidence += 30;
    }
    
    // Boost for specific keywords
    if (contentLower.includes('must') || contentLower.includes('critical')) {
      confidence += 20;
    }
    
    // Reduce confidence for vague content
    if (content.length < 30) {
      confidence -= 20;
    }
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Generate default objectives when none extracted
   */
  private generateDefaultObjectives(prompt: string): string[] {
    const isPortuguese = this.language === 'pt' || this.language === 'pt-BR';
    
    return [
      isPortuguese 
        ? `Implementar solução para: ${prompt.substring(0, 100)}...`
        : `Implement solution for: ${prompt.substring(0, 100)}...`,
      isPortuguese
        ? 'Melhorar a experiência do usuário final'
        : 'Improve end-user experience',
      isPortuguese
        ? 'Garantir alta qualidade e confiabilidade'
        : 'Ensure high quality and reliability'
    ];
  }

  /**
   * Create scope item from insight
   */
  private createScopeItem(insight: PersonaInsight, _type: 'included' | 'excluded'): ScopeItem {
    return {
      title: this.generateRequirementTitle(insight.content),
      description: this.cleanInsightContent(insight.content),
      rationale: `Identified by ${insight.persona}`,
      priority: this.determinePriority(insight),
      source: insight.persona
    };
  }

  /**
   * Determine priority based on insight content and persona
   */
  private determinePriority(insight: PersonaInsight): Priority {
    const content = insight.content.toLowerCase();
    
    if (content.includes('critical') || content.includes('must have') || content.includes('essential')) {
      return Priority.HIGH;
    } else if (content.includes('should') || content.includes('important')) {
      return Priority.MEDIUM;
    } else {
      return Priority.LOW;
    }
  }

  /**
   * Check if persona role is valid
   */
  private isValidPersona(role: string): boolean {
    const validPersonas = Object.keys(PERSONA_PRD_MAPPING);
    return validPersonas.includes(role);
  }

  /**
   * Check if discussion is enhanced with consensus data
   */
  private isEnhancedDiscussion(discussion: Discussion | EnhancedDiscussion): discussion is EnhancedDiscussion {
    return 'consensusHistory' in discussion && 'consensusReached' in discussion;
  }

  /**
   * Extract consensus data from enhanced discussion
   */
  private extractConsensusData(discussion: EnhancedDiscussion) {
    const finalConsensus = discussion.consensusHistory[discussion.consensusHistory.length - 1];
    
    return {
      finalConsensusScore: finalConsensus?.agreementScore ?? 0,
      totalRounds: discussion.currentRound,
      keyDecisions: [], // TODO: Extract from decision evolution
      unresolvedItems: finalConsensus?.unresolvedIssues ?? [],
      conflictResolutions: [], // TODO: Extract from consensus history
      consensusEvolution: discussion.consensusHistory.map(h => h.agreementScore)
    };
  }

  // Additional helper methods for requirement generation
  private generateRequirementTitle(content: string): string {
    const words = content.split(' ').slice(0, 6);
    return words.join(' ').replace(/[.!?]$/, '');
  }

  private categorizeRequirement(content: string): RequirementCategory {
    const lower = content.toLowerCase();
    
    if (lower.includes('auth') || lower.includes('login')) return RequirementCategory.AUTHENTICATION;
    if (lower.includes('permission') || lower.includes('access')) return RequirementCategory.AUTHORIZATION;
    if (lower.includes('data') || lower.includes('store')) return RequirementCategory.DATA_MANAGEMENT;
    if (lower.includes('ui') || lower.includes('interface')) return RequirementCategory.UI_UX;
    if (lower.includes('security') || lower.includes('encrypt')) return RequirementCategory.SECURITY;
    if (lower.includes('performance') || lower.includes('speed')) return RequirementCategory.PERFORMANCE;
    if (lower.includes('monitor') || lower.includes('log')) return RequirementCategory.MONITORING;
    if (lower.includes('integrate') || lower.includes('api')) return RequirementCategory.INTEGRATION;
    
    return RequirementCategory.WORKFLOW;
  }

  private generateBasicAcceptanceCriteria(content: string): string[] {
    return [
      `System implements: ${content.substring(0, 50)}...`,
      'Functionality is accessible to authorized users',
      'Performance meets acceptable standards'
    ];
  }

  private extractBusinessValue(content: string): string {
    return `Addresses requirement: ${content.substring(0, 100)}...`;
  }

  private createDefaultRequirement(index: number): FunctionalRequirement {
    const isPortuguese = this.language === 'pt' || this.language === 'pt-BR';
    
    return {
      id: generateRequirementId('FR', index),
      title: isPortuguese ? 'Funcionalidade Principal' : 'Core Functionality',
      description: isPortuguese 
        ? 'Sistema deve fornecer funcionalidade essencial conforme especificado'
        : 'System must provide essential functionality as specified',
      priority: Priority.HIGH,
      category: RequirementCategory.WORKFLOW,
      acceptanceCriteria: [
        isPortuguese ? 'Funcionalidade implementada corretamente' : 'Functionality implemented correctly',
        isPortuguese ? 'Testes passam com sucesso' : 'Tests pass successfully'
      ],
      businessValue: isPortuguese 
        ? 'Atende necessidade central do projeto'
        : 'Addresses core project need'
    };
  }

  private determineActor(content: string): ActorType {
    const lower = content.toLowerCase();
    if (lower.includes('admin')) return ActorType.ADMIN;
    if (lower.includes('system')) return ActorType.SYSTEM;
    if (lower.includes('api') || lower.includes('service')) return ActorType.EXTERNAL_SERVICE;
    return ActorType.END_USER;
  }

  private extractUserAction(content: string): string {
    // Simple extraction - could be enhanced with NLP
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  }

  private extractSystemResponse(_content: string): string {
    const isPortuguese = this.language === 'pt' || this.language === 'pt-BR';
    return isPortuguese 
      ? 'Sistema responde adequadamente'
      : 'System responds appropriately';
  }

  private extractOutcome(_content: string): string {
    const isPortuguese = this.language === 'pt' || this.language === 'pt-BR';
    return isPortuguese 
      ? 'Operação completada com sucesso'
      : 'Operation completed successfully';
  }

  private createDefaultJourneyStep(): UserJourneyStep {
    const isPortuguese = this.language === 'pt' || this.language === 'pt-BR';
    
    return {
      step: 1,
      actor: ActorType.END_USER,
      action: isPortuguese ? 'Usuário inicia operação' : 'User initiates operation',
      systemResponse: isPortuguese ? 'Sistema processa solicitação' : 'System processes request',
      outcome: isPortuguese ? 'Operação concluída' : 'Operation completed'
    };
  }

  private extractFeatureName(content: string): string {
    return this.generateRequirementTitle(content);
  }

  private generateScenario(content: string): string {
    return `Test scenario: ${content.substring(0, 40)}...`;
  }

  private extractGivenClause(_content: string): string {
    const isPortuguese = this.language === 'pt' || this.language === 'pt-BR';
    return isPortuguese ? 'Dado que o sistema está operacional' : 'Given the system is operational';
  }

  private extractWhenClause(content: string): string {
    return `When ${content.substring(0, 30)}...`;
  }

  private extractThenClause(_content: string): string {
    const isPortuguese = this.language === 'pt' || this.language === 'pt-BR';
    return isPortuguese ? 'Então a operação é bem-sucedida' : 'Then the operation succeeds';
  }

  private createDefaultAcceptanceCriterion(index: number): AcceptanceCriterion {
    const isPortuguese = this.language === 'pt' || this.language === 'pt-BR';
    
    return {
      id: generateRequirementId('AC', index),
      feature: isPortuguese ? 'Funcionalidade Principal' : 'Core Functionality',
      scenario: isPortuguese ? 'Teste básico de funcionalidade' : 'Basic functionality test',
      given: isPortuguese ? 'Dado que o usuário está autenticado' : 'Given the user is authenticated',
      when: isPortuguese ? 'Quando o usuário executa a ação' : 'When the user performs action',
      then: isPortuguese ? 'Então o resultado esperado é obtido' : 'Then the expected result is achieved',
      priority: Priority.HIGH,
      testable: true
    };
  }

  private extractStakeholderRole(content: string): string {
    const lower = content.toLowerCase();
    if (lower.includes('user')) return 'End Users';
    if (lower.includes('admin')) return 'System Administrators';
    if (lower.includes('manager')) return 'Project Managers';
    if (lower.includes('developer')) return 'Development Team';
    return 'Project Stakeholders';
  }

  private determineStakeholderType(content: string): StakeholderType {
    const lower = content.toLowerCase();
    if (lower.includes('decision') || lower.includes('approve')) return StakeholderType.KEY_DECISION_MAKER;
    if (lower.includes('user') || lower.includes('customer')) return StakeholderType.PRIMARY;
    return StakeholderType.SECONDARY;
  }

  private extractResponsibilities(_content: string): string[] {
    const isPortuguese = this.language === 'pt' || this.language === 'pt-BR';
    return [
      isPortuguese ? 'Participação no processo de desenvolvimento' : 'Participation in development process',
      isPortuguese ? 'Validação de requisitos' : 'Requirements validation'
    ];
  }

  private determineInfluence(persona: PersonaRole): InfluenceLevel {
    if (['ProductOwner', 'BusinessStakeholder'].includes(persona)) {
      return InfluenceLevel.HIGH;
    } else if (['ScrumMaster', 'SolutionsArchitect', 'BusinessAnalyst'].includes(persona)) {
      return InfluenceLevel.MEDIUM;
    }
    return InfluenceLevel.LOW;
  }

  private createDefaultStakeholders(): Stakeholder[] {
    const isPortuguese = this.language === 'pt' || this.language === 'pt-BR';
    
    return [
      {
        role: isPortuguese ? 'Usuários Finais' : 'End Users',
        type: StakeholderType.PRIMARY,
        responsibilities: [
          isPortuguese ? 'Utilizar o sistema desenvolvido' : 'Use the developed system',
          isPortuguese ? 'Fornecer feedback sobre usabilidade' : 'Provide usability feedback'
        ],
        concerns: [
          isPortuguese ? 'Facilidade de uso' : 'Ease of use',
          isPortuguese ? 'Confiabilidade do sistema' : 'System reliability'
        ],
        influence: InfluenceLevel.MEDIUM,
        interest: InterestLevel.HIGH,
        decisionAuthority: false
      },
      {
        role: isPortuguese ? 'Equipe de Desenvolvimento' : 'Development Team',
        type: StakeholderType.SECONDARY,
        responsibilities: [
          isPortuguese ? 'Implementar os requisitos' : 'Implement requirements',
          isPortuguese ? 'Manter qualidade técnica' : 'Maintain technical quality'
        ],
        concerns: [
          isPortuguese ? 'Clareza dos requisitos' : 'Requirements clarity',
          isPortuguese ? 'Viabilidade técnica' : 'Technical feasibility'
        ],
        influence: InfluenceLevel.MEDIUM,
        interest: InterestLevel.HIGH,
        decisionAuthority: false
      }
    ];
  }

  private isTestableRequirement(content: string): boolean {
    const lower = content.toLowerCase();
    return lower.includes('measure') || 
           lower.includes('test') || 
           lower.includes('metric') ||
           lower.includes('performance') ||
           !lower.includes('intuitive') && !lower.includes('user-friendly');
  }
}