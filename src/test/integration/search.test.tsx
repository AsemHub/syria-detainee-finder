import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchForm } from '../../components/search/SearchForm';
import { SearchResults } from '../../components/search/SearchResults';
import { renderWithProviders, mockSupabaseClient, mockRouter } from '../utils';

// Mock the Supabase client
jest.mock('../../lib/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('Search Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should perform a search and display results', async () => {
    const mockResults = [
      {
        id: '1',
        full_name_ar: 'محمد أحمد',
        full_name_en: 'Mohammed Ahmed',
        detention_date: '2020-01-01',
        detention_location_en: 'Damascus',
        status: 'detained',
      },
    ];

    const onSearch = jest.fn();

    const { rerender } = renderWithProviders(
      <>
        <SearchForm onSearch={onSearch} />
        <SearchResults results={[]} />
      </>
    );

    const searchInput = screen.getByRole('searchbox', { name: /search query/i });
    await userEvent.type(searchInput, 'Mohammed');
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await userEvent.click(searchButton);

    expect(onSearch).toHaveBeenCalledWith('Mohammed');

    // Rerender with results
    rerender(
      <>
        <SearchForm onSearch={onSearch} />
        <SearchResults results={mockResults} />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText(/mohammed ahmed/i)).toBeInTheDocument();
      expect(screen.getByText(/damascus/i)).toBeInTheDocument();
    });
  });

  it('should handle search errors gracefully', async () => {
    const { rerender } = renderWithProviders(
      <>
        <SearchForm />
        <SearchResults />
      </>
    );

    const searchInput = screen.getByRole('searchbox', { name: /search query/i });
    await userEvent.type(searchInput, 'Test');
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await userEvent.click(searchButton);

    // Rerender with error
    rerender(
      <>
        <SearchForm />
        <SearchResults error="Database error" />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/database error/i)).toBeInTheDocument();
    });
  });

  it('should handle Arabic search input correctly', async () => {
    const mockResults = [
      {
        id: '1',
        full_name_ar: 'محمد أحمد',
        full_name_en: 'Mohammed Ahmed',
        detention_date: '2020-01-01',
        detention_location_ar: 'دمشق',
        status: 'detained',
      },
    ];

    const { rerender } = renderWithProviders(
      <>
        <SearchForm />
        <SearchResults />
      </>,
      { locale: 'ar' }
    );

    const searchInput = screen.getByRole('searchbox', { name: /search query/i });
    await userEvent.type(searchInput, 'محمد');
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await userEvent.click(searchButton);

    // Rerender with results
    rerender(
      <>
        <SearchForm />
        <SearchResults results={mockResults} />
      </>,
      { locale: 'ar' }
    );

    await waitFor(() => {
      expect(screen.getByText(/محمد أحمد/i)).toBeInTheDocument();
      expect(screen.getByText(/دمشق/i)).toBeInTheDocument();
    });
  });
});
