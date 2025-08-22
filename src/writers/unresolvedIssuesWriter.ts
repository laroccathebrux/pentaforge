/**
 * Writer for interactive UNRESOLVED_ISSUES.md files
 * Generates structured markdown with persona positions and voting interfaces
 */

import { Discussion, EnhancedDiscussion } from '../engine/discussion.js';
import { ConsensusMetrics } from '../types/consensus.js';
import { UnresolvedIssue, PersonaPosition, generateIssueId } from '../types/unresolvedIssues.js';
import { Turn } from '../personas/base.js';
import { writeFileAtomic, joinPath } from '../lib/fs.js';
import { generateShortId } from '../lib/id.js';
import { log } from '../lib/log.js';

export interface UnresolvedIssuesWriterConfig {
  language: string;
  timestamp: string;
  prompt: string;
  outputDir: string;
  consensusThreshold: number;
}

/**
 * Main function to generate interactive UNRESOLVED_ISSUES.md file
 */
export async function writeUnresolvedIssuesMarkdown(
  discussion: Discussion | EnhancedDiscussion,
  consensusMetrics: ConsensusMetrics,
  config: UnresolvedIssuesWriterConfig
): Promise<string> {
  const { language, timestamp, prompt, outputDir, consensusThreshold } = config;
  const isPortuguese = language === 'pt' || language === 'pt-BR';
  
  log.info(`📝 Generating UNRESOLVED_ISSUES.md file (${isPortuguese ? 'Portuguese' : 'English'})`);
  
  // Generate discussion ID and filename
  const discussionId = `${timestamp}-${generateShortId(6)}`;
  const fileName = `UNRESOLVED_ISSUES_${timestamp}.md`;
  const filePath = joinPath(outputDir, fileName);
  
  // Extract unresolved issues with persona positions
  const issues = extractUnresolvedIssues(discussion, consensusMetrics, isPortuguese);
  
  log.info(`🔍 Extracted ${issues.length} unresolved issues from discussion`);
  
  // Generate markdown content
  const content = generateMarkdownContent(
    issues,
    discussionId,
    timestamp,
    prompt,
    consensusThreshold,
    isPortuguese
  );
  
  // Write file atomically
  await writeFileAtomic(filePath, content);
  
  log.info(`✅ Generated UNRESOLVED_ISSUES.md: ${filePath}`);
  return filePath;
}

/**
 * Extracts unresolved issues with persona positions from discussion
 */
function extractUnresolvedIssues(
  discussion: Discussion | EnhancedDiscussion,
  consensusMetrics: ConsensusMetrics,
  isPortuguese: boolean
): UnresolvedIssue[] {
  const issues: UnresolvedIssue[] = [];
  
  // Process each unresolved issue from consensus metrics
  consensusMetrics.unresolvedIssues.forEach((issueDescription, index) => {
    const issueId = generateIssueId(index);
    
    // Extract persona positions for this issue
    const personaPositions = extractPersonaPositionsForIssue(
      discussion.rounds,
      issueDescription,
      isPortuguese
    );
    
    // Generate context for this issue
    const context = generateIssueContext(
      discussion.rounds,
      issueDescription,
      isPortuguese
    );
    
    issues.push({
      id: issueId,
      title: issueDescription,
      context,
      personaPositions,
    });
  });
  
  // If no specific issues from consensus, create general conflicts
  if (issues.length === 0 && consensusMetrics.conflictingPositions.size > 0) {
    consensusMetrics.conflictingPositions.forEach((conflicts, _persona) => {
      conflicts.forEach((conflict, _index) => {
        const issueId = generateIssueId(issues.length);
        
        issues.push({
          id: issueId,
          title: conflict,
          context: isPortuguese
            ? `Conflito identificado nas discussões relacionado a: ${conflict}`
            : `Conflict identified in discussions regarding: ${conflict}`,
          personaPositions: extractPersonaPositionsForIssue(
            discussion.rounds,
            conflict,
            isPortuguese
          ),
        });
      });
    });
  }
  
  return issues;
}

/**
 * Extracts persona positions for a specific issue from discussion turns
 */
