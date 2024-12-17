import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubmitForm } from './SubmitForm';
import { renderWithProviders } from '../test/test-utils';

describe('SubmitForm', () => {
  it('renders all required fields', () => {
    renderWithProviders(<SubmitForm />);
    
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of detention/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last seen location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/detention facility/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/physical description/i)).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    renderWithProviders(<SubmitForm />);
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/location must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    renderWithProviders(<SubmitForm />);
    
    await userEvent.type(screen.getByLabelText(/full name/i), 'John Doe');
    await userEvent.type(screen.getByLabelText(/date of detention/i), '2023-01-01');
    await userEvent.type(screen.getByLabelText(/last seen location/i), 'Damascus');
    await userEvent.type(screen.getByLabelText(/detention facility/i), 'Unknown');
    await userEvent.type(screen.getByLabelText(/physical description/i), 'Tall with brown hair');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    // Wait for form submission - check that error messages are gone
    await waitFor(() => {
      expect(screen.queryByText(/name must be at least 2 characters/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/location must be at least 2 characters/i)).not.toBeInTheDocument();
    });
  });
});
