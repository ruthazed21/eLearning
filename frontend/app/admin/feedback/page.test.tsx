/**
 * Tests for Admin Feedback Page - Task 5.7
 * Validates: Requirements US-1.4 (Feedback Management)
 * Properties: P1.4.1, P1.4.2, P1.4.3, P1.4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// jsdom doesn't implement scrollIntoView - needed by Radix UI Select
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/feedback',
}));

// Mock auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 1, role: 'admin', full_name: 'Admin' }, loading: false }),
}));

// Mock keyboard shortcuts
vi.mock('@/hooks/use-keyboard-shortcuts', () => ({
  useCommonShortcuts: vi.fn(),
}));

// Mock DashboardLayout to render children directly
vi.mock('@/components/dashboard-layout-new', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock feedbackAPI
vi.mock('@/lib/api', () => ({
  feedbackAPI: {
    getAll: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  },
}));

import { feedbackAPI } from '@/lib/api';
import AdminFeedbackPage from './page';

const mockFeedbacks = [
  {
    id: 1,
    full_name: 'Alice Student',
    email: 'alice@example.com',
    role: 'student',
    subject: 'Login issue',
    message: 'Cannot log in to the platform',
    category: 'Bug',
    priority: 'high',
    status: 'open',
    admin_response: null,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    full_name: 'Bob Teacher',
    email: 'bob@example.com',
    role: 'teacher',
    subject: 'Feature request: dark mode',
    message: 'Please add dark mode support',
    category: 'Feature Request',
    priority: 'medium',
    status: 'in_progress',
    admin_response: 'We are working on it',
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    full_name: 'Carol Student',
    email: 'carol@example.com',
    role: 'student',
    subject: 'Accessibility concern',
    message: 'Screen reader not working',
    category: 'Accessibility',
    priority: 'low',
    status: 'resolved',
    admin_response: 'Fixed in latest update',
    created_at: '2024-01-03T00:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  (feedbackAPI.getAll as any).mockResolvedValue(mockFeedbacks);
});

// ─── 5.1 Fetch all feedback ───────────────────────────────────────────────────

describe('Admin Feedback Page - Data Fetching (5.1)', () => {
  it('fetches and displays all feedback on mount', async () => {
    render(<AdminFeedbackPage />);
    await waitFor(() => {
      expect(feedbackAPI.getAll).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Login issue')).toBeInTheDocument();
    expect(screen.getByText('Feature request: dark mode')).toBeInTheDocument();
    expect(screen.getByText('Accessibility concern')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    (feedbackAPI.getAll as any).mockReturnValue(new Promise(() => {}));
    render(<AdminFeedbackPage />);
    // Spinner should be present (animate-spin class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    (feedbackAPI.getAll as any).mockRejectedValue(new Error('Network error'));
    render(<AdminFeedbackPage />);
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('shows empty state when no feedback exists', async () => {
    (feedbackAPI.getAll as any).mockResolvedValue([]);
    render(<AdminFeedbackPage />);
    expect(await screen.findByText(/no feedback received yet/i)).toBeInTheDocument();
  });

  it('displays correct statistics counts', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');
    // Total = 3, Open = 1, In Progress = 1, Resolved = 1
    const statCards = screen.getAllByText('1');
    expect(statCards.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── 5.2 Status filter ────────────────────────────────────────────────────────

describe('Admin Feedback Page - Status Filter (5.2)', () => {
  it('shows all feedback when status filter is "all" (P1.4.3)', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');
    expect(screen.getByText('Login issue')).toBeInTheDocument();
    expect(screen.getByText('Feature request: dark mode')).toBeInTheDocument();
    expect(screen.getByText('Accessibility concern')).toBeInTheDocument();
  });

  it('filters to show only open feedback (P1.4.3)', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    // Open the status select
    const statusTrigger = screen.getByRole('combobox', { name: /status/i });
    fireEvent.click(statusTrigger);
    const openOption = await screen.findByRole('option', { name: /^open$/i });
    fireEvent.click(openOption);

    await waitFor(() => {
      expect(screen.getByText('Login issue')).toBeInTheDocument();
      expect(screen.queryByText('Feature request: dark mode')).not.toBeInTheDocument();
      expect(screen.queryByText('Accessibility concern')).not.toBeInTheDocument();
    });
  });

  it('filters to show only in_progress feedback (P1.4.3)', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const statusTrigger = screen.getByRole('combobox', { name: /status/i });
    fireEvent.click(statusTrigger);
    const inProgressOption = await screen.findByRole('option', { name: /in progress/i });
    fireEvent.click(inProgressOption);

    await waitFor(() => {
      expect(screen.getByText('Feature request: dark mode')).toBeInTheDocument();
      expect(screen.queryByText('Login issue')).not.toBeInTheDocument();
      expect(screen.queryByText('Accessibility concern')).not.toBeInTheDocument();
    });
  });

  it('filters to show only resolved feedback (P1.4.3)', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const statusTrigger = screen.getByRole('combobox', { name: /status/i });
    fireEvent.click(statusTrigger);
    const resolvedOption = await screen.findByRole('option', { name: /^resolved$/i });
    fireEvent.click(resolvedOption);

    await waitFor(() => {
      expect(screen.getByText('Accessibility concern')).toBeInTheDocument();
      expect(screen.queryByText('Login issue')).not.toBeInTheDocument();
      expect(screen.queryByText('Feature request: dark mode')).not.toBeInTheDocument();
    });
  });

  it('shows empty state message when no feedback matches filter (P1.4.3)', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const statusTrigger = screen.getByRole('combobox', { name: /status/i });
    fireEvent.click(statusTrigger);
    const closedOption = await screen.findByRole('option', { name: /^closed$/i });
    fireEvent.click(closedOption);

    await waitFor(() => {
      expect(screen.getByText(/no feedback matches the selected filters/i)).toBeInTheDocument();
    });
  });
});

// ─── 5.3 Priority filter ──────────────────────────────────────────────────────

describe('Admin Feedback Page - Priority Filter (5.3)', () => {
  it('filters to show only high priority feedback (P1.4.3)', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const priorityTrigger = screen.getByRole('combobox', { name: /priority/i });
    fireEvent.click(priorityTrigger);
    const highOption = await screen.findByRole('option', { name: /^high$/i });
    fireEvent.click(highOption);

    await waitFor(() => {
      expect(screen.getByText('Login issue')).toBeInTheDocument();
      expect(screen.queryByText('Feature request: dark mode')).not.toBeInTheDocument();
      expect(screen.queryByText('Accessibility concern')).not.toBeInTheDocument();
    });
  });

  it('filters to show only medium priority feedback (P1.4.3)', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const priorityTrigger = screen.getByRole('combobox', { name: /priority/i });
    fireEvent.click(priorityTrigger);
    const mediumOption = await screen.findByRole('option', { name: /^medium$/i });
    fireEvent.click(mediumOption);

    await waitFor(() => {
      expect(screen.getByText('Feature request: dark mode')).toBeInTheDocument();
      expect(screen.queryByText('Login issue')).not.toBeInTheDocument();
      expect(screen.queryByText('Accessibility concern')).not.toBeInTheDocument();
    });
  });

  it('filters to show only low priority feedback (P1.4.3)', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const priorityTrigger = screen.getByRole('combobox', { name: /priority/i });
    fireEvent.click(priorityTrigger);
    const lowOption = await screen.findByRole('option', { name: /^low$/i });
    fireEvent.click(lowOption);

    await waitFor(() => {
      expect(screen.getByText('Accessibility concern')).toBeInTheDocument();
      expect(screen.queryByText('Login issue')).not.toBeInTheDocument();
      expect(screen.queryByText('Feature request: dark mode')).not.toBeInTheDocument();
    });
  });
});

// ─── 5.4 Update status ────────────────────────────────────────────────────────

describe('Admin Feedback Page - Update Status (5.4)', () => {
  it('calls feedbackAPI.updateStatus when quick-resolve button clicked (P1.4.1)', async () => {
    (feedbackAPI.updateStatus as any).mockResolvedValue({});
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    // The green checkmark button marks as resolved
    const resolveButtons = screen.getAllByRole('button', { name: /mark as resolved/i });
    fireEvent.click(resolveButtons[0]);

    await waitFor(() => {
      expect(feedbackAPI.updateStatus).toHaveBeenCalledWith(1, 'resolved');
    });
  });

  it('updates feedback status in local state after successful update (P1.4.1)', async () => {
    (feedbackAPI.updateStatus as any).mockResolvedValue({});
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const resolveButtons = screen.getAllByRole('button', { name: /mark as resolved/i });
    fireEvent.click(resolveButtons[0]);

    await waitFor(() => {
      // After resolving, the "mark as resolved" button for that item should disappear
      const remainingResolveButtons = screen.queryAllByRole('button', { name: /mark as resolved/i });
      // Only 1 remaining (for Bob's in_progress item), not 2
      expect(remainingResolveButtons.length).toBeLessThan(2);
    });
  });

  it('shows error when status update fails', async () => {
    (feedbackAPI.updateStatus as any).mockRejectedValue(new Error('Update failed'));
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const resolveButtons = screen.getAllByRole('button', { name: /mark as resolved/i });
    fireEvent.click(resolveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/failed to update status/i)).toBeInTheDocument();
    });
  });
});

// ─── 5.5 Admin response ───────────────────────────────────────────────────────

describe('Admin Feedback Page - Admin Response (5.5)', () => {
  it('opens view dialog when Eye button clicked', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const viewButtons = screen.getAllByRole('button', { name: /view details/i });
    fireEvent.click(viewButtons[0]);

    expect(await screen.findByText('Feedback Details')).toBeInTheDocument();
    expect(screen.getByText('Cannot log in to the platform')).toBeInTheDocument();
  });

  it('calls feedbackAPI.updateStatus with response text when Save Response clicked (P1.4.2)', async () => {
    (feedbackAPI.updateStatus as any).mockResolvedValue({});
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const viewButtons = screen.getAllByRole('button', { name: /view details/i });
    fireEvent.click(viewButtons[0]);

    await screen.findByText('Feedback Details');
    const textarea = screen.getByPlaceholderText(/type your response/i);
    await userEvent.type(textarea, 'We are looking into this issue');

    const saveButton = screen.getByRole('button', { name: /save response/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(feedbackAPI.updateStatus).toHaveBeenCalledWith(
        1,
        'open',
        'We are looking into this issue'
      );
    });
  });

  it('Save Response button is disabled when textarea is empty', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const viewButtons = screen.getAllByRole('button', { name: /view details/i });
    fireEvent.click(viewButtons[0]);

    await screen.findByText('Feedback Details');
    const saveButton = screen.getByRole('button', { name: /save response/i });
    expect(saveButton).toBeDisabled();
  });

  it('shows previous admin response in dialog', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Feature request: dark mode');

    const viewButtons = screen.getAllByRole('button', { name: /view details/i });
    fireEvent.click(viewButtons[1]); // Bob's feedback

    await screen.findByText('Feedback Details');
    // The previous response appears in the "Previous Response" section
    const responseTexts = screen.getAllByText('We are working on it');
    expect(responseTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('updates local state with new admin response after save (P1.4.2)', async () => {
    (feedbackAPI.updateStatus as any).mockResolvedValue({});
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const viewButtons = screen.getAllByRole('button', { name: /view details/i });
    fireEvent.click(viewButtons[0]);

    await screen.findByText('Feedback Details');
    const textarea = screen.getByPlaceholderText(/type your response/i);
    await userEvent.type(textarea, 'Response saved');

    fireEvent.click(screen.getByRole('button', { name: /save response/i }));

    await waitFor(() => {
      // Dialog should close after save
      expect(screen.queryByText('Feedback Details')).not.toBeInTheDocument();
    });
  });
});

// ─── 5.6 Delete feedback ──────────────────────────────────────────────────────

describe('Admin Feedback Page - Delete (5.6)', () => {
  it('shows delete confirmation dialog when delete button clicked', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const deleteButtons = screen.getAllByRole('button', { name: /delete feedback/i });
    fireEvent.click(deleteButtons[0]);

    expect(await screen.findByText('Delete Feedback')).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });

  it('calls feedbackAPI.delete with correct id on confirm (P1.4.4)', async () => {
    (feedbackAPI.delete as any).mockResolvedValue({});
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const deleteButtons = screen.getAllByRole('button', { name: /delete feedback/i });
    fireEvent.click(deleteButtons[0]);

    await screen.findByText('Delete Feedback');
    const confirmButton = screen.getByRole('button', { name: /^delete$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(feedbackAPI.delete).toHaveBeenCalledWith(1);
    });
  });

  it('removes feedback from list after successful delete (P1.4.4)', async () => {
    (feedbackAPI.delete as any).mockResolvedValue({});
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const deleteButtons = screen.getAllByRole('button', { name: /delete feedback/i });
    fireEvent.click(deleteButtons[0]);

    await screen.findByText('Delete Feedback');
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Login issue')).not.toBeInTheDocument();
    });
    // Other items remain
    expect(screen.getByText('Feature request: dark mode')).toBeInTheDocument();
  });

  it('does not remove feedback when delete is cancelled', async () => {
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const deleteButtons = screen.getAllByRole('button', { name: /delete feedback/i });
    fireEvent.click(deleteButtons[0]);

    await screen.findByText('Delete Feedback');
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Delete Feedback')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Login issue')).toBeInTheDocument();
  });

  it('shows error when delete fails', async () => {
    (feedbackAPI.delete as any).mockRejectedValue(new Error('Delete failed'));
    render(<AdminFeedbackPage />);
    await screen.findByText('Login issue');

    const deleteButtons = screen.getAllByRole('button', { name: /delete feedback/i });
    fireEvent.click(deleteButtons[0]);

    await screen.findByText('Delete Feedback');
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to delete feedback/i)).toBeInTheDocument();
    });
    // Item should still be in the list (may appear in multiple places)
    expect(screen.getAllByText('Login issue').length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Loading / error state invariants ────────────────────────────────────────

describe('Admin Feedback Page - State Invariants', () => {
  it('loading is false after successful fetch', async () => {
    render(<AdminFeedbackPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  it('loading is false after failed fetch', async () => {
    (feedbackAPI.getAll as any).mockRejectedValue(new Error('fail'));
    render(<AdminFeedbackPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });
});
