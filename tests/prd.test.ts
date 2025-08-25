import { executeRoundtable, RoundtableInput } from '../src/tools/roundtable';
import { PRDWriter } from '../src/writers/prdWriter';
import { PRDExtractor } from '../src/writers/prdExtractor';
import { createEmptyPRD, validatePRDCompleteness, isPRDDocument, isFunctionalRequirement } from '../src/types/prd';
import * as fs from 'fs/promises';

// Mock the fs module
jest.mock('fs/promises');
jest.mock('../src/lib/log', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the contextReader module
jest.mock('../src/lib/contextReader', () => ({
  readProjectContext: jest.fn().mockResolvedValue({
    claudeMd: 'Mock CLAUDE.md content',
    docsFiles: [],
    summary: 'Mock project context'
  })
}));

// Mock the aiService to avoid external dependencies
jest.mock('../src/lib/aiService', () => ({
  createAIServiceFromEnv: jest.fn().mockReturnValue({
    generateResponse: jest.fn().mockResolvedValue({
      content: 'Mock AI response for testing',
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
    })
  }),
  AIService: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue({
      content: 'Mock AI response for testing',
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
    })
  }))
}));

// Mock the orchestrateDiscussion function to avoid full AI orchestration
jest.mock('../src/engine/discussion', () => ({
  orchestrateDiscussion: jest.fn().mockResolvedValue({
    participants: [
      { name: 'Business Analyst', role: 'BusinessAnalyst', objectives: ['Analyze requirements'] },
      { name: 'Product Owner', role: 'ProductOwner', objectives: ['Define priorities'] }
    ],
    rounds: [
      {
        round: 1,
        speaker: 'Business Analyst',
        role: 'BusinessAnalyst', 
        content: 'Mock discussion content for testing PRD generation.',
        timestamp: new Date()
      }
    ],
    decisions: ['Decision 1', 'Decision 2'],
    nextSteps: ['Next step 1', 'Next step 2'],
    summary: {
      decisions: ['Decision 1'],
      nextSteps: ['Next step 1'] 
    },
    consensusScore: 85
  })
}));

