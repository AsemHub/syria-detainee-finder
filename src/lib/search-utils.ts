/**
 * Calculate the appropriate timeout for a search query based on its characteristics
 * @param searchText The search text to analyze
 * @param isArabic Whether the text contains Arabic script
 * @returns Timeout in milliseconds
 */
export function calculateTimeout(searchText: string, isArabic: boolean): number {
  const baseTimeout = isArabic ? 4000 : 2000
  
  // Adjust for query length
  const lengthFactor = Math.max(1, searchText.length / 10)
  
  // Adjust for complexity (spaces indicate multiple words)
  const wordCount = searchText.trim().split(/\s+/).length
  const complexityFactor = Math.max(1, wordCount / 2)
  
  // Adjust for special characters
  const specialCharCount = (searchText.match(/[^\w\s]/g) || []).length
  const specialCharFactor = Math.max(1, 1 + (specialCharCount * 0.1))
  
  return Math.min(
    Math.round(baseTimeout * lengthFactor * complexityFactor * specialCharFactor),
    10000 // Cap at 10 seconds
  )
}
