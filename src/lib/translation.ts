import * as deepl from 'deepl-node';

const DEEPL_API_KEY = process.env.NEXT_PUBLIC_DEEPL_API_KEY;

export type TranslationService = 'deepl-api' | 'deepl-website' | 'google';

interface TranslateOptions {
  service: TranslationService;
  text?: string;
  url?: string;
  sourceLang: string;
  targetLang: string;
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!DEEPL_API_KEY) {
    throw new Error('DeepL API key is not configured');
  }

  const translator = new deepl.Translator(DEEPL_API_KEY);
  
  try {
    const result = await translator.translateText(text, 'ar', targetLang.split('-')[0] as deepl.TargetLanguageCode);
    return result.text;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

export function getTranslationUrl(options: TranslateOptions): string {
  const { service, url, sourceLang, targetLang } = options;
  const targetLanguageCode = targetLang.split('-')[0];

  switch (service) {
    case 'deepl-api':
      // This should be handled through the translateText function
      throw new Error('DeepL API should use translateText function');
    
    case 'deepl-website':
      // DeepL website doesn't support direct URL translation, but we can send them to DeepL
      return `https://www.deepl.com/translator#${sourceLang}/${targetLanguageCode}`;
    
    case 'google':
      // Google Translate fallback
      return `https://translate.google.com/translate?sl=${sourceLang}&tl=${targetLanguageCode}&u=${encodeURIComponent(url || window.location.href)}`;
    
    default:
      throw new Error('Unsupported translation service');
  }
}
