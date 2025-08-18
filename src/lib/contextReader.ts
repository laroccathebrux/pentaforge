import * as fs from 'fs/promises';
import * as path from 'path';
import { log } from './log.js';

export interface ProjectContext {
  claudeMd?: string;
  docsFiles: Array<{
    path: string;
    content: string;
    relativePath: string;
  }>;
  summary: string;
}

export async function readProjectContext(projectRoot: string = '.'): Promise<ProjectContext> {
  log.debug('🔍 Reading project context...');
  
  const context: ProjectContext = {
    docsFiles: [],
    summary: '',
  };

  // Read CLAUDE.md if it exists
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  try {
    const claudeMdContent = await fs.readFile(claudeMdPath, 'utf-8');
    context.claudeMd = claudeMdContent;
    log.debug('✅ CLAUDE.md found and loaded');
  } catch (error) {
    log.debug('ℹ️  CLAUDE.md not found, skipping');
  }

  // Read docs/ directory recursively if it exists
  const docsPath = path.join(projectRoot, 'docs');
  try {
    await fs.access(docsPath);
    const docsFiles = await readDocsDirectory(docsPath, docsPath);
    context.docsFiles = docsFiles;
    log.debug(`✅ Found ${docsFiles.length} documentation files`);
  } catch (error) {
    // Directory doesn't exist, skip silently
    log.debug('ℹ️  docs/ directory not found, skipping');
  }

  // Generate summary
  context.summary = generateContextSummary(context);
  
  log.info(`📖 Project context loaded: CLAUDE.md=${!!context.claudeMd}, docs files=${context.docsFiles.length}`);
  return context;
}

async function readDocsDirectory(dirPath: string, basePath: string): Promise<Array<{path: string, content: string, relativePath: string}>> {
  const files: Array<{path: string, content: string, relativePath: string}> = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      
      if (entry.isDirectory()) {
        // Recursively read subdirectories
        const subFiles = await readDocsDirectory(fullPath, basePath);
        files.push(...subFiles);
      } else if (entry.isFile() && isDocumentationFile(entry.name)) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({
            path: fullPath,
            content,
            relativePath,
          });
          log.debug(`📄 Loaded: ${relativePath}`);
        } catch (error) {
          log.warn(`⚠️  Failed to read ${relativePath}: ${error}`);
        }
      }
    }
  } catch (error) {
    log.debug(`Failed to read directory ${dirPath}: ${error}`);
  }
  
  return files;
}

function isDocumentationFile(filename: string): boolean {
  const docExtensions = ['.md', '.txt', '.rst', '.adoc', '.org'];
  const ext = path.extname(filename).toLowerCase();
  return docExtensions.includes(ext);
}

function generateContextSummary(context: ProjectContext): string {
  const parts: string[] = [];
  
  if (context.claudeMd) {
    parts.push('Project guidelines and architecture from CLAUDE.md');
  }
  
  if (context.docsFiles.length > 0) {
    const fileTypes = context.docsFiles.reduce((acc, file) => {
      const ext = path.extname(file.relativePath);
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const typesSummary = Object.entries(fileTypes)
      .map(([ext, count]) => `${count} ${ext} files`)
      .join(', ');
    
    parts.push(`Documentation files: ${typesSummary}`);
  }
  
  if (parts.length === 0) {
    return 'No project context files found';
  }
  
  return `Project context includes: ${parts.join(' and ')}`;
}

export function formatContextForPersonas(context: ProjectContext, language: string = 'en'): string {
  const isPortuguese = language === 'pt' || language === 'pt-BR';
  
  if (!context.claudeMd && context.docsFiles.length === 0) {
    return isPortuguese 
      ? 'Nenhum contexto específico do projeto disponível.'
      : 'No specific project context available.';
  }
  
  const sections: string[] = [];
  
  // Add header
  sections.push(isPortuguese 
    ? '## CONTEXTO DO PROJETO'
    : '## PROJECT CONTEXT'
  );
  
  // Add CLAUDE.md content if available
  if (context.claudeMd) {
    sections.push(isPortuguese 
      ? '\n### Diretrizes do Projeto (CLAUDE.md):'
      : '\n### Project Guidelines (CLAUDE.md):'
    );
    sections.push(context.claudeMd);
  }
  
  // Add docs files if available
  if (context.docsFiles.length > 0) {
    sections.push(isPortuguese 
      ? '\n### Documentação Adicional:'
      : '\n### Additional Documentation:'
    );
    
    context.docsFiles.forEach(file => {
      sections.push(`\n#### ${file.relativePath}:`);
      sections.push(file.content);
    });
  }
  
  return sections.join('\n');
}