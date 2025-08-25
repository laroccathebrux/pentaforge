/**
 * PRD Writer Core Class
 * Orchestrates the generation of Product Requirements Documents from roundtable discussions
 */

import { Discussion, EnhancedDiscussion } from '../engine/discussion.js';
import { WriterConfig } from './discussionWriter.js';
import { PRDExtractor } from './prdExtractor.js';
import { writeFileAtomic, ensureDirectory } from '../lib/fs.js';
import { log } from '../lib/log.js';
import {
  PRDDocument,
  PRDGenerationConfig,
  DEFAULT_PRD_CONFIG,
  validatePRDCompleteness,
  createPRDMetadata,
  ValidationLevel
} from '../types/prd.js';
import { Language } from '../types/prd.js';
import path from 'path';

/**
 * Extended writer configuration for PRD generation
 */
export interface PRDWriterConfig extends WriterConfig {
  outputDir: string;
  prdConfig?: Partial<PRDGenerationConfig>;
  dryRun?: boolean;
}

/**
 * PRD generation result
 */
export interface PRDGenerationResult {
  filePath: string;
  prdDocument: PRDDocument;
  validationResult: any;
  generationMetrics: PRDGenerationMetrics;
}

/**
 * Metrics for PRD generation process
 */
export interface PRDGenerationMetrics {
  generationTime: number; // milliseconds
  sectionsGenerated: number;
  personaInsightsUsed: number;
  aiGeneratedSections: number;
  fallbackSections: number;
  validationScore: number; // 0-100
}

/**
 * PRD Writer main class
 */
export class PRDWriter {
  private extractor: PRDExtractor;
  private config: PRDGenerationConfig;

  constructor(language: Language = 'en', config?: Partial<PRDGenerationConfig>) {
    this.config = {
      ...DEFAULT_PRD_CONFIG,
      language,
      ...config
    };
    
    this.extractor = new PRDExtractor(language);
  }