function extractPersonaPositionsForIssue(
  rounds: Turn[],
  issueDescription: string,
  isPortuguese: boolean
): PersonaPosition[] {
  const personaMap = new Map<string, PersonaPosition>();
  
  // Find relevant turns for this issue
  const relevantTurns = rounds.filter(turn => {
    const content = turn.content.toLowerCase();
    const issue = issueDescription.toLowerCase();
    
    // Simple relevance check - can be enhanced with AI
    return content.includes(issue) || 
           hasSemanticSimilarity(content, issue);
  });
  
  // Extract positions from relevant turns
  relevantTurns.forEach(turn => {
    const existingPosition = personaMap.get(turn.role);
    
    if (!existingPosition) {
      personaMap.set(turn.role, {
        personaName: turn.role.replace(/\s+/g, ''),
        position: extractPositionFromTurn(turn.content, issueDescription, isPortuguese),
        reasoning: extractReasoningFromTurn(turn.content, isPortuguese),
        confidence: 85, // Default confidence - could be enhanced with AI analysis
      });
    } else {
      // Update with most recent/comprehensive position
      if (turn.content.length > existingPosition.position.length) {
        existingPosition.position = extractPositionFromTurn(turn.content, issueDescription, isPortuguese);
        existingPosition.reasoning = extractReasoningFromTurn(turn.content, isPortuguese);
      }
    }
  });
  
  return Array.from(personaMap.values());
}

/**
 * Simple semantic similarity check for relevance
 */
function hasSemanticSimilarity(content: string, issue: string): boolean {
  const contentWords = content.toLowerCase().split(/\s+/);
  const issueWords = issue.toLowerCase().split(/\s+/);
  
  let matches = 0;
  issueWords.forEach(word => {
    if (word.length > 3 && contentWords.some(cw => cw.includes(word) || word.includes(cw))) {
      matches++;
    }
  });
  
  return matches >= Math.min(2, issueWords.length * 0.5);
}

/**
 * Extracts specific position from turn content
 */
function extractPositionFromTurn(content: string, _issueDescription: string, isPortuguese: boolean): string {
  // Try to find sentences that express a position or recommendation
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Look for position indicators
  const positionIndicators = isPortuguese
    ? ['recomendo', 'sugiro', 'devemos', 'deveríamos', 'prefiro', 'acho que', 'acredito que', 'proposta']
    : ['recommend', 'suggest', 'should', 'propose', 'prefer', 'think', 'believe', 'approach'];
  
  const positionSentences = sentences.filter(sentence => {
    const lower = sentence.toLowerCase();
    return positionIndicators.some(indicator => lower.includes(indicator));
  });
  
  if (positionSentences.length > 0) {
    return positionSentences[0].trim();
  }
  
  // Fallback: use first substantial sentence
  const substantialSentences = sentences.filter(s => s.trim().length > 30);
  return substantialSentences.length > 0 ? substantialSentences[0].trim() : content.substring(0, 100).trim() + '...';
}

/**
 * Extracts reasoning from turn content
 */
function extractReasoningFromTurn(content: string, isPortuguese: boolean): string {
  // Look for reasoning indicators
  const reasoningIndicators = isPortuguese
    ? ['porque', 'devido', 'uma vez que', 'considerando', 'já que', 'visto que', 'pois']
    : ['because', 'since', 'due to', 'given that', 'considering', 'as', 'for'];
  
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  const reasoningSentences = sentences.filter(sentence => {
    const lower = sentence.toLowerCase();
    return reasoningIndicators.some(indicator => lower.includes(indicator));
  });
  
  if (reasoningSentences.length > 0) {
    return reasoningSentences[0].trim();
  }
  
  // Fallback: use a middle section of the content that might contain reasoning
  const words = content.split(/\s+/);
  if (words.length > 20) {
    const middleStart = Math.floor(words.length * 0.3);
    const middleEnd = Math.floor(words.length * 0.7);
    return words.slice(middleStart, middleEnd).join(' ').trim() + '...';
  }
  
  return content.substring(0, 80).trim() + '...';
}

/**
 * Generates contextual information for an issue
 */
