import { executeRoundtable, RoundtableInput } from '../src/tools/roundtable';
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

describe('Roundtable Execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.rename as jest.Mock).mockResolvedValue(undefined);
  });

  it('should execute roundtable with valid input', async () => {
    const input: RoundtableInput = {
      prompt: 'My Todo app loses data on refresh. Need persistence.',
      outputDir: './test-output',
      language: 'en',
      tone: 'professional',
      includeAcceptanceCriteria: true,
    };

    const result = await executeRoundtable(input);

    expect(result).toBeDefined();
    expect(result.summary).toContain('PRP-ready specification');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{6}Z$/);
    expect(result.discussionPath).toContain('DISCUSSION_');
    expect(result.requestPath).toContain('REQUEST_');
  });

  it('should handle dry run mode', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    const input: RoundtableInput = {
      prompt: 'Need data persistence for my app',
      dryRun: true,
    };

    const result = await executeRoundtable(input);

    expect(result).toBeDefined();
    expect(result.discussionPath).toBeUndefined();
    expect(result.requestPath).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DISCUSSION.md'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('REQUEST.md'));
    
    consoleSpy.mockRestore();
  });

  it('should detect Portuguese language automatically', async () => {
    const input: RoundtableInput = {
      prompt: 'Meu aplicativo de tarefas perde dados ao atualizar. Preciso de persistência.',
    };

    const result = await executeRoundtable(input);

    expect(result).toBeDefined();
    expect(result.summary).toContain('especificação PRP-ready');
  });

  it('should throw error for empty prompt', async () => {
    const input: RoundtableInput = {
      prompt: '',
    };

    await expect(executeRoundtable(input)).rejects.toThrow('Prompt is required');
  });

  it('should use environment variable for output directory', async () => {
    process.env.PENTAFORGE_OUTPUT_DIR = '/custom/output';
    
    const input: RoundtableInput = {
      prompt: 'Test prompt',
    };

    const result = await executeRoundtable(input);

    expect(result.discussionPath).toContain('/custom/output');
    expect(result.requestPath).toContain('/custom/output');
    
    delete process.env.PENTAFORGE_OUTPUT_DIR;
  });
});