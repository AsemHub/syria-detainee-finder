import React from 'react';
import { render } from '@testing-library/react';

// Mock the theme provider since we don't need actual theme functionality in tests
const MockThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MockThemeProvider>
      {ui}
    </MockThemeProvider>
  );
}

export * from '@testing-library/react';
