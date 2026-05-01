/**
 * Tests for Admin Courses Page - Task 3.8
 * Validates: Requirements US-1.3 (Course Management)
 * Properties: P1.3.1, P1.3.2, P1.3.3, P1.3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/courses',
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

// Mock coursesAPI
vi.mock('@/lib/api', () => ({
  coursesAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { coursesAPI } from '@/lib/api';
import AdminCoursesPage from './page';

const mockCourses = [
  {
    id: 1,
    title: 'Intro to React',
    teacher_name: 'Alice Smith',
    enrolled_count: 30,
    module_count: 10,
    category: 'Programming',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    description: 'Learn React basics',
    duration: '4 weeks',
  },
  {
    id: 2,
    title: 'Advanced Python',
    teacher_name: 'Bob Jones',
    enrolled_count: 15,
    module_count: 8,
    category: 'Programming',
    status: 'draft',
    created_at: '2024-02-01T00:00:00Z',
    description: 'Deep dive into Python',
    duration: '6 weeks',
  },
  {
    id: 3,
    title: 'UI/UX Design',
    teacher_name: 'Carol White',
    enrolled_count: 5,
    module_count: 6,
    category: 'Design',
    status: 'archived',
    created_at: '2024-03-01T00:00:00Z',
    description: 'Design fundamentals',
    duration: '3 weeks',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  (coursesAPI.getAll as any).mockResolvedValue(mockCourses);
});

// ─── 3.1 Fetch all courses ────────────────────────────────────────────────────

describe('Admin Courses Page - Data Fetching (3.1)', () => {
  it('fetches and displays all courses on mount', async () => {
    render(<AdminCoursesPage />);
    await waitFor(() => expect(coursesAPI.getAll).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Intro to React')).toBeInTheDocument();
    expect(screen.getByText('Advanced Python')).toBeInTheDocument();
    expect(screen.getByText('UI/UX Design')).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    (coursesAPI.getAll as any).mockReturnValue(new Promise(() => {}));
    render(<AdminCoursesPage />);
    expect(screen.getAllByText(/loading courses/i).length).toBeGreaterThan(0);
  });

  it('shows error message when fetch fails', async () => {
    (coursesAPI.getAll as any).mockRejectedValue(new Error('Network error'));
    render(<AdminCoursesPage />);
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('loading is false after successful fetch', async () => {
    render(<AdminCoursesPage />);
    await waitFor(() =>
      expect(screen.queryByText(/loading courses/i)).not.toBeInTheDocument()
    );
  });

  it('loading is false after failed fetch', async () => {
    (coursesAPI.getAll as any).mockRejectedValue(new Error('fail'));
    render(<AdminCoursesPage />);
    await waitFor(() =>
      expect(screen.queryByText(/loading courses/i)).not.toBeInTheDocument()
    );
  });
});

// ─── 3.2 Category filter ─────────────────────────────────────────────────────

describe('Admin Courses Page - Category Filter (3.2)', () => {
  it('shows all courses when "All Categories" selected (P1.3.4)', async () => {
    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');
    expect(screen.getByText('Advanced Python')).toBeInTheDocument();
    expect(screen.getByText('UI/UX Design')).toBeInTheDocument();
  });

  it('filters to show only Programming courses via search (P1.3.4)', async () => {
    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');

    // Use search to filter by category name (category is shown in the table)
    const searchInput = screen.getByPlaceholderText(/search courses/i);
    await userEvent.type(searchInput, 'Programming');

    // Both Programming courses should appear
    expect(screen.getByText('Intro to React')).toBeInTheDocument();
    expect(screen.getByText('Advanced Python')).toBeInTheDocument();
    // Design course should not appear
    expect(screen.queryByText('UI/UX Design')).not.toBeInTheDocument();
  });

  it('filters to show only Design courses via search (P1.3.4)', async () => {
    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');

    const searchInput = screen.getByPlaceholderText(/search courses/i);
    await userEvent.type(searchInput, 'Design');

    expect(screen.getByText('UI/UX Design')).toBeInTheDocument();
    expect(screen.queryByText('Intro to React')).not.toBeInTheDocument();
    expect(screen.queryByText('Advanced Python')).not.toBeInTheDocument();
  });

  it('category filter select is rendered with correct aria-label', async () => {
    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');
    expect(screen.getByRole('combobox', { name: /filter by category/i })).toBeInTheDocument();
  });
});

// ─── 3.3 Status filter ───────────────────────────────────────────────────────

describe('Admin Courses Page - Status Filter (3.3)', () => {
  it('filters to show only active courses (P1.3.4)', async () => {
    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');

    fireEvent.click(screen.getByRole('button', { name: /^active$/i }));

    expect(screen.getByText('Intro to React')).toBeInTheDocument();
    expect(screen.queryByText('Advanced Python')).not.toBeInTheDocument();
    expect(screen.queryByText('UI/UX Design')).not.toBeInTheDocument();
  });

  it('filters to show only draft courses (P1.3.4)', async () => {
    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');

    fireEvent.click(screen.getByRole('button', { name: /^draft$/i }));

    expect(screen.getByText('Advanced Python')).toBeInTheDocument();
    expect(screen.queryByText('Intro to React')).not.toBeInTheDocument();
    expect(screen.queryByText('UI/UX Design')).not.toBeInTheDocument();
  });

  it('filters to show only archived courses (P1.3.4)', async () => {
    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');

    fireEvent.click(screen.getByRole('button', { name: /^archived$/i }));

    expect(screen.getByText('UI/UX Design')).toBeInTheDocument();
    expect(screen.queryByText('Intro to React')).not.toBeInTheDocument();
    expect(screen.queryByText('Advanced Python')).not.toBeInTheDocument();
  });

  it('shows all courses when All filter selected', async () => {
    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');

    fireEvent.click(screen.getByRole('button', { name: /^active$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));

    expect(screen.getByText('Intro to React')).toBeInTheDocument();
    expect(screen.getByText('Advanced Python')).toBeInTheDocument();
    expect(screen.getByText('UI/UX Design')).toBeInTheDocument();
  });
});

// ─── 3.4 Create course ───────────────────────────────────────────────────────

describe('Admin Courses Page - Create Course (3.4)', () => {
  it('adds new course to list after successful create (P1.3.1)', async () => {
    const newCourse = {
      id: 99,
      title: 'New Course',
      teacher_name: 'Admin',
      enrolled_count: 0,
      module_count: 0,
      category: 'Science',
      status: 'draft',
      created_at: '2024-04-01T00:00:00Z',
      description: 'A brand new course',
      duration: '2 weeks',
    };
    (coursesAPI.create as any).mockResolvedValue(newCourse);

    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');

    // Open the Add Course dialog
    fireEvent.click(screen.getByRole('button', { name: /add new course/i }));

    // The dialog is now open - scope queries to the dialog
    const dialog = await screen.findByRole('dialog');
    const { getByLabelText, getByRole: getByRoleInDialog } = within(dialog);

    await userEvent.type(getByLabelText(/course title/i), 'New Course');
    await userEvent.type(getByLabelText(/description/i), 'A brand new course');
    await userEvent.type(getByLabelText(/category/i), 'Science');

    // Submit
    fireEvent.click(getByRoleInDialog('button', { name: /create course/i }));

    await waitFor(() => expect(coursesAPI.create).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('New Course')).toBeInTheDocument();
  });
});

// ─── 3.5 Edit course ─────────────────────────────────────────────────────────

describe('Admin Courses Page - Edit Course (3.5)', () => {
  it('updates course in list after successful edit (P1.3.2)', async () => {
    const updatedCourse = {
      id: 1,
      title: 'Intro to React - Updated',
      teacher_name: 'Alice Smith',
      enrolled_count: 30,
      module_count: 10,
      category: 'Programming',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      description: 'Updated description',
      duration: '4 weeks',
    };
    (coursesAPI.update as any).mockResolvedValue(updatedCourse);

    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');

    // Click edit button for first course
    const editButtons = screen.getAllByRole('button', { name: /edit intro to react/i });
    fireEvent.click(editButtons[0]);

    // Update the title
    const titleInput = screen.getByLabelText(/course title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Intro to React - Updated');

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(coursesAPI.update).toHaveBeenCalledWith(1, expect.any(Object)));
    expect(await screen.findByText('Intro to React - Updated')).toBeInTheDocument();
    expect(screen.queryByText('Intro to React')).not.toBeInTheDocument();
  });
});

// ─── 3.6 Delete course ───────────────────────────────────────────────────────

describe('Admin Courses Page - Delete Course (3.6, 3.7)', () => {
  it('removes course from list after successful delete (P1.3.3)', async () => {
    (coursesAPI.delete as any).mockResolvedValue({});
    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');

    // Click delete button for first course
    const deleteButtons = screen.getAllByRole('button', { name: /delete intro to react/i });
    fireEvent.click(deleteButtons[0]);

    // Confirm deletion
    const allDeleteBtns = screen.getAllByRole('button', { name: /^delete$/i });
    fireEvent.click(allDeleteBtns[allDeleteBtns.length - 1]);

    await waitFor(() => expect(coursesAPI.delete).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(screen.queryByText('Intro to React')).not.toBeInTheDocument()
    );
  });

  it('shows error and keeps course when delete fails', async () => {
    (coursesAPI.delete as any).mockRejectedValue(new Error('Delete failed'));
    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');

    const deleteButtons = screen.getAllByRole('button', { name: /delete intro to react/i });
    fireEvent.click(deleteButtons[0]);

    const allDeleteBtns = screen.getAllByRole('button', { name: /^delete$/i });
    fireEvent.click(allDeleteBtns[allDeleteBtns.length - 1]);

    await waitFor(() => expect(screen.getByText(/delete failed/i)).toBeInTheDocument());
    expect(screen.getByText('Intro to React')).toBeInTheDocument();
  });
});

// ─── Empty state ─────────────────────────────────────────────────────────────

describe('Admin Courses Page - Empty States', () => {
  it('shows empty state when no courses exist', async () => {
    (coursesAPI.getAll as any).mockResolvedValue([]);
    render(<AdminCoursesPage />);
    expect(await screen.findByText(/no courses found/i)).toBeInTheDocument();
  });

  it('shows no-match message when filters yield no results', async () => {
    render(<AdminCoursesPage />);
    await screen.findByText('Intro to React');

    const searchInput = screen.getByPlaceholderText(/search courses/i);
    await userEvent.type(searchInput, 'zzznomatch');

    expect(screen.getByText(/no courses match/i)).toBeInTheDocument();
  });
});