describe('PRD Generation System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);
  });

  describe('PRD Type System', () => {
    it('should create empty PRD with correct structure', () => {
      const prd = createEmptyPRD('en');
      
      expect(isPRDDocument(prd)).toBe(true);
      expect(prd.metadata.language).toBe('en');
      expect(prd.metadata.title).toBe('Product Requirements Document (PRD)');
      expect(prd.overview.problemStatement).toBe('');
      expect(prd.overview.objectives).toEqual([]);
      expect(Array.isArray(prd.functionalRequirements)).toBe(true);
      expect(Array.isArray(prd.acceptanceCriteria)).toBe(true);
    });

    it('should create Portuguese PRD when language is pt-BR', () => {
      const prd = createEmptyPRD('pt-BR');
      
      expect(prd.metadata.language).toBe('pt-BR');
      expect(prd.metadata.title).toBe('Documento de Requisitos do Produto (PRD)');
    });

    it('should validate PRD completeness correctly', () => {
      const prd = createEmptyPRD('en');
      
      // Empty PRD should have low completeness
      let validation = validatePRDCompleteness(prd);
      expect(validation.completeness).toBeLessThan(50);
      expect(validation.isValid).toBe(false);
      expect(validation.missingRequired.length).toBeGreaterThan(0);

      // Add some content to improve completeness
      prd.overview.problemStatement = 'Test problem statement';
      prd.overview.objectives = ['Test objective 1', 'Test objective 2'];
      prd.scope.included = [{ title: 'Feature 1', description: 'Test feature' }];
      prd.functionalRequirements = [{
        id: 'FR001',
        title: 'Test Requirement',
        description: 'Test requirement description',
        priority: 'High' as any,
        category: 'Authentication' as any,
        acceptanceCriteria: ['Test criteria'],
        businessValue: 'Test value'
      }];

      validation = validatePRDCompleteness(prd);
      expect(validation.completeness).toBeGreaterThan(30);
    });

    it('should validate functional requirement structure', () => {
      const requirement = {
        id: 'FR001',
        title: 'User Authentication',
        description: 'System must support user authentication',
        priority: 'High',
        category: 'Authentication',
        acceptanceCriteria: ['Users can log in', 'Passwords are secure'],
        businessValue: 'Secure user access'
      };

      expect(isFunctionalRequirement(requirement)).toBe(true);

      // Test invalid requirement
      const invalidReq = { id: 'invalid', title: 'test' };
      expect(isFunctionalRequirement(invalidReq)).toBe(false);
    });
  });

  describe('PRD Extractor', () => {
    it('should extract content from mock discussion', async () => {
      const extractor = new PRDExtractor('en');
      
      const mockDiscussion = {
        participants: [
          { name: 'Business Analyst', role: 'BusinessAnalyst', objectives: [] },
          { name: 'Product Owner', role: 'ProductOwner', objectives: [] }
        ],
        rounds: [
          {
            round: 1,
            speaker: 'Business Analyst',
            role: 'BusinessAnalyst',
            content: 'We need a user authentication system that supports OAuth and local accounts. The system must be secure and scalable.',
            timestamp: new Date()
          },
          {
            round: 1,
            speaker: 'Product Owner',
            role: 'ProductOwner',  
            content: 'The main objective is to improve user experience while maintaining security. We should support Google and GitHub OAuth.',
            timestamp: new Date()
          }
        ],
        summary: {
          decisions: [],
          nextSteps: []
        },
        consensusScore: 85
      };

      const prd = await extractor.extractPRDFromDiscussion(mockDiscussion as any, 'Create user authentication system');

      expect(isPRDDocument(prd)).toBe(true);
      expect(prd.overview.problemStatement).toBe('Create user authentication system');
      expect(prd.overview.objectives.length).toBeGreaterThan(0);
      expect(prd.metadata.generationMethod).toBe('persona');
    });

    it('should handle empty discussion gracefully', async () => {
      const extractor = new PRDExtractor('en');
      
      const emptyDiscussion = {
        participants: [],
        rounds: [],
        summary: { decisions: [], nextSteps: [] },
        consensusScore: 0
      };

      const prd = await extractor.extractPRDFromDiscussion(emptyDiscussion as any, 'Test prompt');

      expect(isPRDDocument(prd)).toBe(true);
      expect(prd.overview.problemStatement).toBe('Test prompt');
      expect(prd.metadata.generationMethod).toBe('fallback');
    });
  });

  describe('PRD Writer', () => {
    it('should generate PRD content in dry run mode', async () => {
      const writer = new PRDWriter('en');
      
      const mockDiscussion = {
        participants: [
          { name: 'Business Analyst', role: 'BusinessAnalyst', objectives: [] }
        ],
        rounds: [
          {
            round: 1,
            speaker: 'Business Analyst',
            role: 'BusinessAnalyst',
            content: 'We need to implement user authentication with OAuth support.',
            timestamp: new Date()
          }
        ],
        summary: { decisions: [], nextSteps: [] }
      };

      const result = await writer.writePRD(mockDiscussion as any, {
        language: 'en',
        timestamp: '2024-08-25T123000Z',
        prompt: 'Create authentication system',
        outputDir: './test-output',
        dryRun: true
      });

      expect(result.prdDocument).toBeDefined();
      expect(result.validationResult).toBeDefined();
      expect(result.generationMetrics).toBeDefined();
      expect(result.generationMetrics.generationTime).toBeGreaterThan(0);
      expect(result.filePath).toBe(''); // Empty in dry run mode
    });

    it('should generate bilingual PRD content', async () => {
      const writerEn = new PRDWriter('en');
      const writerPt = new PRDWriter('pt-BR');
      
      const mockDiscussion = {
        participants: [],
        rounds: [],
        summary: { decisions: [], nextSteps: [] }
      };

      const resultEn = await writerEn.writePRD(mockDiscussion as any, {
        language: 'en',
        timestamp: '2024-08-25T123000Z',
        prompt: 'Test system',
        outputDir: './test-output',
        dryRun: true
      });

      const resultPt = await writerPt.writePRD(mockDiscussion as any, {
        language: 'pt-BR',
        timestamp: '2024-08-25T123000Z',
        prompt: 'Sistema de teste',
        outputDir: './test-output',
        dryRun: true
      });

      expect(resultEn.prdDocument.metadata.language).toBe('en');
      expect(resultPt.prdDocument.metadata.language).toBe('pt-BR');
      expect(resultEn.prdDocument.metadata.title).toContain('Product Requirements Document');
      expect(resultPt.prdDocument.metadata.title).toContain('Documento de Requisitos do Produto');
    });
  });

  describe('MCP Tool Integration', () => {
    it('should generate PRD via MCP tool with outputFormat=PRD', async () => {
      const input: RoundtableInput = {
        prompt: 'Create a task management application with user authentication',
        outputDir: './test-output',
        outputFormat: 'PRD',
        dryRun: true,
        async: false // Synchronous for testing
      };

      const result = await executeRoundtable(input);

      expect(result).toBeDefined();
      expect(result.summary).toContain('Product Requirements Document');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{6}Z$/);
      expect(result.discussionPath).toBeUndefined(); // Undefined in dry run
      expect(result.prdPath).toBeUndefined(); // Undefined in dry run
      expect(result.requestPath).toBeUndefined(); // Undefined in dry run
    });

    it('should generate REQUEST via MCP tool with outputFormat=REQUEST', async () => {
      const input: RoundtableInput = {
        prompt: 'Create a task management application',
        outputDir: './test-output', 
        outputFormat: 'REQUEST',
        dryRun: true,
        async: false // Synchronous for testing
      };

      const result = await executeRoundtable(input);

      expect(result).toBeDefined();
      expect(result.summary).toContain('PRP-ready specification');
      expect(result.prdPath).toBeUndefined(); // Should not have PRD path for REQUEST format
    });

    it('should default to PRD format when outputFormat not specified', async () => {
      const input: RoundtableInput = {
        prompt: 'Create a web application',
        dryRun: true,
        async: false
      };

      const result = await executeRoundtable(input);

      expect(result.summary).toContain('Product Requirements Document');
    });

    it('should support bilingual PRD generation', async () => {
      const inputEn: RoundtableInput = {
        prompt: 'Create authentication system',
        language: 'en',
        outputFormat: 'PRD',
        dryRun: true,
        async: false
      };

      const inputPt: RoundtableInput = {
        prompt: 'Criar sistema de autenticação',
        language: 'pt-BR', 
        outputFormat: 'PRD',
        dryRun: true,
        async: false
      };

      const resultEn = await executeRoundtable(inputEn);
      const resultPt = await executeRoundtable(inputPt);

      expect(resultEn.summary).toContain('Product Requirements Document');
      expect(resultPt.summary).toContain('PRD'); // Portuguese uses 'PRD' abbreviation in summary
    });

    it('should handle file writing in non-dry-run mode', async () => {
      const input: RoundtableInput = {
        prompt: 'Create simple web app',
        outputDir: './test-output',
        outputFormat: 'PRD',
        dryRun: false,
        async: false
      };

      const result = await executeRoundtable(input);

      // Verify file operations were called
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled(); // For writeFileAtomic
      expect(result.discussionPath).toBeDefined();
      expect(result.prdPath).toBeDefined();
      expect(result.outputDir).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid language gracefully', () => {
      const prd = createEmptyPRD('invalid' as any);
      expect(prd.metadata.language).toBe('invalid');
      // Should still create valid PRD structure
      expect(isPRDDocument(prd)).toBe(true);
    });

    it('should handle empty prompt in PRD generation', async () => {
      const input: RoundtableInput = {
        prompt: '',
        outputFormat: 'PRD',
        dryRun: true,
        async: false
      };

      // Should throw error for empty prompt
      await expect(executeRoundtable(input)).rejects.toThrow('Prompt is required');
    });

    it('should handle discussion with no persona contributions', async () => {
      const extractor = new PRDExtractor('en');
      
      const discussionWithNonPersonas = {
        participants: [],
        rounds: [
          {
            round: 1,
            speaker: 'Unknown',
            role: 'UnknownRole',
            content: 'Some content from unknown role',
            timestamp: new Date()
          }
        ],
        summary: { decisions: [], nextSteps: [] }
      };

      const prd = await extractor.extractPRDFromDiscussion(discussionWithNonPersonas as any, 'Test');
      
      expect(isPRDDocument(prd)).toBe(true);
      expect(prd.metadata.generationMethod).toBe('fallback');
    });
  });

  describe('Performance and Validation', () => {
    it('should generate PRD within reasonable time', async () => {
      const startTime = Date.now();
      
      const writer = new PRDWriter('en');
      const mockDiscussion = {
        participants: [],
        rounds: [],
        summary: { decisions: [], nextSteps: [] }
      };

      const result = await writer.writePRD(mockDiscussion as any, {
        language: 'en',
        timestamp: '2024-08-25T123000Z',
        prompt: 'Performance test',
        outputDir: './test-output',
        dryRun: true
      });

      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.generationMetrics.generationTime).toBeGreaterThanOrEqual(0);
      expect(result.generationMetrics.generationTime).toBeLessThan(10000);
    });

    it('should maintain consistent PRD structure across multiple generations', async () => {
      const writer = new PRDWriter('en');
      const mockDiscussion = {
        participants: [],
        rounds: [],
        summary: { decisions: [], nextSteps: [] }
      };

      const results = await Promise.all([
        writer.writePRD(mockDiscussion as any, {
          language: 'en',
          timestamp: '2024-08-25T123001Z',
          prompt: 'Test 1',
          outputDir: './test-output',
          dryRun: true
        }),
        writer.writePRD(mockDiscussion as any, {
          language: 'en', 
          timestamp: '2024-08-25T123002Z',
          prompt: 'Test 2',
          outputDir: './test-output',
          dryRun: true
        })
      ]);

      results.forEach(result => {
        expect(isPRDDocument(result.prdDocument)).toBe(true);
        expect(result.validationResult.completeness).toBeGreaterThanOrEqual(0);
        expect(result.generationMetrics.sectionsGenerated).toBeGreaterThanOrEqual(0);
      });

      // Both should have similar structure
      expect(results[0].prdDocument.metadata.title).toBe(results[1].prdDocument.metadata.title);
      expect(Object.keys(results[0].prdDocument)).toEqual(Object.keys(results[1].prdDocument));
    });
  });
});