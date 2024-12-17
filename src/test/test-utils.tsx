import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../components/theme-provider';

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {ui}
    </ThemeProvider>
  );
}

export * from '@testing-library/react';
