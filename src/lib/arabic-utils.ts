// Arabic text normalization and utilities

/**
 * Normalize Arabic text by:
 * 1. Removing diacritics (tashkeel)
 * 2. Normalizing different forms of Alef and Hamza
 * 3. Normalizing different forms of Ya/Alef Maksura
 * 4. Normalizing different forms of Ha/Ta Marbuta
 * 5. Normalizing Farsi characters
 * 6. Removing special characters and normalizing spaces
 */
export function normalizeArabicText(text: string): string {
    if (!text) return '';

    const normalizations: [RegExp, string][] = [
        // Remove kashida
        [/\u0640/g, ''],
        
        // Remove tashkeel (diacritics)
        [/[\u064B-\u065F\u0670]/g, ''],
        
        // Normalize hamza forms
        [/[\u0622\u0623\u0625]/g, '\u0627'],  // Alef with hamza forms -> Alef
        
        // Normalize alef madda
        [/\u0622/g, '\u0627'],  // Alef madda -> Alef
        
        // Keep hamza isolated form
        [/\u0621/g, '\u0621'],
        
        // Normalize wavy hamza
        [/\u0624/g, '\u0648'],  // Waw with hamza -> Waw
        
        // Normalize ya hamza
        [/\u0626/g, '\u064A'],  // Ya with hamza -> Ya
        
        // Normalize alef maksura
        [/\u0649/g, '\u064A'],  // Alef maksura -> Ya
        
        // Normalize ta marbuta
        [/\u0629/g, '\u0647'],  // Ta marbuta -> Ha
        
        // Normalize Farsi ya
        [/\u06CC/g, '\u064A'],  // Farsi ya -> Arabic ya
        
        // Normalize Farsi kaf
        [/\u06A9/g, '\u0643'],  // Farsi kaf -> Arabic kaf
        
        // Remove Zero-Width Joiner
        [/\u200D/g, ''],
        
        // Remove Zero-Width Non-Joiner
        [/\u200C/g, ''],
        
        // Normalize whitespace
        [/\s+/g, ' ']
    ];

    return normalizations.reduce(
        (text, [pattern, replacement]) => text.replace(pattern, replacement),
        text.trim()
    ).trim();
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
export function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j - 1] + 1, // substitution
                    dp[i - 1][j] + 1,     // deletion
                    dp[i][j - 1] + 1      // insertion
                );
            }
        }
    }

    return dp[m][n];
}

/**
 * Check if two Arabic strings are similar using fuzzy matching
 */
export function areArabicStringsSimilar(str1: string, str2: string, threshold = 0.8): boolean {
    if (!str1 || !str2) return false;
    
    const normalized1 = normalizeArabicText(str1);
    const normalized2 = normalizeArabicText(str2);
    
    if (normalized1 === normalized2) return true;
    
    const maxLength = Math.max(normalized1.length, normalized2.length);
    if (maxLength === 0) return true;
    
    const distance = levenshteinDistance(normalized1, normalized2);
    const similarity = 1 - distance / maxLength;
    
    return similarity >= threshold;
}
