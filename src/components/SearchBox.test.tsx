import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SearchBox } from './SearchBox';
import { renderWithProviders } from '../test/test-utils';

describe('SearchBox', () => {
  const mockOnSearchAction = vi.fn();

  beforeEach(() => {
    global.fetch = vi.fn();
    mockOnSearchAction.mockClear();
  });

  it('calls onSearchAction with search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBox onSearchAction={mockOnSearchAction} />);
    const searchQuery = 'test query';
    const searchInput = screen.getByPlaceholderText(/Search by name or location.../i);
    const searchButton = screen.getByRole('button', { name: /search/i });

    await user.type(searchInput, searchQuery);
    await user.click(searchButton);

    await waitFor(() => {
      expect(mockOnSearchAction).toHaveBeenCalledWith(searchQuery);
    });
  });

  it('handles search errors gracefully', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Network error';
    (global.fetch as vi.Mock).mockRejectedValueOnce(new Error(errorMessage));

    renderWithProviders(<SearchBox onSearchAction={mockOnSearchAction} />);
    const searchInput = screen.getByPlaceholderText(/Search by name or location.../i);
    const searchButton = screen.getByRole('button', { name: /search/i });

    await user.type(searchInput, 'test');
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
    });
  });

  it('shows error message for empty search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBox onSearchAction={mockOnSearchAction} />);
    const searchButton = screen.getByRole('button', { name: /search/i });

    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a search term/i)).toBeInTheDocument();
      expect(mockOnSearchAction).not.toHaveBeenCalled();
    });
  });
});
