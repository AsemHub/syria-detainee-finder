/**
 * Normalizes Arabic text by:
 * 1. Removing diacritics (tashkeel)
 * 2. Normalizing different forms of Alef
 * 3. Normalizing different forms of Ya and Alef Maksura
 * 4. Normalizing different forms of Ha
 * 5. Removing tatweel (kashida)
 */
export function normalizeArabic(text: string): string {
  if (!text) return text

  // Remove diacritics (tashkeel)
  text = text.replace(/[\u064B-\u065F]/g, '')

  // Normalize Alef with Hamza forms to bare Alef
  text = text.replace(/[\u0622\u0623\u0625]/g, '\u0627')

  // Normalize Alef Maksura to Ya
  text = text.replace(/\u0649/g, '\u064A')

  // Normalize Ta Marbuta to Ha
  text = text.replace(/\u0629/g, '\u0647')

  // Remove tatweel (kashida)
  text = text.replace(/\u0640/g, '')

  // Convert to lowercase and trim
  return text.toLowerCase().trim()
}

/**
 * Removes extra spaces and normalizes whitespace
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Combines multiple normalization functions
 */
export function normalizeText(text: string): string {
  return normalizeWhitespace(normalizeArabic(text))
}