  /**
   * Main method to generate PRD from discussion
   */
  async writePRD(
    discussion: Discussion | EnhancedDiscussion,
    writerConfig: PRDWriterConfig
  ): Promise<PRDGenerationResult> {
    const startTime = Date.now();
    log.debug('📄 Starting PRD generation...');

    try {
      // Ensure output directory exists
      await ensureDirectory(writerConfig.outputDir);

      // Extract PRD structure from discussion
      const prdDocument = await this.extractPRDFromDiscussion(discussion, writerConfig.prompt);

      // Enhance with AI-generated content if needed
      const enhancedPRD = await this.enhancePRDWithAI(prdDocument);

      // Apply template formatting
      const formattedContent = await this.formatPRDContent(enhancedPRD);

      // Validate PRD completeness
      const validationResult = validatePRDCompleteness(enhancedPRD);

      // Generate file path
      const fileName = `PRD_${writerConfig.timestamp}.md`;
      const filePath = path.join(writerConfig.outputDir, fileName);

      // Write file (unless dry run)
      if (!writerConfig.dryRun) {
        await writeFileAtomic(filePath, formattedContent);
        log.debug(`✅ PRD written to: ${filePath}`);
      } else {
        log.debug('🔍 Dry run - PRD content generated but not written to file');
      }

      // Calculate metrics
      const generationTime = Date.now() - startTime;
      const metrics = this.calculateGenerationMetrics(enhancedPRD, validationResult, generationTime);

      // Log generation summary
      this.logGenerationSummary(metrics, validationResult);

      return {
        filePath: writerConfig.dryRun ? '' : filePath,
        prdDocument: enhancedPRD,
        validationResult,
        generationMetrics: metrics
      };

    } catch (error) {
      log.error(`🚨 PRD generation failed: ${error}`);
      throw new Error(`PRD generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract PRD structure from discussion using persona insights
   */
  private async extractPRDFromDiscussion(
    discussion: Discussion | EnhancedDiscussion,
    prompt: string
  ): Promise<PRDDocument> {
    log.debug('🔍 Extracting PRD structure from discussion...');
    
    try {
      const prd = await this.extractor.extractPRDFromDiscussion(discussion, prompt);
      
      // Update metadata - need to recreate since it's readonly
      const newMetadata = createPRDMetadata({
        ...prd.metadata,
        language: this.config.language,
        createdAt: new Date(),
        discussionRounds: this.isEnhancedDiscussion(discussion) ? discussion.currentRound : discussion.rounds.length
      }, this.config.language);
      
      (prd as any).metadata = newMetadata;

      log.debug(`✅ PRD structure extracted with ${prd.functionalRequirements.length} functional requirements`);
      return prd;
      
    } catch (error) {
      log.warn(`🚨 PRD extraction failed, using fallback approach: ${error}`);
      return this.createFallbackPRD(prompt);
    }
  }

  /**
   * Enhance PRD with AI-generated content for incomplete sections
   */
  private async enhancePRDWithAI(prd: PRDDocument): Promise<PRDDocument> {
    if (this.config.validationLevel === ValidationLevel.BASIC) {
      return prd; // Skip AI enhancement for basic validation
    }

    log.debug('🤖 Enhancing PRD with AI-generated content...');
    let aiSectionsGenerated = 0;

    try {
      // Enhance overview if incomplete
      if (!prd.overview.businessContext || prd.overview.objectives.length < 3) {
        const enhancedOverview = await this.enhanceOverviewWithAI(prd.overview, prd.metadata.title);
        prd.overview = { ...prd.overview, ...enhancedOverview };
        aiSectionsGenerated++;
      }

      // Enhance functional requirements if too few
      if (prd.functionalRequirements.length < 3) {
        const additionalRequirements = await this.generateAdditionalRequirementsWithAI(prd);
        prd.functionalRequirements.push(...additionalRequirements);
        aiSectionsGenerated++;
      }

      // Enhance non-functional requirements if empty categories
      const emptyNFRCategories = Object.entries(prd.nonFunctionalRequirements)
        .filter(([_, items]) => items.length === 0)
        .map(([category]) => category);

      if (emptyNFRCategories.length > 0) {
        for (const category of emptyNFRCategories.slice(0, 2)) { // Limit to 2 categories
          const nfrs = await this.generateNFRsForCategoryWithAI(category, prd.overview.problemStatement);
          (prd.nonFunctionalRequirements as any)[category] = nfrs;
          aiSectionsGenerated++;
        }
      }

      log.debug(`🤖 AI enhancement complete. Generated content for ${aiSectionsGenerated} sections`);
      
    } catch (error) {
      log.warn(`🚨 AI enhancement failed: ${error}`);
    }

    return prd;
  }

  /**
   * Format PRD content as markdown
   */
  private async formatPRDContent(prd: PRDDocument): Promise<string> {
    log.debug('📝 Formatting PRD content as markdown...');
    
    const isPortuguese = this.config.language === 'pt' || this.config.language === 'pt-BR';
    const lines: string[] = [];

    // Header
    lines.push(`# ${prd.metadata.title}`);
    lines.push('');
    lines.push(`**${isPortuguese ? 'Data/Hora' : 'Timestamp'}:** ${prd.metadata.createdAt.toISOString()}`);
    lines.push(`**${isPortuguese ? 'Versão' : 'Version'}:** ${prd.metadata.version}`);
    lines.push(`**${isPortuguese ? 'Autor' : 'Author'}:** ${prd.metadata.author}`);
    lines.push(`**${isPortuguese ? 'Idioma' : 'Language'}:** ${prd.metadata.language}`);
    lines.push('');

    // Overview Section
    lines.push(`## 1. ${isPortuguese ? 'Visão Geral / Objetivo' : 'Overview / Goal'}`);
    lines.push('');
    lines.push(`### ${isPortuguese ? 'Declaração do Problema' : 'Problem Statement'}`);
    lines.push(prd.overview.problemStatement);
    lines.push('');
    
    if (prd.overview.objectives.length > 0) {
      lines.push(`### ${isPortuguese ? 'Objetivos' : 'Objectives'}`);
      prd.overview.objectives.forEach(objective => {
        lines.push(`- ${objective}`);
      });
      lines.push('');
    }

    if (prd.overview.businessContext) {
      lines.push(`### ${isPortuguese ? 'Contexto de Negócio' : 'Business Context'}`);
      lines.push(prd.overview.businessContext);
      lines.push('');
    }

    // Scope Section
    lines.push(`## 2. ${isPortuguese ? 'Escopo' : 'Scope'}`);
    lines.push('');
    
    if (prd.scope.included.length > 0) {
      lines.push(`### ${isPortuguese ? 'Incluído' : 'What\'s Included'}`);
      prd.scope.included.forEach(item => {
        lines.push(`- **${item.title}**: ${item.description}`);
      });
      lines.push('');
    }

    if (prd.scope.excluded.length > 0) {
      lines.push(`### ${isPortuguese ? 'Excluído' : 'What\'s Excluded'}`);
      prd.scope.excluded.forEach(item => {
        lines.push(`- **${item.title}**: ${item.description}`);
      });
      lines.push('');
    }

    if (prd.scope.constraints && prd.scope.constraints.length > 0) {
      lines.push(`### ${isPortuguese ? 'Restrições' : 'Constraints'}`);
      prd.scope.constraints.forEach(constraint => {
        lines.push(`- ${constraint}`);
      });
      lines.push('');
    }

    // Functional Requirements Section
    lines.push(`## 3. ${isPortuguese ? 'Requisitos Funcionais' : 'Functional Requirements'}`);
    lines.push('');
    
    prd.functionalRequirements.forEach(req => {
      lines.push(`### ${req.id}: ${req.title}`);
      lines.push(`**${isPortuguese ? 'Prioridade' : 'Priority'}**: ${req.priority}`);
      lines.push(`**${isPortuguese ? 'Categoria' : 'Category'}**: ${req.category}`);
      lines.push('');
      lines.push(`**${isPortuguese ? 'Descrição' : 'Description'}**: ${req.description}`);
      lines.push('');
      
      if (req.acceptanceCriteria.length > 0) {
        lines.push(`**${isPortuguese ? 'Critérios de Aceitação' : 'Acceptance Criteria'}**:`);
        req.acceptanceCriteria.forEach(criterion => {
          lines.push(`- ${criterion}`);
        });
        lines.push('');
      }
      
      lines.push(`**${isPortuguese ? 'Valor de Negócio' : 'Business Value'}**: ${req.businessValue}`);
      lines.push('');
    });

    // Non-Functional Requirements Section
    lines.push(`## 4. ${isPortuguese ? 'Requisitos Não Funcionais' : 'Non-Functional Requirements'}`);
    lines.push('');

    const nfrSections = [
      { key: 'performance', label: isPortuguese ? 'Performance' : 'Performance' },
      { key: 'security', label: isPortuguese ? 'Segurança' : 'Security' },
      { key: 'scalability', label: isPortuguese ? 'Escalabilidade' : 'Scalability' },
      { key: 'usability', label: isPortuguese ? 'Usabilidade' : 'Usability' }
    ];

    nfrSections.forEach(section => {
      const items = (prd.nonFunctionalRequirements as any)[section.key] || [];
      if (items.length > 0) {
        lines.push(`### ${section.label}`);
        items.forEach((item: any) => {
          lines.push(`- ${item.requirement}`);
          if (item.metric) {
            lines.push(`  - **${isPortuguese ? 'Métrica' : 'Metric'}**: ${item.metric}`);
          }
        });
        lines.push('');
      }
    });

    // User Journey Section
    if (prd.userJourney.length > 0) {
      lines.push(`## 5. ${isPortuguese ? 'Jornada do Usuário' : 'User Journey'}`);
      lines.push('');
      
      prd.userJourney.forEach(step => {
        lines.push(`### ${isPortuguese ? 'Passo' : 'Step'} ${step.step}: ${step.action}`);
        lines.push(`**${isPortuguese ? 'Ator' : 'Actor'}**: ${step.actor}`);
        lines.push(`**${isPortuguese ? 'Resposta do Sistema' : 'System Response'}**: ${step.systemResponse}`);
        lines.push(`**${isPortuguese ? 'Resultado' : 'Outcome'}**: ${step.outcome}`);
        lines.push('');
      });
    }

    // Acceptance Criteria Section
    if (prd.acceptanceCriteria.length > 0) {
      lines.push(`## 6. ${isPortuguese ? 'Critérios de Aceitação' : 'Acceptance Criteria'}`);
      lines.push('');
      
      prd.acceptanceCriteria.forEach(criterion => {
        lines.push(`### ${criterion.id}: ${criterion.feature}`);
        lines.push(`**${isPortuguese ? 'Cenário' : 'Scenario'}**: ${criterion.scenario}`);
        lines.push('');
        lines.push(`- **${isPortuguese ? 'Dado' : 'Given'}**: ${criterion.given}`);
        lines.push(`- **${isPortuguese ? 'Quando' : 'When'}**: ${criterion.when}`);
        lines.push(`- **${isPortuguese ? 'Então' : 'Then'}**: ${criterion.then}`);
        lines.push('');
      });
    }

    // Stakeholders Section
    if (prd.stakeholders.length > 0) {
      lines.push(`## 7. ${isPortuguese ? 'Partes Interessadas' : 'Stakeholders'}`);
      lines.push('');
      
      prd.stakeholders.forEach(stakeholder => {
        lines.push(`### ${stakeholder.role}`);
        lines.push(`**${isPortuguese ? 'Tipo' : 'Type'}**: ${stakeholder.type}`);
        lines.push(`**${isPortuguese ? 'Influência' : 'Influence'}**: ${stakeholder.influence}`);
        lines.push(`**${isPortuguese ? 'Interesse' : 'Interest'}**: ${stakeholder.interest}`);
        lines.push('');
        
        if (stakeholder.responsibilities.length > 0) {
          lines.push(`**${isPortuguese ? 'Responsabilidades' : 'Responsibilities'}**:`);
          stakeholder.responsibilities.forEach(resp => {
            lines.push(`- ${resp}`);
          });
          lines.push('');
        }
        
        if (stakeholder.concerns.length > 0) {
          lines.push(`**${isPortuguese ? 'Preocupações' : 'Concerns'}**:`);
          stakeholder.concerns.forEach(concern => {
            lines.push(`- ${concern}`);
          });
          lines.push('');
        }
      });
    }

    // Consensus Summary (if available)
    if (prd.consensusData && this.config.includeConsensusMetrics) {
      lines.push(`## ${isPortuguese ? 'Resumo do Consenso' : 'Consensus Summary'}`);
      lines.push('');
      lines.push(`**${isPortuguese ? 'Nível de Consenso Final' : 'Final Consensus Level'}**: ${prd.consensusData.finalConsensusScore}%`);
      lines.push(`**${isPortuguese ? 'Rodadas Totais' : 'Total Rounds'}**: ${prd.consensusData.totalRounds}`);
      
      if (prd.consensusData.unresolvedItems.length > 0) {
        lines.push(`**${isPortuguese ? 'Itens Não Resolvidos' : 'Unresolved Items'}**:`);
        prd.consensusData.unresolvedItems.forEach(item => {
          lines.push(`- ${item}`);
        });
      }
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push(isPortuguese
      ? '*Documento de Requisitos do Produto gerado pelo PentaForge MCP Server*'
      : '*Product Requirements Document generated by PentaForge MCP Server*'
    );
    
    if (prd.metadata.consensusScore) {
      lines.push(isPortuguese
        ? `*Qualidade baseada em consenso: ${prd.metadata.consensusScore}% de acordo*`
        : `*Consensus-based quality: ${prd.metadata.consensusScore}% agreement*`
      );
    }

    return lines.join('\n');
  }

  /**
   * Create fallback PRD when extraction fails
   */
  private createFallbackPRD(prompt: string): PRDDocument {
    log.warn('🔄 Creating fallback PRD with minimal content');
    
    const { createEmptyPRD } = require('../types/prd.js');
    const prd = createEmptyPRD(this.config.language);
    
    // Set basic content
    prd.overview.problemStatement = prompt;
    prd.overview.objectives = [
      this.config.language.startsWith('pt') ? 
        'Implementar solução para o problema apresentado' :
        'Implement solution for the presented problem'
    ];

    prd.metadata.generationMethod = 'fallback';
    
    return prd;
  }

  /**
   * Calculate generation metrics
   */
  private calculateGenerationMetrics(
    prd: PRDDocument,
    validation: any,
    generationTime: number
  ): PRDGenerationMetrics {
    const sectionsGenerated = [
      prd.overview.objectives.length > 0 ? 1 : 0,
      prd.scope.included.length > 0 ? 1 : 0,
      prd.functionalRequirements.length > 0 ? 1 : 0,
      Object.values(prd.nonFunctionalRequirements).some((items: any) => items.length > 0) ? 1 : 0,
      prd.userJourney.length > 0 ? 1 : 0,
      prd.acceptanceCriteria.length > 0 ? 1 : 0,
      prd.stakeholders.length > 0 ? 1 : 0
    ].reduce((sum, count) => sum + count, 0);

    return {
      generationTime,
      sectionsGenerated,
      personaInsightsUsed: prd.metadata.generationMethod === 'persona' ? 1 : 0,
      aiGeneratedSections: prd.metadata.generationMethod === 'ai' ? sectionsGenerated : 0,
      fallbackSections: prd.metadata.generationMethod === 'fallback' ? sectionsGenerated : 0,
      validationScore: validation.completeness || 0
    };
  }

  /**
   * Log generation summary
   */
  private logGenerationSummary(metrics: PRDGenerationMetrics, validation: any): void {
    log.info('📊 PRD Generation Summary:');
    log.info(`   ⏱️  Generation Time: ${metrics.generationTime}ms`);
    log.info(`   📋 Sections Generated: ${metrics.sectionsGenerated}/7`);
    log.info(`   🤖 AI Enhanced Sections: ${metrics.aiGeneratedSections}`);
    log.info(`   ✅ Validation Score: ${metrics.validationScore}%`);
    
    if (validation.warnings?.length > 0) {
      log.warn(`   ⚠️  Warnings: ${validation.warnings.length}`);
    }
  }

  // Helper methods for AI enhancement

  private async enhanceOverviewWithAI(overview: any, _title: string): Promise<any> {
    // Implementation would go here - placeholder for now
    return overview;
  }

  private async generateAdditionalRequirementsWithAI(_prd: PRDDocument): Promise<any[]> {
    // Implementation would go here - placeholder for now
    return [];
  }

  private async generateNFRsForCategoryWithAI(_category: string, _problemStatement: string): Promise<any[]> {
    // Implementation would go here - placeholder for now
    return [];
  }

  private isEnhancedDiscussion(discussion: Discussion | EnhancedDiscussion): discussion is EnhancedDiscussion {
    return 'consensusHistory' in discussion && 'consensusReached' in discussion;
  }
}