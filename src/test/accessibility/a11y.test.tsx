import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { SearchForm } from '../../components/search/SearchForm';
import { SearchResults } from '../../components/search/SearchResults';
import { renderWithProviders, mockRouter } from '../utils';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('SearchForm should have no accessibility violations', async () => {
    const { container } = renderWithProviders(<SearchForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('SearchResults should have no accessibility violations', async () => {
    const mockResults = [
      {
        id: '1',
        full_name_en: 'John Doe',
        detention_date: '2020-01-01',
        detention_location_en: 'Damascus',
        status: 'detained',
      },
    ];

    const { container } = renderWithProviders(<SearchResults results={mockResults} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels and roles', () => {
    renderWithProviders(<SearchForm />);
    
    // Check for proper form labeling
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /search query/i })).toBeInTheDocument();
    
    // Check for proper button labeling
    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toHaveAttribute('aria-label', 'Search');
  });

  it('should be keyboard navigable', async () => {
    renderWithProviders(<SearchForm />);
    
    const searchInput = screen.getByRole('searchbox', { name: /search query/i });
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    // Focus should move properly
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);
    
    await userEvent.tab();
    expect(document.activeElement).toBe(searchButton);
  });

  it('should have sufficient color contrast', async () => {
    const { container } = renderWithProviders(<SearchForm />);
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('should handle error states accessibly', async () => {
    const { container } = renderWithProviders(
      <SearchResults error="An error occurred" />
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
