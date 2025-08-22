/**
 * Parser for user-resolved UNRESOLVED_ISSUES.md files
 * Handles front matter extraction, checkbox parsing, and validation
 */

import * as fs from 'fs/promises';
import matter from 'gray-matter';
import { log } from './log.js';
// import MarkdownIt from 'markdown-it';
// import taskCheckbox from 'markdown-it-task-checkbox';
import { 
  ResolvedIssuesFile, 
  IssueResolution, 
  ValidationResult, 
  ValidationError,
  UnresolvedIssue,
  PersonaPosition,
  generateIssueId,
  validateResolutionCompleteness
} from '../types/unresolvedIssues.js';

/**
 * Main function to parse a resolved UNRESOLVED_ISSUES.md file
 * @param filePath - Path to the resolved file
 * @returns Parsed and validated file data
 */
export async function parseResolvedIssuesFile(filePath: string): Promise<ResolvedIssuesFile> {
  log.info(`🔄 Parsing resolved issues file: ${filePath}`);
  
  try {
    // Read the file content
    const rawContent = await fs.readFile(filePath, 'utf-8');
    log.debug(`📄 File content length: ${rawContent.length} characters`);
    
    // Parse front matter and content
    const parsed = matter(rawContent);
    log.debug(`✅ Front matter parsed successfully`);
    
    // Extract and validate front matter
    const frontMatter = validateFrontMatter(parsed.data);
    
    // Parse markdown content to extract issues and resolutions
    const { issues, resolutions } = await parseMarkdownContent(parsed.content, frontMatter.language);
    
    // Validate resolutions are complete
    const validationResult = validateResolutionCompleteness(issues, resolutions);
    if (!validationResult.isValid) {
      const errorMessage = formatValidationErrors(validationResult.errors);
      throw new Error(`Validation failed:\n${errorMessage}`);
    }
    
    const result: ResolvedIssuesFile = {
      discussionId: frontMatter.discussionId,
      timestamp: frontMatter.timestamp,
      totalIssues: frontMatter.totalIssues || issues.length,
      consensusThreshold: frontMatter.consensusThreshold || 85,
      status: 'resolved',
      issues,
      resolutions: validationResult.resolutions,
      language: frontMatter.language || 'en',
    };
    
    log.info(`✅ Parsed ${issues.length} issues with ${result.resolutions.length} resolutions`);
    return result;
    
  } catch (error) {
    log.error(`❌ Failed to parse resolved issues file: ${error}`);
    throw new Error(`Failed to parse resolved issues file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validates the front matter data from the YAML header
 */
function validateFrontMatter(data: any): {
  discussionId: string;
  timestamp: string;
  totalIssues?: number;
  consensusThreshold?: number;
  language: 'en' | 'pt-BR';
} {
  if (!data.discussionId || typeof data.discussionId !== 'string') {
    throw new Error('Missing or invalid discussionId in front matter');
  }
  
  if (!data.timestamp || typeof data.timestamp !== 'string') {
    throw new Error('Missing or invalid timestamp in front matter');
  }
  
  const language = data.language === 'pt-BR' ? 'pt-BR' : 'en';
  
  return {
    discussionId: data.discussionId,
    timestamp: data.timestamp,
    totalIssues: typeof data.totalIssues === 'number' ? data.totalIssues : undefined,
    consensusThreshold: typeof data.consensusThreshold === 'number' ? data.consensusThreshold : undefined,
    language,
  };
}

/**
 * Parses the markdown content to extract issues and user selections
 */
async function parseMarkdownContent(content: string, language: 'en' | 'pt-BR'): Promise<{
  issues: UnresolvedIssue[];
  resolutions: IssueResolution[];
}> {
  const isPortuguese = language === 'pt-BR';
  
  // Note: markdown parser with task checkbox support could be used for future enhanced parsing
  // Currently using regex-based parsing for better control
  // const md = new MarkdownIt({
  //   html: false, // Disable HTML for security
  //   xhtmlOut: false,
  //   breaks: false,
  //   linkify: false, // Disable auto-linking for security
  //   typographer: false,
  // }).use(taskCheckbox, {
  //   disabled: false,
  //   divWrap: false,
  //   divClass: 'checkbox',
  //   idPrefix: 'cbx_',
  // });
  
  // Parse the content into sections
  const sections = parseIntoSections(content, isPortuguese);
  log.debug(`📝 Found ${sections.length} issue sections in content`);
  
  const issues: UnresolvedIssue[] = [];
  const resolutions: IssueResolution[] = [];
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const issueId = generateIssueId(i);
    
    // Extract issue information
    const issue = extractIssueFromSection(section, issueId, isPortuguese);
    issues.push(issue);
    
    // Extract user selection
    const resolution = extractResolutionFromSection(section, issueId, isPortuguese);
    if (resolution) {
      resolutions.push(resolution);
    }
  }
  
  return { issues, resolutions };
}

/**
 * Parses the content into individual issue sections
 */
function parseIntoSections(content: string, isPortuguese: boolean): string[] {
  const issuePattern = isPortuguese 
    ? /##\s*Questão\s+\d+:.*?(?=##\s*Questão\s+\d+:|##\s*Resumo|$)/gs
    : /##\s*Issue\s+\d+:.*?(?=##\s*Issue\s+\d+:|##\s*Summary|$)/gs;
  
  const sections = content.match(issuePattern) || [];
  return sections;
}

/**
 * Extracts issue details from a section
 */
function extractIssueFromSection(section: string, issueId: string, isPortuguese: boolean): UnresolvedIssue {
  // Extract title from header
  const titleMatch = isPortuguese
    ? section.match(/##\s*Questão\s+\d+:\s*(.+)/)
    : section.match(/##\s*Issue\s+\d+:\s*(.+)/);
  
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown Issue';
  
  // Extract context
  const contextPattern = isPortuguese
    ? /\*\*Contexto:\*\*\s*(.+?)(?=\*\*)/s
    : /\*\*Context:\*\*\s*(.+?)(?=\*\*)/s;
  
  const contextMatch = section.match(contextPattern);
  const context = contextMatch ? contextMatch[1].trim() : 'No context provided';
  
  // Extract persona positions
  const personaPositions = extractPersonaPositions(section, isPortuguese);
  
  return {
    id: issueId,
    title,
    context,
    personaPositions,
  };
}

/**
 * Extracts persona positions from a section
 */
function extractPersonaPositions(section: string, isPortuguese: boolean): PersonaPosition[] {
  const positions: PersonaPosition[] = [];
  
  // Pattern to match persona sections
  const personaPattern = /\*\*(\w+):\*\*\s*(.+?)(?=\*\*|\n\n|$)/gs;
  let match;
  
  while ((match = personaPattern.exec(section)) !== null) {
    const personaName = match[1];
    const positionText = match[2].trim();
    
    // Skip non-persona entries (like "Context", "Custom Resolution", etc.)
    if (personaName.match(/^(Context|Contexto|Custom|Resolution|Your|Sua|Additional|Options|Opções|Reasoning|Raciocínio)$/i)) {
      continue;
    }
    
    // Extract reasoning if present
    const reasoningPattern = isPortuguese
      ? /\*\*Raciocínio:\*\*\s*(.+)/s
      : /\*\*Reasoning:\*\*\s*(.+)/s;
    
    const reasoningMatch = positionText.match(reasoningPattern);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';
    
    // Get position without reasoning
    const position = reasoningMatch ? positionText.replace(reasoningPattern, '').trim() : positionText;
    
    positions.push({
      personaName,
      position: position.replace(/^-\s*\[\s*\]\s*/, ''), // Remove unchecked checkbox prefix
      reasoning,
    });
  }
  
  return positions;
}

/**
 * Extracts user resolution from a section
 */
function extractResolutionFromSection(section: string, issueId: string, isPortuguese: boolean): IssueResolution | null {
  // Find checked checkboxes
  const checkedBoxPattern = /-\s*\[x\]\s*(.+)/gi;
  const checkedBoxes: string[] = [];
  let match;
  
  while ((match = checkedBoxPattern.exec(section)) !== null) {
    checkedBoxes.push(match[1].trim());
  }
  
  if (checkedBoxes.length === 0) {
    return null; // No selection made
  }
  
  if (checkedBoxes.length > 1) {
    log.warn(`⚠️  Multiple selections found for ${issueId}: ${checkedBoxes.length} checkboxes checked`);
    return null; // Invalid - multiple selections
  }
  
  const selectedText = checkedBoxes[0];
  
  // Determine selection type
  if (selectedText.toLowerCase().includes('custom') || selectedText.toLowerCase().includes('personalizado')) {
    // Extract custom resolution text
    const customText = extractCustomResolution(section, isPortuguese);
    return {
      issueId,
      selectedOption: 'custom',
      customResolution: customText,
    };
  }
  
  if (selectedText.toLowerCase().includes('indifferent') || selectedText.toLowerCase().includes('indiferente') ||
      selectedText.toLowerCase().includes('no strong preference') || selectedText.toLowerCase().includes('sem preferência')) {
    return {
      issueId,
      selectedOption: 'indifferent',
    };
  }
  
  // Extract persona name from selection
  const personaMatch = selectedText.match(/Accept\s+(\w+)'s\s+approach|Aceitar\s+abordagem\s+do\s+(\w+)/i);
  const personaName = personaMatch ? (personaMatch[1] || personaMatch[2]) : null;
  
  if (personaName) {
    return {
      issueId,
      selectedOption: 'persona',
      personaName,
    };
  }
  
  // Fallback - try to extract persona name from the beginning of the selection
  const fallbackPersonaMatch = selectedText.match(/^(\w+)/);
  if (fallbackPersonaMatch) {
    return {
      issueId,
      selectedOption: 'persona',
      personaName: fallbackPersonaMatch[1],
    };
  }
  
  return null; // Couldn't parse selection
}

/**
 * Extracts custom resolution text from a section
 */
function extractCustomResolution(section: string, isPortuguese: boolean): string {
  const customPattern = isPortuguese
    ? /\*\*Resolução Personalizada.*?:\*\*\s*\n```?\s*\n?([\s\S]*?)\n?```?/
    : /\*\*Custom Resolution.*?:\*\*\s*\n```?\s*\n?([\s\S]*?)\n?```?/;
  
  const match = section.match(customPattern);
  if (match) {
    return match[1].trim();
  }
  
  // Fallback pattern for text without code blocks
  const fallbackPattern = isPortuguese
    ? /\*\*Resolução Personalizada.*?:\*\*\s*\n(.+)/
    : /\*\*Custom Resolution.*?:\*\*\s*\n(.+)/;
  
  const fallbackMatch = section.match(fallbackPattern);
  return fallbackMatch ? fallbackMatch[1].trim() : '';
}

/**
 * Formats validation errors into a readable string
 */
function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(error => {
    return `❌ ${error.issueId}: ${error.message}\n   💡 ${error.suggestion}`;
  }).join('\n\n');
}

/**
 * Sanitizes user input to prevent potential security issues
 */
export function sanitizeUserInput(input: string): string {
  // Remove potential HTML/script tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove potential markdown link syntax that could be dangerous
  sanitized = sanitized.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  
  // Clean up any remaining artifacts from link removal
  sanitized = sanitized.replace(/\s*\)\s*/g, ' ');
  
  // Trim excessive whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  return sanitized;
}

/**
 * Helper function to validate user selections before processing
 * @param filePath - Path to the file to validate
 * @returns Validation result with errors and suggestions
 */
export async function validateUserSelections(filePath: string): Promise<ValidationResult> {
  try {
    const resolvedFile = await parseResolvedIssuesFile(filePath);
    return {
      isValid: true,
      errors: [],
      resolutions: resolvedFile.resolutions,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Parse error message to extract validation details
    if (errorMessage.includes('Validation failed:')) {
      const errors: ValidationError[] = [];
      const lines = errorMessage.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('❌')) {
          const issueMatch = line.match(/❌ (issue_\d+): (.+)/);
          if (issueMatch) {
            const suggestion = lines[i + 1]?.replace('   💡 ', '') || 'Please review and correct this issue';
            errors.push({
              issueId: issueMatch[1],
              errorType: 'invalid_format',
              message: issueMatch[2],
              suggestion,
            });
          }
        }
      }
      
      return {
        isValid: false,
        errors,
        resolutions: [],
      };
    }
    
    // Generic error handling
    return {
      isValid: false,
      errors: [{
        issueId: 'general',
        errorType: 'invalid_format',
        message: errorMessage,
        suggestion: 'Please ensure the file format is correct and all issues are resolved',
      }],
      resolutions: [],
    };
  }
}