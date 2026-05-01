/**
 * Tests for Admin Users Page - Task 2.8
 * Validates: Requirements US-1.2 (User Management)
 * Properties: P1.2.1, P1.2.2, P1.2.3, P1.2.4, P1.2.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/users',
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

// Mock usersAPI
vi.mock('@/lib/api', () => ({
  usersAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { usersAPI } from '@/lib/api';
import AdminUsersPage from './page';

const mockUsers = [
  {
    id: 1,
    full_name: 'Alice Smith',
    email: 'alice@example.com',
    role: 'student',
    approval_status: 'approved',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    full_name: 'Bob Jones',
    email: 'bob@example.com',
    role: 'teacher',
    approval_status: 'approved',
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    full_name: 'Carol Admin',
    email: 'carol@example.com',
    role: 'admin',
    approval_status: 'approved',
    created_at: '2024-01-03T00:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  (usersAPI.getAll as any).mockResolvedValue(mockUsers);
});

describe('Admin Users Page - Data Fetching (2.1)', () => {
  it('fetches and displays all users on mount', async () => {
    render(<AdminUsersPage />);
    await waitFor(() => {
      expect(usersAPI.getAll).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Carol Admin')).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    // Keep the promise pending
    (usersAPI.getAll as any).mockReturnValue(new Promise(() => {}));
    render(<AdminUsersPage />);
    // "Loading users…" appears in both the card title and the spinner span
    const loadingEls = screen.getAllByText(/loading users/i);
    expect(loadingEls.length).toBeGreaterThan(0);
  });

  it('shows error message when fetch fails', async () => {
    (usersAPI.getAll as any).mockRejectedValue(new Error('Network error'));
    render(<AdminUsersPage />);
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});

describe('Admin Users Page - Search (2.2)', () => {
  it('filters users by name in real-time (P1.2.4)', async () => {
    render(<AdminUsersPage />);
    await screen.findByText('Alice Smith');

    const searchInput = screen.getByPlaceholderText(/search users/i);
    await userEvent.type(searchInput, 'alice');

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
  });

  it('filters users by email in real-time (P1.2.4)', async () => {
    render(<AdminUsersPage />);
    await screen.findByText('Alice Smith');

    const searchInput = screen.getByPlaceholderText(/search users/i);
    await userEvent.type(searchInput, 'bob@');

    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });

  it('shows all users when search is cleared', async () => {
    render(<AdminUsersPage />);
    await screen.findByText('Alice Smith');

    const searchInput = screen.getByPlaceholderText(/search users/i);
    await userEvent.type(searchInput, 'alice');
    await userEvent.clear(searchInput);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });
});

describe('Admin Users Page - Role Filter (2.3)', () => {
  it('filters to show only students (P1.2.5)', async () => {
    render(<AdminUsersPage />);
    await screen.findByText('Alice Smith');

    fireEvent.click(screen.getByRole('button', { name: /students/i }));

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
    expect(screen.queryByText('Carol Admin')).not.toBeInTheDocument();
  });

  it('filters to show only teachers (P1.2.5)', async () => {
    render(<AdminUsersPage />);
    await screen.findByText('Alice Smith');

    fireEvent.click(screen.getByRole('button', { name: /teachers/i }));

    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });

  it('filters to show only admins (P1.2.5)', async () => {
    render(<AdminUsersPage />);
    await screen.findByText('Alice Smith');

    fireEvent.click(screen.getByRole('button', { name: /admins/i }));

    expect(screen.getByText('Carol Admin')).toBeInTheDocument();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });

  it('shows all users when All Users filter selected', async () => {
    render(<AdminUsersPage />);
    await screen.findByText('Alice Smith');

    // Switch to students then back to all
    fireEvent.click(screen.getByRole('button', { name: /students/i }));
    fireEvent.click(screen.getByRole('button', { name: /all users/i }));

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Carol Admin')).toBeInTheDocument();
  });
});

describe('Admin Users Page - Delete (2.6, 2.7)', () => {
  it('removes user from list after successful delete (P1.2.3)', async () => {
    (usersAPI.delete as any).mockResolvedValue({});
    render(<AdminUsersPage />);
    await screen.findByText('Alice Smith');

    // Click delete button for Alice
    const deleteButtons = screen.getAllByRole('button', { name: /delete alice smith/i });
    fireEvent.click(deleteButtons[0]);

    // Confirm deletion in dialog
    const confirmButton = await screen.findByRole('button', { name: /delete/i, hidden: false });
    // The AlertDialogAction with "Delete" text
    const allDeleteBtns = screen.getAllByRole('button', { name: /^delete$/i });
    fireEvent.click(allDeleteBtns[allDeleteBtns.length - 1]);

    await waitFor(() => {
      expect(usersAPI.delete).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    });
  });

  it('shows error when delete fails', async () => {
    (usersAPI.delete as any).mockRejectedValue(new Error('Delete failed'));
    render(<AdminUsersPage />);
    await screen.findByText('Alice Smith');

    const deleteButtons = screen.getAllByRole('button', { name: /delete alice smith/i });
    fireEvent.click(deleteButtons[0]);

    const allDeleteBtns = screen.getAllByRole('button', { name: /^delete$/i });
    fireEvent.click(allDeleteBtns[allDeleteBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/delete failed/i)).toBeInTheDocument();
    });
    // User should still be in the list
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });
});

describe('Admin Users Page - State invariants', () => {
  it('loading is false after successful fetch', async () => {
    render(<AdminUsersPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading users/i)).not.toBeInTheDocument();
    });
  });

  it('loading is false after failed fetch', async () => {
    (usersAPI.getAll as any).mockRejectedValue(new Error('fail'));
    render(<AdminUsersPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading users/i)).not.toBeInTheDocument();
    });
  });

  it('shows empty state message when no users match filter', async () => {
    render(<AdminUsersPage />);
    await screen.findByText('Alice Smith');

    const searchInput = screen.getByPlaceholderText(/search users/i);
    await userEvent.type(searchInput, 'zzznomatch');

    expect(screen.getByText(/no users match/i)).toBeInTheDocument();
  });
});
