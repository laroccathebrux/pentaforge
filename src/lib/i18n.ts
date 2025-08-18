export function detectLanguage(text: string): string {
  const portugueseIndicators = [
    'não', 'são', 'ção', 'ões', 'ão', 'õe', 'nh',
    'para', 'com', 'sem', 'por', 'quando', 'onde',
    'preciso', 'quero', 'deve', 'pode', 'fazer',
    'aplicação', 'sistema', 'dados', 'usuário',
    'problema', 'solução', 'funcionalidade',
  ];

  const lowerText = text.toLowerCase();
  let portugueseScore = 0;

  for (const indicator of portugueseIndicators) {
    if (lowerText.includes(indicator)) {
      portugueseScore++;
    }
  }

  // If we find more than 3 Portuguese indicators, consider it Portuguese
  if (portugueseScore > 3) {
    return 'pt-BR';
  }

  // Check for explicit Portuguese words at the beginning
  if (lowerText.startsWith('no meu') || 
      lowerText.startsWith('na minha') ||
      lowerText.startsWith('preciso') ||
      lowerText.startsWith('quero') ||
      lowerText.startsWith('meu') ||
      lowerText.startsWith('minha')) {
    return 'pt-BR';
  }

  return 'en';
}

export function translate(key: string, language: string): string {
  const translations: Record<string, Record<string, string>> = {
    'roundtable.starting': {
      'en': 'Starting roundtable discussion',
      'pt-BR': 'Iniciando discussão da mesa redonda',
    },
    'roundtable.completed': {
      'en': 'Roundtable discussion completed',
      'pt-BR': 'Discussão da mesa redonda concluída',
    },
    'error.prompt_required': {
      'en': 'Prompt is required',
      'pt-BR': 'Prompt é obrigatório',
    },
    'error.write_failed': {
      'en': 'Failed to write file',
      'pt-BR': 'Falha ao escrever arquivo',
    },
  };

  const lang = language === 'pt' ? 'pt-BR' : language;
  return translations[key]?.[lang] || translations[key]?.['en'] || key;
}

export function getLanguageCode(language: string): string {
  if (language === 'pt' || language === 'pt-BR' || language === 'pt-br') {
    return 'pt-BR';
  }
  return 'en';
}