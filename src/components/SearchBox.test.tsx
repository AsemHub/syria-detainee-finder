import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from './SearchBox';
import { renderWithProviders } from '../test/test-utils';

describe('SearchBox', () => {
  const mockOnSearchAction = jest.fn();

  beforeEach(() => {
    mockOnSearchAction.mockClear();
    global.fetch = jest.fn();
  });

  it('calls onSearchAction with search query', async () => {
    const mockResponse = { data: [], error: null };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    renderWithProviders(<SearchBox onSearchAction={mockOnSearchAction} />);
    const searchQuery = 'test query';
    const searchInput = screen.getByPlaceholderText(/Start typing to search/i);
    const searchButton = screen.getByRole('button', { name: /search/i });

    await userEvent.type(searchInput, searchQuery);
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String)
      });
      expect(mockOnSearchAction).toHaveBeenCalledWith(mockResponse.data);
    });
  });

  it('handles search errors gracefully', async () => {
    const errorMessage = 'Network error';
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    renderWithProviders(<SearchBox onSearchAction={mockOnSearchAction} />);
    const searchInput = screen.getByPlaceholderText(/Start typing to search/i);
    const searchButton = screen.getByRole('button', { name: /search/i });

    await userEvent.type(searchInput, 'test');
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });
  });

  it('opens and closes filters', async () => {
    renderWithProviders(<SearchBox onSearchAction={mockOnSearchAction} />);
    const filterButton = screen.getByRole('button', { name: /toggle filters/i });

    // Initially filters should be hidden
    expect(screen.queryByTestId('search-filters')).toBeNull();

    // Open filters
    await userEvent.click(filterButton);

    // Check if filters section is visible
    const filtersSection = screen.getByTestId('search-filters');
    expect(filtersSection).toBeInTheDocument();
    expect(filtersSection).toBeVisible();

    // Close filters
    await userEvent.click(filterButton);

    // Check if filters section is hidden
    expect(screen.queryByTestId('search-filters')).toBeNull();
  });

  it('shows error message for empty search', async () => {
    renderWithProviders(<SearchBox onSearchAction={mockOnSearchAction} />);
    
    const submitButton = screen.getByRole('button', { name: 'Search' });
    await userEvent.click(submitButton);

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a search term or select filters');
    expect(mockOnSearchAction).not.toHaveBeenCalled();
  });
});
