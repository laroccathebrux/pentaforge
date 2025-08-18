import { Persona, PersonaContext } from './base.js';
import { AIService, AIMessage, createAIServiceFromEnv } from '../lib/aiService.js';
import { formatContextForPersonas } from '../lib/contextReader.js';
import { log } from '../lib/log.js';

export abstract class AIPersona extends Persona {
  protected aiService: AIService;

  constructor(
    name: string,
    role: string,
    objectives: string[],
    aiService?: AIService
  ) {
    super(name, role, objectives);
    this.aiService = aiService || createAIServiceFromEnv();
  }

  // Method to override the AI service after construction
  setAIService(aiService: AIService): void {
    this.aiService = aiService;
    log.debug(`🔄 ${this.role}: AI service overridden with new model`);
  }

  async generateResponse(context: PersonaContext): Promise<string> {
    try {
      log.debug(`🤖 ${this.role}: Attempting AI response generation...`);
      const messages = this.buildAIMessages(context);
      const response = await this.aiService.generateResponse(messages);
      log.debug(`✅ ${this.role}: AI response generated successfully (${response.content.split(' ').length} words)`);
      return this.limitWords(response.content, 120);
    } catch (error) {
      log.warn(`🚨 AI persona ${this.role} failed, using fallback response. Error: ${error}`);
      log.debug(`🔄 ${this.role}: Switching to hardcoded fallback response`);
      // Fallback to hardcoded response if AI fails
      const fallbackResponse = this.generateFallbackResponse(context);
      log.debug(`📝 ${this.role}: Fallback response generated (${fallbackResponse.split(' ').length} words)`);
      return fallbackResponse;
    }
  }

  private buildAIMessages(context: PersonaContext): AIMessage[] {
    const { prompt, language, previousTurns, projectContext } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';

    const messages: AIMessage[] = [];

    // System message with persona definition and context
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(isPortuguese),
    });

    // Add project context if available
    if (projectContext) {
      const contextFormatted = formatContextForPersonas(projectContext, language);
      messages.push({
        role: 'user',
        content: contextFormatted,
      });
    }

    // Add context about the problem
    messages.push({
      role: 'user',
      content: isPortuguese
        ? `Problema/Demanda: ${prompt}`
        : `Problem/Requirement: ${prompt}`,
    });

    // Add previous discussion turns as context
    if (previousTurns.length > 0) {
      const discussionHistory = previousTurns
        .map(turn => `${turn.role}: ${turn.content}`)
        .join('\n\n');
      
      messages.push({
        role: 'user',
        content: isPortuguese
          ? `Contexto da discussão anterior:\n${discussionHistory}\n\nBaseado nisso, forneça sua perspectiva como ${this.role}:`
          : `Previous discussion context:\n${discussionHistory}\n\nBased on this, provide your perspective as ${this.role}:`,
      });
    } else {
      messages.push({
        role: 'user',
        content: isPortuguese
          ? `Como ${this.role}, forneça sua análise inicial desta demanda:`
          : `As ${this.role}, provide your initial analysis of this requirement:`,
      });
    }

    return messages;
  }

  private buildSystemPrompt(isPortuguese: boolean): string {
    const basePrompt = isPortuguese ? this.buildPortugueseSystemPrompt() : this.buildEnglishSystemPrompt();
    
    // Add specific persona instructions
    const personaInstructions = this.getPersonaSpecificInstructions(isPortuguese);
    
    return `${basePrompt}\n\n${personaInstructions}`;
  }

  private buildEnglishSystemPrompt(): string {
    return `You are ${this.name}, a ${this.role} participating in an agile roundtable discussion to analyze requirements and create specifications.

Your role and objectives:
${this.objectives.map(obj => `- ${obj}`).join('\n')}

Discussion guidelines:
- Keep responses focused and concise (max 120 words)
- Stay in character as ${this.role}
- Build on previous team members' input when available
- Provide specific, actionable insights from your expertise area
- Use professional but collaborative tone
- Focus on practical implementation considerations

Response format: Provide a single paragraph response that directly addresses the requirement from your role's perspective.`;
  }

  private buildPortugueseSystemPrompt(): string {
    return `Você é ${this.name}, ${this.role} participando de uma discussão em roundtable ágil para analisar requisitos e criar especificações.

Seu papel e objetivos:
${this.objectives.map(obj => `- ${obj}`).join('\n')}

Diretrizes da discussão:
- Mantenha respostas focadas e concisas (máx 120 palavras)
- Mantenha-se no personagem como ${this.role}
- Construa sobre as contribuições de membros anteriores da equipe quando disponível
- Forneça insights específicos e acionáveis da sua área de expertise
- Use tom profissional mas colaborativo
- Foque em considerações práticas de implementação

Formato da resposta: Forneça uma resposta em parágrafo único que aborde diretamente o requisito da perspectiva do seu papel.`;
  }

  // Abstract method for persona-specific instructions
  protected abstract getPersonaSpecificInstructions(isPortuguese: boolean): string;

  // Fallback method for when AI fails
  protected abstract generateFallbackResponse(context: PersonaContext): string;
}