function generateIssueContext(
  rounds: Turn[],
  issueDescription: string,
  isPortuguese: boolean
): string {
  const relevantTurns = rounds.filter(turn => {
    const content = turn.content.toLowerCase();
    const issue = issueDescription.toLowerCase();
    return content.includes(issue) || hasSemanticSimilarity(content, issue);
  });
  
  if (relevantTurns.length === 0) {
    return isPortuguese
      ? `Esta questão foi identificada durante a discussão mas não houve consenso entre os participantes.`
      : `This issue was identified during the discussion but consensus was not reached among participants.`;
  }
  
  const participantsInvolved = new Set(relevantTurns.map(t => t.role)).size;
  
  return isPortuguese
    ? `Esta questão foi discutida por ${participantsInvolved} participantes ao longo de ${relevantTurns.length} intervenções, mas não se chegou a um consenso.`
    : `This issue was discussed by ${participantsInvolved} participants across ${relevantTurns.length} turns, but consensus was not reached.`;
}

/**
 * Generates the complete markdown content
 */
function generateMarkdownContent(
  issues: UnresolvedIssue[],
  discussionId: string,
  timestamp: string,
  prompt: string,
  consensusThreshold: number,
  isPortuguese: boolean
): string {
  const lines: string[] = [];
  
  // Front matter
  lines.push('---');
  lines.push(`discussionId: "${discussionId}"`);
  lines.push(`timestamp: "${timestamp}"`);
  lines.push(`consensusThreshold: ${consensusThreshold}`);
  lines.push(`totalIssues: ${issues.length}`);
  lines.push(`status: "pending"`);
  lines.push(`language: "${isPortuguese ? 'pt-BR' : 'en'}"`);
  lines.push('---');
  lines.push('');
  
  // Header
  const title = isPortuguese 
    ? 'Questões Não Resolvidas - Resolução Interativa'
    : 'Unresolved Issues - Interactive Resolution';
  lines.push(`# ${title}`);
  lines.push('');
  
  // Metadata
  // Convert custom timestamp format to readable date or use as-is if conversion fails
  let displayDate: string;
  try {
    // Try to parse custom timestamp format (YYYY-MM-DDTHHMMSSZ) to proper ISO
    const isoTimestamp = timestamp.replace(/(\d{4}-\d{2}-\d{2}T)(\d{2})(\d{2})(\d{2})(Z)/, '$1$2:$3:$4$5');
    displayDate = new Date(isoTimestamp).toISOString();
  } catch {
    // Fallback to raw timestamp if parsing fails
    displayDate = timestamp;
  }
  lines.push(`**${isPortuguese ? 'Gerado em' : 'Generated on'}:** ${displayDate}`);
  lines.push(`**${isPortuguese ? 'ID da Discussão' : 'Discussion ID'}:** ${discussionId}`);
  lines.push(`**${isPortuguese ? 'Prompt Original' : 'Original Prompt'}:** ${prompt}`);
  lines.push(`**${isPortuguese ? 'Limiar de Consenso' : 'Consensus Threshold'}:** ${consensusThreshold}%`);
  lines.push(`**${isPortuguese ? 'Total de Questões' : 'Total Issues'}:** ${issues.length}`);
  lines.push('');
  
  // Instructions
  lines.push(`## ${isPortuguese ? 'Instruções' : 'Instructions'}`);
  lines.push('');
  if (isPortuguese) {
    lines.push('Por favor, revise cada questão não resolvida abaixo e selecione sua abordagem preferida marcando **exatamente UMA** opção com [x] para cada questão. Após resolver todas as questões, salve este arquivo e execute o PentaForge novamente usando o parâmetro `unresolvedIssuesFile`.');
  } else {
    lines.push('Please review each unresolved issue below and select your preferred approach by marking **exactly ONE** option with [x] for each issue. Once all issues are resolved, save this file and run PentaForge again using the `unresolvedIssuesFile` parameter.');
  }
  lines.push('');
  
  const exampleTitle = isPortuguese ? '### Exemplo' : '### Example';
  lines.push(exampleTitle);
  lines.push('```markdown');
  if (isPortuguese) {
    lines.push('- [x] Aceitar abordagem do SolutionsArchitect');
    lines.push('- [ ] Aceitar abordagem do BusinessAnalyst');  
    lines.push('- [ ] Sem preferência forte - equipe decide');
    lines.push('- [ ] Resolução personalizada (descrever abaixo)');
  } else {
    lines.push('- [x] Accept SolutionsArchitect\'s approach');
    lines.push('- [ ] Accept BusinessAnalyst\'s approach');
    lines.push('- [ ] No strong preference - team decides');
    lines.push('- [ ] Custom resolution (describe below)');
  }
  lines.push('```');
  lines.push('');
  
  lines.push('---');
  lines.push('');
  
  // Issues
  issues.forEach((issue, index) => {
    generateIssueSection(lines, issue, index + 1, isPortuguese);
    if (index < issues.length - 1) {
      lines.push('---');
      lines.push('');
    }
  });
  
  // Summary
  lines.push('---');
  lines.push('');
  lines.push(`## ${isPortuguese ? 'Resumo' : 'Summary'}`);
  lines.push('');
  lines.push(`- **${isPortuguese ? 'Total de Questões' : 'Total Issues'}:** ${issues.length}`);
  lines.push(`- **${isPortuguese ? 'Status' : 'Status'}:** ⏳ ${isPortuguese ? 'Aguardando Resolução' : 'Pending Resolution'}`);
  lines.push(`- **${isPortuguese ? 'Próximo Passo' : 'Next Step'}:** ${isPortuguese ? 'Marque suas preferências acima e execute novamente o PentaForge com este arquivo' : 'Mark your preferences above and re-run PentaForge with this file'}`);
  lines.push('');
  
  // Footer
  lines.push('---');
  const footer = isPortuguese 
    ? '*Gerado pelo PentaForge - Sistema de Resolução Interativa de Questões*'
    : '*Generated by PentaForge - Interactive Issue Resolution System*';
  lines.push(footer);
  
  return lines.join('\n');
}

