import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '../test/test-utils';
import { SubmitForm } from './SubmitForm';

const mockValidFormData = {
  full_name: 'John Doe',
  date_of_detention: '2023-01-01',
  last_seen_location: 'Damascus',
  detention_facility: 'Central Prison',
  physical_description: 'Tall, brown hair',
  age_at_detention: 30,
  gender: 'male',
  status: 'detained',
  additional_info: 'Last seen at checkpoint'
};

describe('SubmitForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  const fillForm = async (data = mockValidFormData) => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), data.full_name);
    await user.type(screen.getByLabelText(/date of detention/i), data.date_of_detention);
    await user.type(screen.getByLabelText(/last seen location/i), data.last_seen_location);
    await user.type(screen.getByLabelText(/detention facility/i), data.detention_facility);
    await user.type(screen.getByLabelText(/physical description/i), data.physical_description);
    await user.type(screen.getByLabelText(/age at detention/i), data.age_at_detention.toString());
    await user.selectOptions(screen.getByLabelText(/gender/i), data.gender);
    await user.selectOptions(screen.getByLabelText(/status/i), data.status);
    await user.type(screen.getByLabelText(/additional info/i), data.additional_info);
  };

  it('shows validation errors for required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SubmitForm />);
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last seen location is required/i)).toBeInTheDocument();
    });
  });

  it('checks for duplicates before submission', async () => {
    const mockDuplicates = [
      {
        id: '1',
        full_name: 'John Doe',
        last_seen_location: 'Damascus'
      }
    ];

    (global.fetch as vi.Mock).mockImplementation((url) => {
      if (url.includes('/api/check-duplicate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ duplicates: mockDuplicates })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders(<SubmitForm />);
    await fillForm();
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/potential duplicate entries found/i)).toBeInTheDocument();
    });
  });

  it('submits form successfully when no duplicates found', async () => {
    (global.fetch as vi.Mock).mockImplementation((url) => {
      if (url.includes('/api/check-duplicate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ duplicates: [] })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    });

    renderWithProviders(<SubmitForm />);
    await fillForm();
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/submission successful/i)).toBeInTheDocument();
    });
  });

  it('handles submission errors gracefully', async () => {
    (global.fetch as vi.Mock).mockImplementation((url) => {
      if (url.includes('/api/check-duplicate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ duplicates: [] })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' })
      });
    });

    renderWithProviders(<SubmitForm />);
    await fillForm();
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to submit/i)).toBeInTheDocument();
    });
  });

  it('handles rate limiting', async () => {
    (global.fetch as vi.Mock).mockImplementation((url) => {
      if (url.includes('/api/check-duplicate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ duplicates: [] })
        });
      }
      return Promise.resolve({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Too many requests' })
      });
    });

    renderWithProviders(<SubmitForm />);
    await fillForm();
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });

  it('handles validation errors from the server', async () => {
    (global.fetch as vi.Mock).mockImplementation((url) => {
      if (url.includes('/api/check-duplicate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ duplicates: [] })
        });
      }
      return Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'Validation failed',
          details: { full_name: 'Invalid name format' }
        })
      });
    });

    renderWithProviders(<SubmitForm />);
    await fillForm();
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid name format/i)).toBeInTheDocument();
    });
  });
});
