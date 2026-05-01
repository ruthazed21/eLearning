/**
 * Tests for Student Courses Page - Task 12.8
 * Validates: Requirements US-3.2 (Course Browsing)
 * Properties: P3.2.1, P3.2.2, P3.2.3, P3.2.4, P3.2.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/student/courses',
}));

// Mock auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 10, role: 'student', full_name: 'Alice Student' },
    loading: false,
  }),
}));

// Mock DashboardLayout to render children directly
vi.mock('@/components/dashboard-layout-new', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock RouteGuard to render children directly
vi.mock('@/lib/route-guard', () => ({
  RouteGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock KeyboardShortcutsHelp
vi.mock('@/components/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsHelp: () => null,
}));

// Mock Radix UI Select (doesn't work in jsdom due to scrollIntoView)
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children, 'aria-label': ariaLabel }: any) => (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      aria-label={ariaLabel}
    >
      {children}
    </select>
  ),
  SelectTrigger: (_props: any) => null,
  SelectValue: (_props: any) => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

// Mock CourseCard to keep tests simple
vi.mock('@/components/course-card', () => ({
  CourseCard: ({
    title,
    enrolled,
    onEnrolled,
  }: {
    title: string;
    enrolled: boolean;
    onEnrolled?: () => void;
  }) => (
    <div data-testid="course-card">
      <span>{title}</span>
      {!enrolled && (
        <button onClick={onEnrolled} data-testid="enroll-btn">
          Enroll Now
        </button>
      )}
    </div>
  ),
}));

// Mock APIs
vi.mock('@/lib/api', () => ({
  coursesAPI: { getAll: vi.fn() },
  enrollmentsAPI: { getByStudent: vi.fn(), enroll: vi.fn() },
}));

import { coursesAPI, enrollmentsAPI } from '@/lib/api';
import CoursesPage from './page';

const mockCourses = [
  {
    id: 1,
    title: 'Intro to React',
    teacher_name: 'Bob Teacher',
    category: 'Programming',
    difficulty: 'beginner',
    duration: '4 weeks',
    lessons_count: 10,
    status: 'active',
  },
  {
    id: 2,
    title: 'Advanced Python',
    teacher_name: 'Carol Teacher',
    category: 'Programming',
    difficulty: 'advanced',
    duration: '6 weeks',
    lessons_count: 8,
    status: 'active',
  },
  {
    id: 3,
    title: 'UI/UX Design',
    teacher_name: 'Dave Teacher',
    category: 'Design',
    difficulty: 'intermediate',
    duration: '3 weeks',
    lessons_count: 6,
    status: 'active',
  },
];

const mockEnrollments = [{ course_id: 1 }];

beforeEach(() => {
  vi.clearAllMocks();
  (coursesAPI.getAll as any).mockResolvedValue(mockCourses);
  (enrollmentsAPI.getByStudent as any).mockResolvedValue(mockEnrollments);
});

// ─── 12.1 Fetch active courses ────────────────────────────────────────────────

describe('Student Courses Page - Fetch Active Courses (12.1)', () => {
  it('calls coursesAPI.getAll with status: active on mount (P3.2.1)', async () => {
    render(<CoursesPage />);
    await waitFor(() =>
      expect(coursesAPI.getAll).toHaveBeenCalledWith({ status: 'active' })
    );
  });

  it('renders a course card for each active course', async () => {
    render(<CoursesPage />);
    const cards = await screen.findAllByTestId('course-card');
    expect(cards).toHaveLength(3);
  });

  it('displays course titles after fetch', async () => {
    render(<CoursesPage />);
    expect(await screen.findByText('Intro to React')).toBeInTheDocument();
    expect(screen.getByText('Advanced Python')).toBeInTheDocument();
    expect(screen.getByText('UI/UX Design')).toBeInTheDocument();
  });
});

// ─── 12.2 Fetch enrollments ───────────────────────────────────────────────────

describe('Student Courses Page - Fetch Enrollments (12.2)', () => {
  it('calls enrollmentsAPI.getByStudent with the current user id', async () => {
    render(<CoursesPage />);
    await waitFor(() =>
      expect(enrollmentsAPI.getByStudent).toHaveBeenCalledWith(10)
    );
  });
});

// ─── 12.3 Category filter ─────────────────────────────────────────────────────

describe('Student Courses Page - Category Filter (12.3, P3.2.5)', () => {
  it('renders the category filter select', async () => {
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');
    expect(screen.getByRole('combobox', { name: /filter by category/i })).toBeInTheDocument();
  });

  it('shows all courses when "all" category selected', async () => {
    render(<CoursesPage />);
    const cards = await screen.findAllByTestId('course-card');
    expect(cards).toHaveLength(3);
  });

  it('filters courses by category', async () => {
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');

    fireEvent.change(screen.getByRole('combobox', { name: /filter by category/i }), {
      target: { value: 'Design' },
    });

    await waitFor(() => {
      expect(screen.getByText('UI/UX Design')).toBeInTheDocument();
      expect(screen.queryByText('Intro to React')).not.toBeInTheDocument();
      expect(screen.queryByText('Advanced Python')).not.toBeInTheDocument();
    });
  });
});

// ─── 12.4 Difficulty filter ───────────────────────────────────────────────────

describe('Student Courses Page - Difficulty Filter (12.4, P3.2.5)', () => {
  it('renders the difficulty filter select', async () => {
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');
    expect(screen.getByRole('combobox', { name: /filter by difficulty/i })).toBeInTheDocument();
  });

  it('filters courses by difficulty: beginner', async () => {
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');

    fireEvent.change(screen.getByRole('combobox', { name: /filter by difficulty/i }), {
      target: { value: 'beginner' },
    });

    await waitFor(() => {
      expect(screen.getByText('Intro to React')).toBeInTheDocument();
      expect(screen.queryByText('Advanced Python')).not.toBeInTheDocument();
      expect(screen.queryByText('UI/UX Design')).not.toBeInTheDocument();
    });
  });

  it('filters courses by difficulty: advanced', async () => {
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');

    fireEvent.change(screen.getByRole('combobox', { name: /filter by difficulty/i }), {
      target: { value: 'advanced' },
    });

    await waitFor(() => {
      expect(screen.getByText('Advanced Python')).toBeInTheDocument();
      expect(screen.queryByText('Intro to React')).not.toBeInTheDocument();
      expect(screen.queryByText('UI/UX Design')).not.toBeInTheDocument();
    });
  });
});

// ─── 12.5 / 12.7 Enroll button & UI update ───────────────────────────────────

describe('Student Courses Page - Enrollment (12.5, 12.7)', () => {
  it('calls fetchCourses (re-fetches) after successful enrollment', async () => {
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');

    // Courses 2 and 3 are not enrolled — find the first enroll button
    const enrollBtns = screen.getAllByTestId('enroll-btn');
    expect(enrollBtns.length).toBeGreaterThan(0);

    // Simulate onEnrolled callback (CourseCard mock calls onEnrolled on click)
    fireEvent.click(enrollBtns[0]);

    await waitFor(() =>
      expect(coursesAPI.getAll).toHaveBeenCalledTimes(2)
    );
  });
});

// ─── 12.6 Enrolled badge ─────────────────────────────────────────────────────

describe('Student Courses Page - Enrolled Badge (12.6, P3.2.2)', () => {
  it('shows enrolled badge for enrolled courses', async () => {
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');
    const badges = screen.getAllByTestId('enrolled-badge');
    expect(badges).toHaveLength(1); // only course id=1 is enrolled
    expect(badges[0]).toHaveTextContent('Enrolled');
  });

  it('does not show enrolled badge for non-enrolled courses', async () => {
    (enrollmentsAPI.getByStudent as any).mockResolvedValue([]);
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');
    expect(screen.queryAllByTestId('enrolled-badge')).toHaveLength(0);
  });
});

// ─── Search filter ────────────────────────────────────────────────────────────

describe('Student Courses Page - Search Filter', () => {
  it('filters courses by title', async () => {
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');

    const searchInput = screen.getByRole('searchbox', { name: /search courses/i });
    await userEvent.type(searchInput, 'Python');

    expect(screen.getByText('Advanced Python')).toBeInTheDocument();
    expect(screen.queryByText('Intro to React')).not.toBeInTheDocument();
    expect(screen.queryByText('UI/UX Design')).not.toBeInTheDocument();
  });

  it('filters courses by instructor name', async () => {
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');

    const searchInput = screen.getByRole('searchbox', { name: /search courses/i });
    await userEvent.type(searchInput, 'Dave');

    expect(screen.getByText('UI/UX Design')).toBeInTheDocument();
    expect(screen.queryByText('Intro to React')).not.toBeInTheDocument();
  });
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('Student Courses Page - Empty State', () => {
  it('shows empty state when no courses match filters', async () => {
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');

    const searchInput = screen.getByRole('searchbox', { name: /search courses/i });
    await userEvent.type(searchInput, 'zzznomatch');

    expect(screen.getByText(/no courses found matching your search/i)).toBeInTheDocument();
  });

  it('shows empty state when API returns no courses', async () => {
    (coursesAPI.getAll as any).mockResolvedValue([]);
    render(<CoursesPage />);
    expect(await screen.findByText(/no courses found matching your search/i)).toBeInTheDocument();
  });

  it('clear filters button resets search and filters', async () => {
    render(<CoursesPage />);
    await screen.findAllByTestId('course-card');

    const searchInput = screen.getByRole('searchbox', { name: /search courses/i });
    await userEvent.type(searchInput, 'zzznomatch');

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    await waitFor(() => {
      expect(screen.getAllByTestId('course-card')).toHaveLength(3);
    });
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('Student Courses Page - Loading State', () => {
  it('shows loading spinner while fetching', () => {
    (coursesAPI.getAll as any).mockReturnValue(new Promise(() => {}));
    render(<CoursesPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('hides loading spinner after data is fetched', async () => {
    render(<CoursesPage />);
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    );
  });
});

// ─── Error state ──────────────────────────────────────────────────────────────

describe('Student Courses Page - Error State', () => {
  it('shows error message when API call fails', async () => {
    (coursesAPI.getAll as any).mockRejectedValue(new Error('Network error'));
    render(<CoursesPage />);
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('hides loading spinner after error', async () => {
    (coursesAPI.getAll as any).mockRejectedValue(new Error('fail'));
    render(<CoursesPage />);
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    );
  });
});
