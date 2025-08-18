import { AIService, AIMessage } from './aiService.js';
import { log } from './log.js';

export interface ContentGenerationRequest {
  section: string;
  prompt: string;
  language: string;
  context?: string;
  maxWords?: number;
}

export class AIContentGenerator {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async generateContent(request: ContentGenerationRequest): Promise<string> {
    const { section, prompt, language, context, maxWords = 100 } = request;
    const isPortuguese = language === 'pt' || language === 'pt-BR';

    try {
      log.debug(`🎯 AI Content Generator: Generating ${section} content...`);
      
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt(section, isPortuguese, maxWords)
        },
        {
          role: 'user',
          content: this.buildUserPrompt(prompt, context, isPortuguese)
        }
      ];

      const response = await this.aiService.generateResponse(messages);
      log.debug(`✅ AI Content Generator: ${section} content generated (${response.content.split(' ').length} words)`);
      
      return response.content.trim();
    } catch (error) {
      log.warn(`🚨 AI Content Generator failed for ${section}, using minimal fallback. Error: ${error}`);
      return this.generateMinimalFallback(section, prompt, isPortuguese);
    }
  }

  private buildSystemPrompt(section: string, isPortuguese: boolean, maxWords: number): string {
    const basePrompt = isPortuguese
      ? `Você é um especialista em análise de requisitos e documentação técnica. Sua tarefa é gerar conteúdo específico para a seção "${section}" de uma especificação de demanda.`
      : `You are an expert in requirements analysis and technical documentation. Your task is to generate specific content for the "${section}" section of a demand specification.`;

    const guidelines = isPortuguese
      ? `Diretrizes:
- Mantenha o conteúdo conciso e profissional (máximo ${maxWords} palavras)
- Base o conteúdo no problema apresentado
- Evite suposições técnicas específicas
- Foque no valor e necessidades do usuário
- Use linguagem clara e objetiva
- Forneça apenas o conteúdo solicitado, sem explicações adicionais`
      : `Guidelines:
- Keep content concise and professional (maximum ${maxWords} words)
- Base content on the presented problem
- Avoid specific technical assumptions
- Focus on user value and needs
- Use clear and objective language
- Provide only the requested content, no additional explanations`;

    return `${basePrompt}\n\n${guidelines}`;
  }

  private buildUserPrompt(prompt: string, context: string | undefined, isPortuguese: boolean): string {
    let userPrompt = isPortuguese
      ? `Problema/Demanda: ${prompt}`
      : `Problem/Requirement: ${prompt}`;

    if (context) {
      userPrompt += isPortuguese
        ? `\n\nContexto adicional: ${context}`
        : `\n\nAdditional context: ${context}`;
    }

    return userPrompt;
  }

  private generateMinimalFallback(section: string, _prompt: string, isPortuguese: boolean): string {
    // Only used as absolute last resort when AI completely fails
    switch (section.toLowerCase()) {
      case 'current_behavior':
        return isPortuguese
          ? 'Sistema atual não atende às necessidades identificadas'
          : 'Current system does not meet identified needs';
      
      case 'desired_behavior':
        return isPortuguese
          ? 'Sistema deve implementar solução para o problema apresentado'
          : 'System should implement solution for the presented problem';
      
      case 'business_goals':
        return isPortuguese
          ? 'Implementar solução eficaz que agregue valor ao usuário'
          : 'Implement effective solution that adds value to user';
      
      case 'scope_in':
        return isPortuguese
          ? 'Funcionalidades essenciais para resolver o problema'
          : 'Essential functionality to solve the problem';
      
      case 'scope_out':
        return isPortuguese
          ? 'Funcionalidades avançadas para fases futuras'
          : 'Advanced features for future phases';
      
      default:
        return isPortuguese
          ? `Conteúdo específico para ${section} baseado nos requisitos`
          : `Specific content for ${section} based on requirements`;
    }
  }

  // Specialized method for generating section content with specific prompts
  async generateSectionContent(
    sectionType: 'current_vs_desired' | 'business_goals' | 'scope' | 'technical_requirements' | 'nfrs' | 'data_model' | 'api_points' | 'acceptance_criteria' | 'risks_assumptions' | 'release_plan',
    prompt: string,
    language: string,
    context?: string
  ): Promise<{ content: string; structured?: any }> {
    const isPortuguese = language === 'pt' || language === 'pt-BR';
    
    const sectionPrompts = {
      current_vs_desired: {
        en: 'Generate current vs desired behavior analysis for this requirement. Provide specific, actionable descriptions of what exists now versus what should exist.',
        pt: 'Gere análise de comportamento atual vs desejado para este requisito. Forneça descrições específicas e acionáveis do que existe agora versus o que deveria existir.'
      },
      business_goals: {
        en: 'Generate business goals and success metrics for this requirement. Focus on measurable outcomes and business value.',
        pt: 'Gere objetivos de negócio e métricas de sucesso para este requisito. Foque em resultados mensuráveis e valor de negócio.'
      },
      scope: {
        en: 'Define what is in scope and out of scope for this requirement. Be specific about boundaries and limitations.',
        pt: 'Defina o que está dentro e fora do escopo para este requisito. Seja específico sobre limites e limitações.'
      },
      technical_requirements: {
        en: 'Generate technical requirements and implementation considerations for this requirement. Focus on architecture and technical approach.',
        pt: 'Gere requisitos técnicos e considerações de implementação para este requisito. Foque em arquitetura e abordagem técnica.'
      },
      nfrs: {
        en: 'Generate non-functional requirements including performance, security, reliability, and scalability considerations.',
        pt: 'Gere requisitos não-funcionais incluindo considerações de performance, segurança, confiabilidade e escalabilidade.'
      },
      data_model: {
        en: 'Design data model and persistence strategy for this requirement. Include data structure and storage considerations.',
        pt: 'Projete modelo de dados e estratégia de persistência para este requisito. Inclua estrutura de dados e considerações de armazenamento.'
      },
      api_points: {
        en: 'Define API integration points and endpoints needed for this requirement. Include authentication and data format considerations.',
        pt: 'Defina pontos de integração de API e endpoints necessários para este requisito. Inclua considerações de autenticação e formato de dados.'
      },
      acceptance_criteria: {
        en: 'Generate acceptance criteria in Gherkin format for this requirement. Include specific scenarios and test cases.',
        pt: 'Gere critérios de aceitação em formato Gherkin para este requisito. Inclua cenários específicos e casos de teste.'
      },
      risks_assumptions: {
        en: 'Identify risks and assumptions for this requirement. Include technical, business, and operational considerations.',
        pt: 'Identifique riscos e premissas para este requisito. Inclua considerações técnicas, de negócio e operacionais.'
      },
      release_plan: {
        en: 'Create release plan and delivery strategy for this requirement. Include phasing and milestone considerations.',
        pt: 'Crie plano de release e estratégia de entrega para este requisito. Inclua considerações de faseamento e marcos.'
      }
    };

    const sectionPrompt = sectionPrompts[sectionType];
    if (!sectionPrompt) {
      throw new Error(`Unknown section type: ${sectionType}`);
    }

    const content = await this.generateContent({
      section: sectionType,
      prompt: `${sectionPrompt[isPortuguese ? 'pt' : 'en']}\n\nRequirement: ${prompt}`,
      language,
      context,
      maxWords: 150
    });

    return { content };
  }
}