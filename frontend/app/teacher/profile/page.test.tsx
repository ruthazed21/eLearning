/**
 * Tests for Teacher Profile Page - Task 10.7
 * Validates: Requirements US-2.4 (Profile Management)
 * Properties: P2.4.1, P2.4.2, P2.4.3, P2.4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/teacher/profile',
}));

// Mock auth context — teacher user with updateUser
const mockUpdateUser = vi.fn();
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 5, role: 'teacher', full_name: 'Jane Teacher', email: 'jane@school.edu' },
    loading: false,
    updateUser: mockUpdateUser,
  }),
}));

// Mock keyboard shortcuts
vi.mock('@/hooks/use-keyboard-shortcuts', () => ({
  useCommonShortcuts: vi.fn(),
}));

// Mock DashboardLayout to render children directly
vi.mock('@/components/dashboard-layout-new', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock API
vi.mock('@/lib/api', () => ({
  usersAPI: {
    getById: vi.fn(),
    update: vi.fn(),
  },
  systemAPI: {
    getTeacherStats: vi.fn(),
  },
}));

import { usersAPI, systemAPI } from '@/lib/api';
import TeacherProfilePage from './page';

const mockProfile = {
  id: 5,
  email: 'jane@school.edu',
  full_name: 'Jane Teacher',
  department: 'Computer Science',
  bio: 'Experienced educator',
  phone: '555-1234',
  approval_status: 'approved',
  created_at: '2023-06-15T00:00:00Z',
};

const mockStats = { totalCourses: 4, totalStudents: 80 };

beforeEach(() => {
  vi.clearAllMocks();
  (usersAPI.getById as any).mockResolvedValue(mockProfile);
  (systemAPI.getTeacherStats as any).mockResolvedValue(mockStats);
  (usersAPI.update as any).mockResolvedValue({ ...mockProfile, full_name: 'Jane Updated' });
});

// ─── 10.1 / 10.2 Fetch and display profile ───────────────────────────────────

describe('Teacher Profile Page - Fetch & Display (10.1, 10.2)', () => {
  it('fetches profile via usersAPI.getById on mount', async () => {
    render(<TeacherProfilePage />);
    await waitFor(() => expect(usersAPI.getById).toHaveBeenCalledWith(5));
  });

  it('fetches teacher stats via systemAPI.getTeacherStats on mount', async () => {
    render(<TeacherProfilePage />);
    await waitFor(() => expect(systemAPI.getTeacherStats).toHaveBeenCalledTimes(1));
  });

  it('displays profile data after fetch', async () => {
    render(<TeacherProfilePage />);
    // Email shown in read-only section
    expect(await screen.findByText('jane@school.edu')).toBeInTheDocument();
    // Form fields pre-filled
    expect(await screen.findByDisplayValue('Jane Teacher')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument();
  });

  it('displays courses created count from stats', async () => {
    render(<TeacherProfilePage />);
    expect(await screen.findByText(/4 courses/i)).toBeInTheDocument();
  });

  it('displays member since date', async () => {
    render(<TeacherProfilePage />);
    // Date formatted from 2023-06-15
    expect(await screen.findByText(/6\/15\/2023|2023/)).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    (usersAPI.getById as any).mockReturnValue(new Promise(() => {}));
    render(<TeacherProfilePage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    (usersAPI.getById as any).mockRejectedValue(new Error('Network error'));
    render(<TeacherProfilePage />);
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});

// ─── 10.5 Email read-only ────────────────────────────────────────────────────

describe('Teacher Profile Page - Email Read-Only (10.5, P2.4.2)', () => {
  it('displays email in a non-editable element (not an input)', async () => {
    render(<TeacherProfilePage />);
    await screen.findByText('jane@school.edu');

    // Email should NOT be in an input field
    const emailInputs = screen
      .queryAllByRole('textbox')
      .filter(el => (el as HTMLInputElement).value === 'jane@school.edu');
    expect(emailInputs).toHaveLength(0);
  });

  it('shows "Email cannot be changed" hint text', async () => {
    render(<TeacherProfilePage />);
    expect(await screen.findByText(/email cannot be changed/i)).toBeInTheDocument();
  });
});

// ─── 10.3 Connect update form ────────────────────────────────────────────────

describe('Teacher Profile Page - Update Form (10.3)', () => {
  it('calls usersAPI.update with correct payload on submit (P2.4.1)', async () => {
    render(<TeacherProfilePage />);
    await screen.findByDisplayValue('Jane Teacher');

    const nameInput = screen.getByDisplayValue('Jane Teacher');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Jane Updated');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    await waitFor(() => expect(usersAPI.update).toHaveBeenCalledWith(5, expect.objectContaining({
      fullName: 'Jane Updated',
      department: 'Computer Science',
    })));
  });

  it('shows success message after successful update', async () => {
    render(<TeacherProfilePage />);
    await screen.findByDisplayValue('Jane Teacher');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument();
  });
});

// ─── 10.4 Form validation ────────────────────────────────────────────────────

describe('Teacher Profile Page - Form Validation (10.4)', () => {
  it('shows error when fullName is empty', async () => {
    render(<TeacherProfilePage />);
    await screen.findByDisplayValue('Jane Teacher');

    const nameInput = screen.getByDisplayValue('Jane Teacher');
    await userEvent.clear(nameInput);

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(usersAPI.update).not.toHaveBeenCalled();
  });

  it('shows error when department is empty', async () => {
    render(<TeacherProfilePage />);
    await screen.findByDisplayValue('Computer Science');

    const deptInput = screen.getByDisplayValue('Computer Science');
    await userEvent.clear(deptInput);

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    expect(await screen.findByText(/department is required/i)).toBeInTheDocument();
    expect(usersAPI.update).not.toHaveBeenCalled();
  });

  it('shows error when new password and confirm password do not match', async () => {
    render(<TeacherProfilePage />);
    await screen.findByDisplayValue('Jane Teacher');

    await userEvent.type(screen.getByLabelText(/current password/i), 'oldpass');
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'newpass1');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'newpass2');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(usersAPI.update).not.toHaveBeenCalled();
  });

  it('shows error when new password set without current password', async () => {
    render(<TeacherProfilePage />);
    await screen.findByDisplayValue('Jane Teacher');

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'newpass1');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'newpass1');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    expect(await screen.findByText(/current password is required/i)).toBeInTheDocument();
    expect(usersAPI.update).not.toHaveBeenCalled();
  });
});

// ─── 10.6 Update auth context ────────────────────────────────────────────────

describe('Teacher Profile Page - Auth Context Update (10.6, P2.4.4)', () => {
  it('calls updateUser with updated full_name after successful update', async () => {
    render(<TeacherProfilePage />);
    await screen.findByDisplayValue('Jane Teacher');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith({ full_name: 'Jane Updated' })
    );
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('Teacher Profile Page - API Error Handling', () => {
  it('shows error message when usersAPI.update fails', async () => {
    (usersAPI.update as any).mockRejectedValue(new Error('Update failed'));

    render(<TeacherProfilePage />);
    await screen.findByDisplayValue('Jane Teacher');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    expect(await screen.findByText(/update failed/i)).toBeInTheDocument();
  });

  it('does not call updateUser when API fails', async () => {
    (usersAPI.update as any).mockRejectedValue(new Error('Server error'));

    render(<TeacherProfilePage />);
    await screen.findByDisplayValue('Jane Teacher');

    fireEvent.submit(screen.getByRole('button', { name: /save changes/i }).closest('form')!);

    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument());
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
