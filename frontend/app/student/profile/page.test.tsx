/**
 * Tests for Student Profile Page - Task 16.7
 * Validates: Requirements US-3.4 (Profile Management)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/student/profile',
}));

// Mock RouteGuard to render children directly
vi.mock('@/lib/route-guard', () => ({
  RouteGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock DashboardLayout to render children directly
vi.mock('@/components/dashboard-layout-new', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock KeyboardShortcutsHelp
vi.mock('@/components/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsHelp: () => null,
}));

// Mock auth context
const mockUpdateUser = vi.fn();
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(),
}));

// Mock API
vi.mock('@/lib/api', () => ({
  usersAPI: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { usersAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import StudentProfilePage from './page';

const mockProfile = {
  id: 3,
  email: 'student@school.edu',
  full_name: 'Alice Student',
  school_id: 'S12345',
  approval_status: 'approved',
  disability_type: 'deaf',
  created_at: '2023-09-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  (useAuth as any).mockReturnValue({
    user: { id: 3, role: 'student', full_name: 'Alice Student', email: 'student@school.edu' },
    loading: false,
    updateUser: mockUpdateUser,
  });
  (usersAPI.getById as any).mockResolvedValue(mockProfile);
  (usersAPI.update as any).mockResolvedValue({ ...mockProfile, full_name: 'Alice Updated' });
});

// ─── 16.1 / 16.2 Fetch and display profile ───────────────────────────────────

describe('Student Profile Page - Fetch & Display (16.1, 16.2)', () => {
  it('shows loading spinner while fetching', () => {
    (usersAPI.getById as any).mockReturnValue(new Promise(() => {}));
    render(<StudentProfilePage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('fetches profile via usersAPI.getById on mount', async () => {
    render(<StudentProfilePage />);
    await waitFor(() => expect(usersAPI.getById).toHaveBeenCalledWith(3));
  });

  it('renders profile form after data loads', async () => {
    render(<StudentProfilePage />);
    expect(await screen.findByDisplayValue('Alice Student')).toBeInTheDocument();
  });

  it('displays member since date', async () => {
    render(<StudentProfilePage />);
    expect(await screen.findByText(/9\/1\/2023|2023/)).toBeInTheDocument();
  });
});

// ─── 16.4 Read-only fields ────────────────────────────────────────────────────

describe('Student Profile Page - Read-Only Fields (16.4)', () => {
  it('shows school_id as read-only (not an input)', async () => {
    render(<StudentProfilePage />);
    await screen.findByText('S12345');

    const inputs = screen.queryAllByRole('textbox') as HTMLInputElement[];
    const schoolIdInput = inputs.find(el => el.value === 'S12345');
    expect(schoolIdInput).toBeUndefined();
  });

  it('shows email as read-only (not an input)', async () => {
    render(<StudentProfilePage />);
    await screen.findByText('student@school.edu');

    const inputs = screen.queryAllByRole('textbox') as HTMLInputElement[];
    const emailInput = inputs.find(el => el.value === 'student@school.edu');
    expect(emailInput).toBeUndefined();
  });

  it('shows "Email cannot be changed" hint text', async () => {
    render(<StudentProfilePage />);
    expect(await screen.findByText(/email cannot be changed/i)).toBeInTheDocument();
  });

  it('shows "School ID cannot be changed" hint text', async () => {
    render(<StudentProfilePage />);
    expect(await screen.findByText(/school id cannot be changed/i)).toBeInTheDocument();
  });
});

// ─── 16.3 Connect update form ─────────────────────────────────────────────────

describe('Student Profile Page - Update Form (16.3)', () => {
  it('calls usersAPI.update with correct payload on submit', async () => {
    render(<StudentProfilePage />);
    await screen.findByDisplayValue('Alice Student');

    const nameInput = screen.getByDisplayValue('Alice Student');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Alice Updated');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    await waitFor(() =>
      expect(usersAPI.update).toHaveBeenCalledWith(3, expect.objectContaining({
        fullName: 'Alice Updated',
      }))
    );
  });

  it('does NOT include email in the update payload', async () => {
    render(<StudentProfilePage />);
    await screen.findByDisplayValue('Alice Student');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    await waitFor(() => expect(usersAPI.update).toHaveBeenCalled());
    const payload = (usersAPI.update as any).mock.calls[0][1];
    expect(payload).not.toHaveProperty('email');
  });
});

// ─── 16.5 Form validation ─────────────────────────────────────────────────────

describe('Student Profile Page - Form Validation (16.5)', () => {
  it('shows error when name is empty', async () => {
    render(<StudentProfilePage />);
    await screen.findByDisplayValue('Alice Student');

    await userEvent.clear(screen.getByDisplayValue('Alice Student'));
    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(usersAPI.update).not.toHaveBeenCalled();
  });

  it('shows error when new password and confirm password do not match', async () => {
    render(<StudentProfilePage />);
    await screen.findByDisplayValue('Alice Student');

    await userEvent.type(screen.getByLabelText(/current password/i), 'oldpass');
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'newpass1');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'newpass2');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(usersAPI.update).not.toHaveBeenCalled();
  });

  it('shows error when new password set without current password', async () => {
    render(<StudentProfilePage />);
    await screen.findByDisplayValue('Alice Student');

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'newpass1');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'newpass1');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    expect(await screen.findByText(/current password is required/i)).toBeInTheDocument();
    expect(usersAPI.update).not.toHaveBeenCalled();
  });
});

// ─── 16.6 Update auth context ─────────────────────────────────────────────────

describe('Student Profile Page - Auth Context Update (16.6)', () => {
  it('calls updateUser with updated full_name after successful update', async () => {
    render(<StudentProfilePage />);
    await screen.findByDisplayValue('Alice Student');

    const nameInput = screen.getByDisplayValue('Alice Student');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Alice Updated');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith({ full_name: 'Alice Updated' })
    );
  });

  it('does not call updateUser when API fails', async () => {
    (usersAPI.update as any).mockRejectedValue(new Error('Server error'));

    render(<StudentProfilePage />);
    await screen.findByDisplayValue('Alice Student');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('Student Profile Page - API Error Handling', () => {
  it('shows error toast on API failure during update', async () => {
    (usersAPI.update as any).mockRejectedValue(new Error('Update failed'));

    render(<StudentProfilePage />);
    await screen.findByDisplayValue('Alice Student');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Update Failed', expect.objectContaining({
        description: 'Update failed',
      }))
    );
  });
});
