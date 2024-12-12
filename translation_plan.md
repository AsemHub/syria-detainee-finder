# Translation and Arabic Support Implementation Plan

## 1. Dependencies and Setup

### Required Packages
```json
{
  "dependencies": {
    "next-intl": "^3.0.0",
    "@formatjs/intl-numberformat": "^8.0.0",
    "@formatjs/intl-datetimeformat": "^6.0.0"
  }
}
```

### Initial Configuration
- Configure Next.js middleware for locale detection
- Set up language detection based on URL structure (/ar/*, /en/*)
- Configure RTL support in the application layout

## 2. Arabic Text Normalization

### Core Normalization Functions

#### Basic Letter Normalization
```typescript
// src/utils/arabicNormalization.ts
export const normalizeBasicArabic = (text: string): string => {
  return text
    // Alef forms (أ إ آ ا)
    .replace(/[أإآا]/g, 'ا')
    // Yaa forms (ى ي)
    .replace(/[ىي]/g, 'ي')
    // Hamza forms (ؤ ئ)
    .replace(/[ؤئ]/g, 'ء')
    // Taa Marbuta to Haa (ة -> ه)
    .replace(/ة/g, 'ه')
    // Remove Tatweel
    .replace(/ـ/g, '')
    // Remove Tashkeel
    .replace(/[\u064B-\u065F]/g, '');
};
```

#### Name-Specific Normalization
```typescript
export const normalizeArabicName = (name: string): string => {
  return name
    // Apply basic normalization
    .pipe(normalizeBasicArabic)
    // Handle common name prefixes
    .replace(/عبد ال/g, 'عبدال')
    .replace(/ابو ال/g, 'ابوال')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
};
```

### Search Enhancement
```typescript
export const getSearchVariations = (term: string): string[] => {
  const normalized = normalizeBasicArabic(term);
  return [
    normalized,
    // Add common variations
    normalized.replace(/ه/g, 'ة'),
    normalized.replace(/ي/g, 'ى')
  ];
};
```

## 3. Translation Structure

### Directory Organization
```
/src
  /messages
    /ar
      common.json
      search.json
      submit.json
      about.json
      privacy.json
    /en
      common.json
      search.json
      submit.json
      about.json
      privacy.json
```

### Sample Translation Files

#### common.json (Arabic)
```json
{
  "navigation": {
    "home": "الرئيسية",
    "search": "بحث",
    "submit": "تقديم معلومات",
    "about": "حول",
    "privacy": "سياسة الخصوصية"
  },
  "actions": {
    "submit": "إرسال",
    "cancel": "إلغاء",
    "search": "بحث",
    "clear": "مسح"
  }
}
```

#### search.json (Arabic)
```json
{
  "title": "البحث عن المعتقلين",
  "form": {
    "name": "الاسم",
    "namePlaceholder": "ادخل الاسم الكامل",
    "dateOfDetention": "تاريخ الاعتقال",
    "location": "مكان الاعتقال",
    "status": "الحالة"
  },
  "results": {
    "noResults": "لم يتم العثور على نتائج",
    "loading": "جاري البحث...",
    "error": "حدث خطأ أثناء البحث"
  }
}
```

## 4. RTL Support

### CSS Configuration
```typescript
// src/styles/rtl.ts
export const rtlStyles = {
  direction: 'rtl',
  textAlign: 'right',
  // Logical properties
  marginInlineStart: '1rem',
  marginInlineEnd: '1rem',
  paddingInlineStart: '1rem',
  paddingInlineEnd: '1rem'
};
```

### Font Configuration
```typescript
// src/styles/fonts.ts
export const fonts = {
  ar: "'Noto Sans Arabic', 'IBM Plex Sans Arabic', sans-serif",
  en: "'Inter', sans-serif"
};
```

## 5. Implementation Phases

### Phase 1: Basic Setup (Week 1)
- Install required dependencies
- Set up locale detection and routing
- Implement basic RTL support
- Create initial translation files structure

### Phase 2: Core Features (Week 2)
- Implement Arabic text normalization
- Set up search with normalization support
- Add language switcher component
- Configure fonts and RTL styles

### Phase 3: UI Components (Week 3)
- Update all components to support RTL
- Implement bidirectional form inputs
- Add Arabic validation messages
- Configure date and number formatting

### Phase 4: Testing and Optimization (Week 4)
- Add tests for normalization functions
- Test RTL layout in all components
- Performance optimization
- Browser compatibility testing

## 6. Testing Strategy

### Unit Tests
```typescript
// src/__tests__/normalization.test.ts
describe('Arabic Text Normalization', () => {
  test('basic letter normalization', () => {
    expect(normalizeBasicArabic('أحمد')).toBe('احمد');
  });

  test('name normalization', () => {
    expect(normalizeArabicName('عبد الله')).toBe('عبدالله');
  });
});
```

### Integration Tests
- Test language switching
- Verify search with normalized text
- Test form submissions in Arabic
- Verify RTL layout rendering

## 7. Performance Considerations

### Optimization Strategies
1. Lazy load language bundles
2. Cache normalized search terms
3. Preload Arabic fonts
4. Implement efficient text indexing

### Monitoring
- Track translation coverage
- Monitor search performance
- Measure bundle sizes
- Track user language preferences

## 8. Security and Validation

### Input Validation
```typescript
export const arabicValidation = {
  isArabicText: (text: string): boolean => /[\u0600-\u06FF]/.test(text),
  containsOnlyArabic: (text: string): boolean => /^[\u0600-\u06FF\s]+$/.test(text),
  isValidArabicName: (name: string): boolean => {
    return /^[\u0600-\u06FF\s']+$/.test(name) && name.length >= 2;
  }
};
```

### XSS Prevention
- Sanitize Arabic input
- Validate RTL markers
- Escape special characters

## 9. Accessibility

### ARIA Labels
```typescript
export const ariaLabels = {
  ar: {
    searchInput: "حقل البحث عن المعتقلين",
    languageSwitch: "تغيير اللغة",
    submitButton: "زر الإرسال"
  }
};
```

### Screen Reader Support
- Proper heading structure
- Clear focus indicators
- Keyboard navigation support

## 10. Future Enhancements

### Planned Features
1. Advanced search with multiple name variations
2. Automatic language detection
3. Improved name matching algorithms
4. Regional dialect support

### Maintenance
- Regular translation updates
- Performance monitoring
- User feedback integration
- Browser compatibility updates

## 11. Next.js Configuration and Routing

### Route Structure
```
src/app/
  [locale]/
    page.tsx
    layout.tsx
    search/
      page.tsx
    submit/
      page.tsx
    about/
      page.tsx
    privacy/
      page.tsx
```

### Middleware Configuration
```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localeDetection: true,
  localePrefix: 'always'
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
```

### Dynamic Message Loading
```typescript
// src/app/[locale]/layout.tsx
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  
  return {
    title: t('title'),
    description: t('description')
  };
}
```

## 12. Enhanced RTL Support

### Global CSS Approach
```css
/* globals.css */
:root[dir="rtl"] {
  --margin-start: 1rem;
  --margin-end: 0;
  --padding-start: 1rem;
  --padding-end: 0;
}

:root[dir="ltr"] {
  --margin-start: 0;
  --margin-end: 1rem;
  --padding-start: 0;
  --padding-end: 1rem;
}

.layout-container {
  margin-inline-start: var(--margin-start);
  margin-inline-end: var(--margin-end);
  padding-inline-start: var(--padding-start);
  padding-inline-end: var(--padding-end);
}
```

### Font Strategy
```typescript
// src/lib/fonts.ts
import localFont from 'next/font/local';

export const notoSansArabic = localFont({
  src: [
    {
      path: '../../public/fonts/NotoSansArabic-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/NotoSansArabic-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-arabic',
  preload: true,
  display: 'swap',
});

// Font fallback chain
export const fontStack = {
  ar: `var(--font-arabic), 'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif`,
  en: `Inter, system-ui, -apple-system, sans-serif`
};
```

## 13. Enhanced Text Normalization

### Memoized Normalization
```typescript
// src/utils/normalization.ts
import memoize from 'lodash/memoize';

export const normalizeArabicText = memoize((text: string): string => {
  if (!text) return '';
  
  return text
    .normalize('NFKC') // Unicode normalization first
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(/[\u064B-\u065F]/g, '');
});

// Extensible variation generator
export const generateTextVariations = (text: string): Set<string> => {
  const normalized = normalizeArabicText(text);
  const variations = new Set([normalized]);

  // Add common variations
  variations.add(normalized.replace(/ه/g, 'ة'));
  variations.add(normalized.replace(/ي/g, 'ى'));
  
  return variations;
};
```

### Bidirectional Text Safety
```typescript
// src/utils/security.ts
export const sanitizeArabicText = (text: string): string => {
  // Remove potentially harmful bidirectional control characters
  return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
};
```

## 14. Advanced Testing Strategy

### Snapshot Testing for RTL
```typescript
// src/components/__tests__/layout.test.tsx
import { render } from '@testing-library/react';

describe('Layout RTL Support', () => {
  it('renders correctly in RTL mode', () => {
    const { container } = render(
      <div dir="rtl" lang="ar">
        <Layout>
          <div>Test Content</div>
        </Layout>
      </div>
    );
    expect(container).toMatchSnapshot();
  });
});
```

### Accessibility Testing
```typescript
// src/components/__tests__/accessibility.test.tsx
import { axe } from 'jest-axe';

describe('Accessibility', () => {
  it('has no accessibility violations in Arabic', async () => {
    const { container } = render(
      <div dir="rtl" lang="ar">
        <SearchForm />
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## 15. Performance Optimizations

### Server-Side Generation
```typescript
// src/app/[locale]/page.tsx
export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'ar' }
  ];
}
```

### Client-Side Caching
```typescript
// src/utils/cache.ts
const searchCache = new Map<string, string[]>();

export const getCachedSearchResults = async (
  query: string,
  options: SearchOptions
): Promise<string[]> => {
  const cacheKey = `${query}-${JSON.stringify(options)}`;
  
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }
  
  const results = await performSearch(query, options);
  searchCache.set(cacheKey, results);
  return results;
};
```

## 16. SEO and Metadata

### Dynamic Metadata Generation
```typescript
// src/app/[locale]/layout.tsx
export async function generateMetadata({ 
  params: { locale } 
}: { 
  params: { locale: string } 
}): Promise<Metadata> {
  const messages = await getMessages(locale);
  
  return {
    title: {
      template: '%s | ' + messages.site.name,
      default: messages.site.name,
    },
    description: messages.site.description,
    alternates: {
      languages: {
        'en': '/en',
        'ar': '/ar',
      },
    },
    openGraph: {
      locale,
      alternateLocale: locale === 'en' ? 'ar' : 'en',
    },
  };
}

```

## 17. Enhanced Locale Handling

### Locale-Aware URL Generation
```typescript
// src/utils/locale.ts
export function linkWithLocale(locale: string, path: string): string {
  return `/${locale}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Usage in components
const LocaleAwareLink: React.FC<{ href: string }> = ({ href, children }) => {
  const locale = useLocale();
  return (
    <Link href={linkWithLocale(locale, href)}>
      {children}
    </Link>
  );
};
```

### Advanced Locale Detection
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

function getLocaleFromRequest(request: NextRequest): string {
  // Check cookie first
  const localeCookie = request.cookies.get('NEXT_LOCALE');
  if (localeCookie?.value) {
    return localeCookie.value;
  }

  // Then check Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage?.includes('ar')) {
    return 'ar';
  }

  return 'en'; // default
}

export default async function middleware(request: NextRequest) {
  const locale = getLocaleFromRequest(request);
  
  // Create next-intl middleware with detected locale
  const handler = createMiddleware({
    locales: ['en', 'ar'],
    defaultLocale: 'en',
    localePrefix: 'always'
  });

  const response = await handler(request);
  
  // Set locale cookie if not present
  if (!request.cookies.has('NEXT_LOCALE')) {
    response.cookies.set('NEXT_LOCALE', locale);
  }

  return response;
}
```

## 18. Advanced Message Handling

### Translation Key Validation
```typescript
// scripts/validateTranslations.ts
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const LOCALES = ['en', 'ar'];
const NAMESPACES = ['common', 'search', 'submit', 'about', 'privacy'];

function getAllKeys(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object') {
      return getAllKeys(value, newPrefix);
    }
    return [newPrefix];
  });
}

function validateTranslations() {
  const baseLocale = 'en';
  const baseKeys: { [namespace: string]: string[] } = {};

  // Get all keys from base locale
  NAMESPACES.forEach(namespace => {
    const content = JSON.parse(
      readFileSync(
        join(process.cwd(), `messages/${baseLocale}/${namespace}.json`),
        'utf8'
      )
    );
    baseKeys[namespace] = getAllKeys(content);
  });

  // Check other locales
  LOCALES.filter(locale => locale !== baseLocale).forEach(locale => {
    NAMESPACES.forEach(namespace => {
      const content = JSON.parse(
        readFileSync(
          join(process.cwd(), `messages/${locale}/${namespace}.json`),
          'utf8'
        )
      );
      const localeKeys = getAllKeys(content);
      
      // Find missing keys
      const missingKeys = baseKeys[namespace].filter(
        key => !localeKeys.includes(key)
      );
      
      if (missingKeys.length > 0) {
        console.error(
          `Missing keys in ${locale}/${namespace}.json:`,
          missingKeys
        );
        process.exit(1);
      }
    });
  });
}

validateTranslations();
```

### Pluralization Support
```typescript
// messages/ar/common.json
{
  "detainees": {
    "zero": "لا يوجد معتقلين",
    "one": "معتقل واحد",
    "two": "معتقلان",
    "few": "{count} معتقلين",
    "many": "{count} معتقلاً",
    "other": "{count} معتقل"
  }
}

// Component usage
const DetaineeCount: React.FC<{ count: number }> = ({ count }) => {
  const t = useTranslations('common');
  return (
    <span>
      {t('detainees', { count })}
    </span>
  );
};
```

## 19. Enhanced Testing Suite

### Internationalization Tests
```typescript
// src/components/__tests__/i18n.test.tsx
import { render, screen } from '@testing-library/react';
import { useLocale } from 'next-intl';

describe('Internationalization', () => {
  it('renders correct language content', async () => {
    const { rerender } = render(
      <IntlProvider locale="en">
        <SearchPage />
      </IntlProvider>
    );
    
    expect(screen.getByText('Search')).toBeInTheDocument();
    
    rerender(
      <IntlProvider locale="ar">
        <SearchPage />
      </IntlProvider>
    );
    
    expect(screen.getByText('بحث')).toBeInTheDocument();
  });

  it('handles pluralization correctly in Arabic', () => {
    render(
      <IntlProvider locale="ar">
        <DetaineeCount count={0} />
        <DetaineeCount count={1} />
        <DetaineeCount count={2} />
        <DetaineeCount count={5} />
        <DetaineeCount count={11} />
      </IntlProvider>
    );

    expect(screen.getByText('لا يوجد معتقلين')).toBeInTheDocument();
    expect(screen.getByText('معتقل واحد')).toBeInTheDocument();
    expect(screen.getByText('معتقلان')).toBeInTheDocument();
    expect(screen.getByText('5 معتقلين')).toBeInTheDocument();
    expect(screen.getByText('11 معتقلاً')).toBeInTheDocument();
  });
});
```

### RTL Style Testing
```typescript
// src/components/__tests__/rtl-styles.test.tsx
import { render } from '@testing-library/react';
import { getComputedStyle } from '@testing-library/dom';

describe('RTL Styling', () => {
  it('applies correct RTL styles', () => {
    const { container } = render(
      <div dir="rtl" lang="ar">
        <Layout>
          <SearchForm />
        </Layout>
      </div>
    );

    const searchInput = container.querySelector('.search-input');
    const computedStyle = getComputedStyle(searchInput!);
    
    expect(computedStyle.direction).toBe('rtl');
    expect(computedStyle.textAlign).toBe('right');
    expect(computedStyle.marginInlineStart).toBe('1rem');
  });

  it('maintains correct tab order in RTL', () => {
    const { container } = render(
      <div dir="rtl" lang="ar">
        <Form />
      </div>
    );

    const elements = container.querySelectorAll('input, button');
    const tabIndices = Array.from(elements).map(el => el.tabIndex);
    
    expect(tabIndices).toEqual([...tabIndices].sort());
  });
});
```

## 20. Browser Compatibility

### Cross-Browser Testing Plan
```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  projects: [
    {
      name: 'Chrome RTL',
      use: { 
        browserName: 'chromium',
        locale: 'ar-SA',
      },
    },
    {
      name: 'Firefox RTL',
      use: { 
        browserName: 'firefox',
        locale: 'ar-SA',
      },
    },
    {
      name: 'Mobile Safari RTL',
      use: {
        browserName: 'webkit',
        locale: 'ar-SA',
        viewport: { width: 375, height: 667 },
      },
    },
  ],
  testMatch: ['**/*.e2e.ts'],
};

export default config;
```

### E2E Tests
```typescript
// tests/rtl-layout.e2e.ts
import { test, expect } from '@playwright/test';

test('maintains RTL layout across browsers', async ({ page }) => {
  await page.goto('/ar/search');
  
  // Check text alignment
  const searchInput = await page.locator('.search-input');
  expect(await searchInput.evaluate(el => {
    const style = window.getComputedStyle(el);
    return {
      direction: style.direction,
      textAlign: style.textAlign,
    };
  })).toEqual({
    direction: 'rtl',
    textAlign: 'right',
  });

  // Check layout doesn't break on resize
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('.layout-container')).toHaveScreenshot();
});

```

## 21. Development Guidelines and Best Practices

### Documentation Template
```markdown
# Translation and Internationalization Guide

## Adding New Translations

### 1. Message Structure
- Place new translations in the appropriate namespace file under `messages/{locale}/`
- Follow the existing key structure
- Include all plural forms for countable items

### 2. Pluralization Rules
Arabic plural rules:
- zero: 0
- one: 1
- two: 2
- few: 3-10
- many: 11-99
- other: everything else

Example:
```json
{
  "results": {
    "zero": "لم يتم العثور على نتائج",
    "one": "تم العثور على نتيجة واحدة",
    "two": "تم العثور على نتيجتين",
    "few": "تم العثور على {count} نتائج",
    "many": "تم العثور على {count} نتيجة",
    "other": "تم العثور على {count} نتيجة"
  }
}
```

### 3. RTL Guidelines
- Use logical properties (e.g., `margin-inline-start`)
- Test tab order in RTL mode
- Verify bidirectional text handling
```

### CI/CD Integration
```yaml
# .github/workflows/i18n-validation.yml
name: I18n Validation

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Validate translations
        run: npm run validate-translations
        
      - name: Run i18n tests
        run: npm run test:i18n
        
      - name: Run RTL layout tests
        run: npm run test:rtl
        
      - name: Run E2E tests
        run: npm run test:e2e
```

### Quality Assurance Checklist
```typescript
// scripts/i18n-qa.ts
interface QAResult {
  missingKeys: string[];
  pluralizationIssues: string[];
  rtlIssues: string[];
  accessibilityIssues: string[];
}

async function runI18nQA(): Promise<QAResult> {
  const results: QAResult = {
    missingKeys: [],
    pluralizationIssues: [],
    rtlIssues: [],
    accessibilityIssues: [],
  };

  // Check translation completeness
  await validateTranslations();

  // Verify pluralization for all count cases
  const pluralCases = [0, 1, 2, 3, 11, 100];
  const pluralKeys = findPluralKeys();
  
  for (const key of pluralKeys) {
    for (const count of pluralCases) {
      try {
        formatMessage(key, { count });
      } catch (e) {
        results.pluralizationIssues.push(
          `${key} failed for count ${count}: ${e.message}`
        );
      }
    }
  }

  // Run accessibility checks
  const axeResults = await runAxeTests();
  results.accessibilityIssues = axeResults.violations;

  return results;
}
```

## 22. Regional and Dialect Support

### Extended Locale Configuration
```typescript
// src/config/locales.ts
export const SUPPORTED_LOCALES = {
  en: {
    name: 'English',
    dir: 'ltr',
  },
  ar: {
    name: 'العربية',
    dir: 'rtl',
    regions: {
      'ar-SA': 'العربية (السعودية)',
      'ar-SY': 'العربية (سوريا)',
      'ar-EG': 'العربية (مصر)',
    },
  },
} as const;

export type LocaleCode = keyof typeof SUPPORTED_LOCALES;
export type RegionCode = keyof typeof SUPPORTED_LOCALES.ar.regions;

// Enhanced locale detection
export function getPreferredLocale(
  acceptLanguage: string,
  defaultLocale: LocaleCode = 'en'
): LocaleCode {
  const [language, region] = acceptLanguage.split('-');
  
  if (language === 'ar' && region) {
    const regionCode = `ar-${region.toUpperCase()}` as RegionCode;
    if (SUPPORTED_LOCALES.ar.regions[regionCode]) {
      return 'ar';
    }
  }
  
  return SUPPORTED_LOCALES[language as LocaleCode] 
    ? (language as LocaleCode) 
    : defaultLocale;
}
```

### Regional Message Structure
```
messages/
  ar/
    base/
      common.json
      search.json
    regional/
      sa/
        common.json
      sy/
        common.json
      eg/
        common.json
  en/
    common.json
    search.json
```

### Regional Message Loading
```typescript
// src/utils/messages.ts
export async function loadMessages(
  locale: LocaleCode,
  region?: RegionCode
): Promise<Messages> {
  const baseMessages = await import(`@/messages/${locale}/base/common.json`);
  
  if (locale === 'ar' && region) {
    const regionalMessages = await import(
      `@/messages/ar/regional/${region.toLowerCase()}/common.json`
    );
    
    return deepMerge(baseMessages, regionalMessages);
  }
  
  return baseMessages;
}
```

## 23. Error Handling and Fallbacks

### Translation Fallback Strategy
```typescript
// src/utils/i18n-error-handling.ts
import { createTranslator } from 'next-intl';

export function createFallbackTranslator(messages: Messages, locale: string) {
  const baseTranslator = createTranslator({ messages, locale });
  
  return function translate(key: string, params?: Record<string, any>) {
    try {
      return baseTranslator(key, params);
    } catch (error) {
      // Log missing translation
      console.warn(`Missing translation: ${key} for locale ${locale}`);
      
      // Fallback to English if available
      if (locale !== 'en') {
        try {
          const enTranslator = createTranslator({ 
            messages: englishMessages, 
            locale: 'en' 
          });
          return enTranslator(key, params);
        } catch {
          // If English translation is also missing, return the key
          return key.split('.').pop() || key;
        }
      }
      
      // Return the last part of the key as fallback
      return key.split('.').pop() || key;
    }
  };
}
```

### Error Boundary for RTL Issues
```typescript
// src/components/RTLErrorBoundary.tsx
export class RTLErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log RTL-related errors
    console.error('RTL Layout Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI that maintains basic RTL support
      return (
        <div dir="rtl" lang="ar" className="rtl-fallback">
          <h2>عذراً، حدث خطأ في عرض الصفحة</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
