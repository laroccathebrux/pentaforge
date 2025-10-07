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
      log.warn(`🚨 AI persona ${this.role} failed, attempting AI fallback response. Error: ${error}`);
      log.debug(`🔄 ${this.role}: Switching to AI-generated fallback response`);
      
      // First try: Generate AI response with simpler prompt
      try {
        const fallbackResponse = await this.generateAIFallbackResponse(context);
        log.debug(`🤖 ${this.role}: AI fallback response generated (${fallbackResponse.split(' ').length} words)`);
        return fallbackResponse;
      } catch (fallbackError) {
        log.warn(`🚨 ${this.role}: AI fallback also failed, using minimal hardcoded response. Error: ${fallbackError}`);
        const hardcodedResponse = this.generateFallbackResponse(context);
        log.debug(`📝 ${this.role}: Hardcoded fallback response generated (${hardcodedResponse.split(' ').length} words)`);
        return hardcodedResponse;
      }
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
          ? `Contexto da discussão anterior:\n${discussionHistory}\n\n**OBJETIVO: BUSCAR CONSENSO**\n\nRevise as contribuições acima e, como ${this.role}:\n- CONCORDE com pontos válidos de outros participantes (cite-os explicitamente)\n- CONSTRUA sobre ideias já apresentadas ao invés de repetir ou contradizer sem justificativa\n- IDENTIFIQUE áreas de alinhamento e enfatize-as\n- Se discordar, PROPONHA alternativas construtivas que conciliem diferentes perspectivas\n- FOCALIZE em convergir para uma solução viável que atenda aos objetivos comuns\n\nSua resposta deve demonstrar progresso em direção ao consenso:`
          : `Previous discussion context:\n${discussionHistory}\n\n**GOAL: SEEK CONSENSUS**\n\nReview the contributions above and, as ${this.role}:\n- AGREE with valid points from other participants (cite them explicitly)\n- BUILD on ideas already presented instead of repeating or contradicting without justification\n- IDENTIFY areas of alignment and emphasize them\n- If you disagree, PROPOSE constructive alternatives that reconcile different perspectives\n- FOCUS on converging toward a viable solution that meets common objectives\n\nYour response should demonstrate progress toward consensus:`,
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

CRITICAL INSTRUCTIONS FOR RELEVANT RESPONSES:
- Analyze the SPECIFIC requirement/problem presented, not generic best practices
- Reference CONCRETE details from the prompt (technologies, features, constraints mentioned)
- Build on previous team members' input by agreeing, disagreeing, or adding missing perspectives
- Ask questions or raise concerns specific to the requirement discussed
- Avoid generic statements like "we need to ensure quality" - instead say HOW and WHY
- Connect your analysis to the actual business/technical context provided
- Provide specific, actionable insights that move the discussion forward
- If project context is provided, reference specific technologies, patterns, or constraints mentioned

CONSENSUS-BUILDING INSTRUCTIONS:
- **PRIMARY GOAL**: Work toward team consensus and alignment
- **AGREE FIRST**: Start by acknowledging valid points from other participants before adding your perspective
- **CONVERGE**: Look for common ground and areas of agreement, then build on them
- **CITE**: Reference specific proposals from other roles when agreeing or building upon them
- **COMPROMISE**: If you have concerns, propose constructive alternatives that incorporate others' ideas
- **AVOID REPETITION**: Don't repeat what others said unless you're explicitly agreeing or refining it
- **SIGNAL AGREEMENT**: Use phrases like "I agree with [Role]'s approach..." or "Building on [Role]'s suggestion..."

Discussion guidelines:
- Keep responses focused and concise (max 120 words)
- Stay in character as ${this.role}
- Use professional but collaborative tone
- Focus on practical implementation considerations for THIS specific requirement
- **Demonstrate consensus-building in every response after round 1**

Response format: Provide a single paragraph response that directly addresses the requirement from your role's perspective, with concrete details and specific recommendations.`;
  }

  private buildPortugueseSystemPrompt(): string {
    return `Você é ${this.name}, ${this.role} participando de uma discussão em roundtable ágil para analisar requisitos e criar especificações.

Seu papel e objetivos:
${this.objectives.map(obj => `- ${obj}`).join('\n')}

INSTRUÇÕES CRÍTICAS PARA RESPOSTAS RELEVANTES:
- Analise o requisito/problema ESPECÍFICO apresentado, não práticas genéricas
- Referencie detalhes CONCRETOS do prompt (tecnologias, funcionalidades, restrições mencionadas)
- Construa sobre as contribuições dos membros anteriores concordando, discordando ou adicionando perspectivas faltantes
- Faça perguntas ou levante preocupações específicas ao requisito discutido
- Evite declarações genéricas como "precisamos garantir qualidade" - ao invés disso diga COMO e POR QUÊ
- Conecte sua análise ao contexto de negócio/técnico atual fornecido
- Forneça insights específicos e acionáveis que façam a discussão progredir
- Se contexto do projeto for fornecido, referencie tecnologias, padrões ou restrições específicas mencionadas

INSTRUÇÕES PARA CONSTRUÇÃO DE CONSENSO:
- **OBJETIVO PRIMÁRIO**: Trabalhe para alcançar consenso e alinhamento da equipe
- **CONCORDE PRIMEIRO**: Comece reconhecendo pontos válidos de outros participantes antes de adicionar sua perspectiva
- **CONVERTA**: Busque pontos em comum e áreas de acordo, então construa sobre elas
- **CITE**: Referencie propostas específicas de outros papéis ao concordar ou construir sobre elas
- **CONCILIE**: Se tiver preocupações, proponha alternativas construtivas que incorporem ideias dos outros
- **EVITE REPETIÇÃO**: Não repita o que outros disseram a menos que esteja explicitamente concordando ou refinando
- **SINALIZE ACORDO**: Use frases como "Concordo com a abordagem do [Papel]..." ou "Construindo sobre a sugestão do [Papel]..."

Diretrizes da discussão:
- Mantenha respostas focadas e concisas (máx 120 palavras)
- Mantenha-se no personagem como ${this.role}
- Use tom profissional mas colaborativo
- Foque em considerações práticas de implementação para ESTE requisito específico
- **Demonstre construção de consenso em cada resposta após o round 1**

Formato da resposta: Forneça uma resposta em parágrafo único que aborde diretamente o requisito da perspectiva do seu papel, com detalhes concretos e recomendações específicas.`;
  }

  // AI fallback method with simpler prompt
  private async generateAIFallbackResponse(context: PersonaContext): Promise<string> {
    const { prompt, language } = context;
    const isPortuguese = language === 'pt' || language === 'pt-BR';

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: isPortuguese
          ? `Você é ${this.role}. Responda de forma profissional e concisa (máx 80 palavras) sobre o requisito apresentado.`
          : `You are a ${this.role}. Respond professionally and concisely (max 80 words) about the presented requirement.`
      },
      {
        role: 'user',
        content: isPortuguese
          ? `Como ${this.role}, analise brevemente: ${prompt}`
          : `As ${this.role}, briefly analyze: ${prompt}`
      }
    ];

    const response = await this.aiService.generateResponse(messages);
    return this.limitWords(response.content, 80);
  }

  // Abstract method for persona-specific instructions
  protected abstract getPersonaSpecificInstructions(isPortuguese: boolean): string;

  // Minimal fallback method for when AI completely fails
  protected abstract generateFallbackResponse(context: PersonaContext): string;
}