import { ProjectContext } from '../lib/contextReader.js';

export interface PersonaContext {
  prompt: string;
  language: string;
  tone: string;
  previousTurns: Turn[];
  projectContext?: ProjectContext;
}

export interface Turn {
  round: number;
  speaker: string;
  role: string;
  content: string;
}

export abstract class Persona {
  constructor(
    public readonly name: string,
    public readonly role: string,
    public readonly objectives: string[]
  ) {}

  abstract generateResponse(context: PersonaContext): Promise<string>;

  protected limitWords(text: string, maxWords: number = 120): string {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  }

  protected findPreviousTurn(turns: Turn[], role: string): Turn | undefined {
    return turns.filter(t => t.role === role).pop();
  }

  protected summarizePreviousTurns(turns: Turn[]): string {
    if (turns.length === 0) return '';
    return turns
      .map(t => `${t.role}: ${t.content.substring(0, 50)}...`)
      .join('; ');
  }
}