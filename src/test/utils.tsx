import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider as NextThemeProvider } from '../components/providers/theme-provider';
import { NextIntlClientProvider } from 'next-intl';
import * as nextIntl from 'next-intl';

// Mock messages for internationalization
const defaultMessages = {
  common: {
    search: 'Search',
    submit: 'Submit',
    location: 'Location',
    detentionDate: 'Detention Date',
    status: 'Status',
  },
  ar: {
    common: {
      search: 'بحث',
      submit: 'إرسال',
      location: 'الموقع',
      detentionDate: 'تاريخ الاعتقال',
      status: 'الحالة',
    }
  }
};

// Mock next-themes
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn().mockReturnValue({}),
  usePathname: jest.fn().mockReturnValue('/'),
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
}));

// @ts-ignore
global.navigation = {
  useParams: jest.fn().mockReturnValue({}),
  usePathname: jest.fn().mockReturnValue('/'),
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
};

// Mock next-intl
jest.mock('next-intl', () => ({
  ...jest.requireActual('next-intl'),
  useLocale: jest.fn().mockReturnValue('en'),
  useTranslations: () => (key: string) => key,
  useNow: jest.fn().mockReturnValue(new Date('2024-01-01')),
  useTimeZone: jest.fn().mockReturnValue('UTC'),
  useMessages: jest.fn().mockReturnValue(defaultMessages),
}));

export function renderWithProviders(
  ui: React.ReactElement,
  {
    locale = 'en',
    messages = defaultMessages,
    ...renderOptions
  } = {}
) {
  // Override the useLocale mock for specific tests
  const mockedNextIntl = nextIntl as jest.Mocked<typeof nextIntl>;
  mockedNextIntl.useLocale = jest.fn().mockReturnValue(locale);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <NextThemeProvider>
          {children}
        </NextThemeProvider>
      </NextIntlClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock Supabase client
export const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  })),
  auth: {
    getSession: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
};

// Mock window.matchMedia
export function setupMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock next/navigation
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};