/**
 * Generates a single issue section in the markdown
 */
function generateIssueSection(
  lines: string[],
  issue: UnresolvedIssue,
  issueNumber: number,
  isPortuguese: boolean
): void {
  // Issue header
  const issueHeader = isPortuguese 
    ? `## Questão ${issueNumber}: ${issue.title}`
    : `## Issue ${issueNumber}: ${issue.title}`;
  lines.push(issueHeader);
  lines.push('');
  
  // Context
  const contextLabel = isPortuguese ? '**Contexto:**' : '**Context:**';
  lines.push(`${contextLabel} ${issue.context}`);
  lines.push('');
  
  // Persona positions
  const positionsLabel = isPortuguese ? '**Posições dos Especialistas:**' : '**Expert Positions:**';
  lines.push(positionsLabel);
  lines.push('');
  
  issue.personaPositions.forEach(position => {
    lines.push(`### ${position.personaName}`);
    lines.push(`**${isPortuguese ? 'Posição' : 'Position'}:** ${position.position}`);
    if (position.reasoning) {
      lines.push(`**${isPortuguese ? 'Raciocínio' : 'Reasoning'}:** ${position.reasoning}`);
    }
    lines.push('');
  });
  
  // Resolution options
  const resolutionLabel = isPortuguese ? '**Sua Resolução:**' : '**Your Resolution:**';
  lines.push(resolutionLabel);
  
  // Persona options
  issue.personaPositions.forEach(position => {
    const optionText = isPortuguese
      ? `Aceitar abordagem do ${position.personaName}`
      : `Accept ${position.personaName}'s approach`;
    lines.push(`- [ ] ${optionText}`);
  });
  
  // Additional options
  const neutralOption = isPortuguese
    ? 'Sem preferência forte - equipe decide'
    : 'No strong preference - team decides';
  lines.push(`- [ ] ${neutralOption}`);
  
  const customOption = isPortuguese
    ? 'Resolução personalizada (descrever abaixo)'
    : 'Custom resolution (describe below)';
  lines.push(`- [ ] ${customOption}`);
  lines.push('');
  
  // Custom resolution area
  const customLabel = isPortuguese ? '**Resolução Personalizada:**' : '**Custom Resolution:**';
  const customPlaceholder = isPortuguese
    ? '[Descreva sua abordagem preferida aqui se selecionou a opção personalizada]'
    : '[Describe your preferred approach here if you selected the custom option]';
  
  lines.push(customLabel);
  lines.push('```');
  lines.push(customPlaceholder);
  lines.push('```');
  lines.push('');
}