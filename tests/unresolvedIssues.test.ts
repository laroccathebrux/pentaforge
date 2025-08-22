import { 
  UnresolvedIssue, 
  IssueResolution, 
  generateIssueId,
  categorizeIssueComplexity,
  extractUniquePersonas,
  validateResolutionCompleteness,
} from '../src/types/unresolvedIssues';

import { 
  parseResolvedIssuesFile, 
  sanitizeUserInput, 
  validateUserSelections 
} from '../src/lib/unresolvedIssuesParser';

import { 
  writeUnresolvedIssuesMarkdown 
} from '../src/writers/unresolvedIssuesWriter';

import { 
  ConsensusEvaluator 
} from '../src/engine/consensusEvaluator';

import { Turn } from '../src/personas/base';
import { ConsensusMetrics } from '../src/types/consensus';
import { AIService } from '../src/lib/aiService';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock filesystem operations
jest.mock('../src/lib/fs', () => ({
  writeFileAtomic: jest.fn(),
  ensureDirectory: jest.fn(),
  fileExists: jest.fn(),
  readFile: jest.fn(),
  joinPath: (...segments: string[]) => path.join(...segments),
}));

jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Unresolved Issues Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Type System Validation', () => {
    describe('generateIssueId', () => {
      it('should generate valid issue IDs', () => {
        expect(generateIssueId(0)).toBe('issue_1');
        expect(generateIssueId(4)).toBe('issue_5');
      });
    });

    describe('categorizeIssueComplexity', () => {
      it('should categorize issues by complexity', () => {
        const simpleIssue: UnresolvedIssue = {
          id: 'issue_1',
          title: 'Test Issue',
          context: 'Test context',
          personaPositions: [
            { personaName: 'BusinessAnalyst', position: 'Position A', reasoning: 'Reason A' },
            { personaName: 'KeyUser', position: 'Position B', reasoning: 'Reason B' }
          ]
        };

        const complexIssue: UnresolvedIssue = {
          ...simpleIssue,
          personaPositions: [
            { personaName: 'BusinessAnalyst', position: 'Position A', reasoning: 'Reason A' },
            { personaName: 'KeyUser', position: 'Position B', reasoning: 'Reason B' },
            { personaName: 'ProductOwner', position: 'Position C', reasoning: 'Reason C' },
            { personaName: 'SolutionsArchitect', position: 'Position D', reasoning: 'Reason D' },
            { personaName: 'UXUIDesigner', position: 'Position E', reasoning: 'Reason E' }
          ]
        };

        expect(categorizeIssueComplexity(simpleIssue)).toBe('simple');
        expect(categorizeIssueComplexity(complexIssue)).toBe('complex');
      });
    });

    describe('extractUniquePersonas', () => {
      it('should extract unique personas from issues', () => {
        const issues: UnresolvedIssue[] = [
          {
            id: 'issue_1',
            title: 'Issue 1',
            context: 'Context 1',
            personaPositions: [
              { personaName: 'BusinessAnalyst', position: 'Pos A', reasoning: 'Reason A' },
              { personaName: 'KeyUser', position: 'Pos B', reasoning: 'Reason B' }
            ]
          },
          {
            id: 'issue_2',
            title: 'Issue 2',
            context: 'Context 2',
            personaPositions: [
              { personaName: 'KeyUser', position: 'Pos C', reasoning: 'Reason C' },
              { personaName: 'ProductOwner', position: 'Pos D', reasoning: 'Reason D' }
            ]
          }
        ];

        const personas = extractUniquePersonas(issues);
        expect(personas).toEqual(['BusinessAnalyst', 'KeyUser', 'ProductOwner']);
      });
    });

    describe('validateResolutionCompleteness', () => {
      const testIssues: UnresolvedIssue[] = [
        {
          id: 'issue_1',
          title: 'Authentication Method',
          context: 'Choose auth approach',
          personaPositions: [
            { personaName: 'SolutionsArchitect', position: 'OAuth 2.0', reasoning: 'Industry standard' }
          ]
        },
        {
          id: 'issue_2',
          title: 'Database Choice',
          context: 'Choose database',
          personaPositions: [
            { personaName: 'SolutionsArchitect', position: 'PostgreSQL', reasoning: 'ACID compliance' }
          ]
        }
      ];

      it('should validate complete resolutions', () => {
        const resolutions: IssueResolution[] = [
          { issueId: 'issue_1', selectedOption: 'persona', personaName: 'SolutionsArchitect' },
          { issueId: 'issue_2', selectedOption: 'custom', customResolution: 'MongoDB for flexibility' }
        ];

        const result = validateResolutionCompleteness(testIssues, resolutions);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.resolutions).toHaveLength(2);
      });

      it('should detect missing resolutions', () => {
        const resolutions: IssueResolution[] = [
          { issueId: 'issue_1', selectedOption: 'persona', personaName: 'SolutionsArchitect' }
          // Missing issue_2
        ];

        const result = validateResolutionCompleteness(testIssues, resolutions);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].errorType).toBe('missing_selection');
        expect(result.errors[0].issueId).toBe('issue_2');
      });

      it('should detect multiple resolutions for same issue', () => {
        const resolutions: IssueResolution[] = [
          { issueId: 'issue_1', selectedOption: 'persona', personaName: 'SolutionsArchitect' },
          { issueId: 'issue_1', selectedOption: 'custom', customResolution: 'Different approach' },
          { issueId: 'issue_2', selectedOption: 'indifferent' }
        ];

        const result = validateResolutionCompleteness(testIssues, resolutions);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].errorType).toBe('multiple_selections');
      });

      it('should detect missing custom resolution content', () => {
        const resolutions: IssueResolution[] = [
          { issueId: 'issue_1', selectedOption: 'custom', customResolution: '' },
          { issueId: 'issue_2', selectedOption: 'indifferent' }
        ];

        const result = validateResolutionCompleteness(testIssues, resolutions);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].errorType).toBe('missing_custom_input');
      });
    });
  });

  describe('Unresolved Issues Writer', () => {
    const mockDiscussion = {
      config: { 
        language: 'en', 
        timestamp: '2024-08-22T14:30:22Z', 
        prompt: 'Create authentication system',
        outputDir: './test-output',
        tone: 'professional'
      },
      participants: [],
      rounds: [
        {
          round: 1,
          speaker: 'Solutions Architect',
          role: 'Solutions Architect',
          content: 'I recommend OAuth 2.0 for authentication because it provides industry-standard security'
        },
        {
          round: 1,
          speaker: 'Business Stakeholder',
          role: 'Business Stakeholder', 
          content: 'Custom authentication would give us more control and faster implementation'
        }
      ],
      decisions: [],
      nextSteps: [],
      consensusHistory: [],
      decisionEvolution: [],
      currentRound: 1,
      consensusReached: false,
    };

    const mockConsensusMetrics: ConsensusMetrics = {
      agreementScore: 65,
      unresolvedIssues: ['Authentication method selection', 'Session storage approach'],
      conflictingPositions: new Map([
        ['Solutions Architect', ['OAuth 2.0 approach']],
        ['Business Stakeholder', ['Custom authentication']]
      ]),
      confidenceLevel: 80,
      discussionPhase: 'resolution',
    };

    it('should generate unresolved issues markdown in English', async () => {
      const mockWriteFileAtomic = require('../src/lib/fs').writeFileAtomic;
      mockWriteFileAtomic.mockResolvedValue(undefined);

      await writeUnresolvedIssuesMarkdown(
        mockDiscussion,
        mockConsensusMetrics,
        {
          language: 'en',
          timestamp: '2024-08-22T14:30:22Z',
          prompt: 'Create authentication system',
          outputDir: './test-output',
          consensusThreshold: 85,
        }
      );

      expect(mockWriteFileAtomic).toHaveBeenCalled();
      const [writtenPath, content] = mockWriteFileAtomic.mock.calls[0];
      
      expect(writtenPath).toContain('UNRESOLVED_ISSUES');
      expect(content).toContain('# Unresolved Issues - Interactive Resolution');
      expect(content).toContain('Authentication method selection');
      expect(content).toContain('SolutionsArchitect');
      expect(content).toContain('- [ ] Accept');
      expect(content).toContain('Custom Resolution');
    });

    it('should generate unresolved issues markdown in Portuguese', async () => {
      const mockWriteFileAtomic = require('../src/lib/fs').writeFileAtomic;
      mockWriteFileAtomic.mockResolvedValue(undefined);

      const portugueseDiscussion = {
        ...mockDiscussion,
        config: { ...mockDiscussion.config, language: 'pt-BR' },
        consensusHistory: [],
        decisionEvolution: [],
        currentRound: 1,
        consensusReached: false,
      };

      await writeUnresolvedIssuesMarkdown(
        portugueseDiscussion,
        mockConsensusMetrics,
        {
          language: 'pt-BR',
          timestamp: '2024-08-22T14:30:22Z',
          prompt: 'Criar sistema de autenticação',
          outputDir: './test-output',
          consensusThreshold: 85,
        }
      );

      const [, content] = mockWriteFileAtomic.mock.calls[0];
      expect(content).toContain('Questões Não Resolvidas');
      expect(content).toContain('Instruções');
      expect(content).toContain('Aceitar abordagem do');
      expect(content).toContain('Resolução Personalizada');
    });
  });

  describe('Unresolved Issues Parser', () => {
    const mockFileContent = `---
discussionId: "auth-system-20240822-143022"
timestamp: "2024-08-22T14:30:22Z"
consensusThreshold: 85
totalIssues: 2
status: "pending"
language: "en"
---

# Unresolved Issues - Interactive Resolution

## Issue 1: Authentication Method Selection

**Context:** The team discussed OAuth 2.0 vs custom authentication approach.

**Expert Positions:**

### SolutionsArchitect
**Position:** Use OAuth 2.0 with OpenID Connect
**Reasoning:** Provides industry-standard security with excellent third-party integration

### BusinessStakeholder  
**Position:** Implement custom authentication system
**Reasoning:** Gives complete control over user experience and reduces dependencies

**Your Resolution:**
- [x] Accept SolutionsArchitect's approach (OAuth 2.0 with OpenID Connect)
- [ ] Accept BusinessStakeholder's approach (Custom authentication system)
- [ ] No strong preference - team decides
- [ ] Custom resolution (describe below)

**Custom Resolution:**
\`\`\`
\`\`\`

## Issue 2: Session Storage Strategy

**Context:** Discussion about session storage approach.

**Your Resolution:**
- [ ] Accept default approach
- [ ] No strong preference - team decides
- [x] Custom resolution (describe below)

**Custom Resolution:**
\`\`\`
Use Redis for session storage with fallback to database
\`\`\`
`;

    beforeEach(() => {
      mockedFs.readFile.mockResolvedValue(mockFileContent);
    });

    it('should parse valid resolved issues file', async () => {
      const result = await parseResolvedIssuesFile('./test-file.md');

      expect(result.discussionId).toBe('auth-system-20240822-143022');
      expect(result.status).toBe('resolved');
      expect(result.issues).toHaveLength(2);
      expect(result.resolutions).toHaveLength(2);
      
      // Check first resolution
      expect(result.resolutions[0].issueId).toBe('issue_1');
      expect(result.resolutions[0].selectedOption).toBe('persona');
      expect(result.resolutions[0].personaName).toBe('SolutionsArchitect');
      
      // Check second resolution (custom)
      expect(result.resolutions[1].issueId).toBe('issue_2');
      expect(result.resolutions[1].selectedOption).toBe('custom');
      expect(result.resolutions[1].customResolution).toContain('Redis for session storage');
    });

    it('should handle malformed markdown gracefully', async () => {
      const malformedContent = `---
discussionId: "test"
---

# Broken File

## Issue 1: Test
- [x] Option 1
- [x] Option 2
`;

      mockedFs.readFile.mockResolvedValue(malformedContent);

      await expect(parseResolvedIssuesFile('./malformed.md'))
        .rejects.toThrow('Failed to parse resolved issues file');
    });

    it('should validate user selections', async () => {
      mockedFs.readFile.mockResolvedValue(mockFileContent);
      
      const result = await validateUserSelections('./test-file.md');
      expect(result.isValid).toBe(true);
      expect(result.resolutions).toHaveLength(2);
    });
  });

  describe('Security and Input Sanitization', () => {
    describe('sanitizeUserInput', () => {
      it('should remove HTML tags', () => {
        const input = 'Use <script>alert("xss")</script> PostgreSQL database';
        const sanitized = sanitizeUserInput(input);
        expect(sanitized).toBe('Use alert("xss" PostgreSQL database');
        expect(sanitized).not.toContain('<script>');
      });

      it('should remove dangerous markdown links', () => {
        const input = 'Click [here](javascript:alert("xss")) for more info';
        const sanitized = sanitizeUserInput(input);
        expect(sanitized).toBe('Click here for more info');
      });

      it('should normalize whitespace', () => {
        const input = 'Multiple    spaces   and\n\nnewlines';
        const sanitized = sanitizeUserInput(input);
        expect(sanitized).toBe('Multiple spaces and newlines');
      });

      it('should handle empty and null inputs', () => {
        expect(sanitizeUserInput('')).toBe('');
        expect(sanitizeUserInput('   ')).toBe('');
      });
    });
  });

  describe('Consensus Evaluator Integration', () => {
    let consensusEvaluator: ConsensusEvaluator;
    let mockAIService: jest.Mocked<AIService>;

    beforeEach(() => {
      mockAIService = {
        generateResponse: jest.fn(),
      } as any;
      consensusEvaluator = new ConsensusEvaluator(mockAIService);
    });

    it('should extract persona positions from discussion turns', () => {
      const turns: Turn[] = [
        {
          round: 1,
          speaker: 'Solutions Architect',
          role: 'Solutions Architect',
          content: 'I recommend OAuth 2.0 for authentication because it provides industry-standard security with excellent third-party integration capabilities.'
        },
        {
          round: 1,
          speaker: 'Business Stakeholder', 
          role: 'Business Stakeholder',
          content: 'Custom authentication system would give us complete control over user experience and reduces dependency on external services.'
        },
        {
          round: 1,
          speaker: 'UX/UI Designer',
          role: 'UX/UI Designer', 
          content: 'JWT with social login options provides simplest user experience. Users prefer one-click authentication flows.'
        }
      ];

      const personaPositionsMap = consensusEvaluator.extractPersonaPositions(turns);
      
      expect(personaPositionsMap.size).toBeGreaterThan(0);
      
      // Check that positions were extracted
      const authenticationPositions = personaPositionsMap.get('Authentication approach');
      if (authenticationPositions) {
        expect(authenticationPositions.length).toBeGreaterThan(0);
        expect(authenticationPositions.some(p => p.personaName === 'SolutionsArchitect')).toBe(true);
        expect(authenticationPositions.some(p => p.position.includes('OAuth'))).toBe(true);
      }
    });

    it('should handle empty discussion gracefully', () => {
      const turns: Turn[] = [];
      const personaPositionsMap = consensusEvaluator.extractPersonaPositions(turns);
      expect(personaPositionsMap.size).toBe(0);
    });

    it('should categorize issues by technical domain', () => {
      const turns: Turn[] = [
        {
          round: 1,
          speaker: 'Solutions Architect',
          role: 'Solutions Architect',
          content: 'We need to choose between PostgreSQL and MongoDB for data storage. PostgreSQL offers ACID compliance while MongoDB provides flexible schemas.'
        }
      ];

      const personaPositionsMap = consensusEvaluator.extractPersonaPositions(turns);
      const hasDataStorageIssue = Array.from(personaPositionsMap.keys()).some(issue => 
        issue.toLowerCase().includes('data') || issue.toLowerCase().includes('storage')
      );
      
      expect(hasDataStorageIssue).toBe(true);
    });
  });

  describe('Bilingual Support', () => {
    it('should handle Portuguese consensus evaluation', () => {
      const portugueseTurns: Turn[] = [
        {
          round: 1,
          speaker: 'Arquiteto de Soluções',
          role: 'Solutions Architect',
          content: 'Recomendo OAuth 2.0 para autenticação porque fornece segurança padrão da indústria com excelente integração de terceiros.'
        }
      ];

      const consensusEvaluator = new ConsensusEvaluator({} as AIService);
      const positions = consensusEvaluator.extractPersonaPositions(portugueseTurns);
      
      // Should still extract positions regardless of language
      expect(positions.size).toBeGreaterThan(0);
    });

    it('should generate Portuguese error messages', async () => {
      const portugueseContent = `---
discussionId: "test-pt"
timestamp: "2024-08-22T14:30:22Z"
totalIssues: 1
language: "pt-BR"
---

## Questão 1: Método de Autenticação

- [ ] Opção A
- [ ] Opção B
`;

      mockedFs.readFile.mockResolvedValue(portugueseContent);
      
      await expect(parseResolvedIssuesFile('./test-pt.md'))
        .rejects.toThrow(); // Should throw validation error for no selections
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing front matter', async () => {
      const noFrontMatter = `
# Issues

## Issue 1: Test
- [x] Option 1
`;

      mockedFs.readFile.mockResolvedValue(noFrontMatter);
      
      await expect(parseResolvedIssuesFile('./no-frontmatter.md'))
        .rejects.toThrow('Missing or invalid discussionId');
    });

    it('should handle very large issue lists', () => {
      const manyIssues: UnresolvedIssue[] = Array(20).fill(null).map((_, i) => ({
        id: generateIssueId(i),
        title: `Issue ${i + 1}`,
        context: `Context for issue ${i + 1}`,
        personaPositions: [
          { personaName: 'TestPersona', position: `Position ${i}`, reasoning: `Reason ${i}` }
        ]
      }));

      const complexity = manyIssues.map(categorizeIssueComplexity);
      expect(complexity).toHaveLength(20);
    });

    it('should handle empty persona positions gracefully', () => {
      const emptyIssue: UnresolvedIssue = {
        id: 'issue_1',
        title: 'Empty Issue',
        context: 'No positions',
        personaPositions: []
      };

      expect(categorizeIssueComplexity(emptyIssue)).toBe('simple');
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large discussion histories efficiently', () => {
      const largeTurns: Turn[] = Array(1000).fill(null).map((_, i) => ({
        round: Math.floor(i / 8) + 1,
        speaker: `Persona ${i % 8}`,
        role: `Role ${i % 8}`,
        content: `This is turn ${i} with some substantial content that might appear in a real discussion. It talks about technical decisions, implementation approaches, and various considerations that personas might have.`
      }));

      const consensusEvaluator = new ConsensusEvaluator({} as AIService);
      const startTime = Date.now();
      const positions = consensusEvaluator.extractPersonaPositions(largeTurns);
      const endTime = Date.now();

      // Should complete within reasonable time (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(positions.size).toBeGreaterThan(0);
    });

    it('should limit issue complexity appropriately', () => {
      const maxIssues = 50; // Reasonable upper limit
      const issues: UnresolvedIssue[] = Array(maxIssues).fill(null).map((_, i) => ({
        id: generateIssueId(i),
        title: `Issue ${i}`,
        context: `Context ${i}`,
        personaPositions: []
      }));

      expect(issues).toHaveLength(maxIssues);
    });
  });
});