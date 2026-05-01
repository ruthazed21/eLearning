/**
 * Tests for Student Dashboard Page - Task 11.7
 * Validates: Requirements US-3.1 (Student Dashboard Overview)
 * Properties: P3.1.1, P3.1.2, P3.1.3, P3.1.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/student/dashboard',
}));

// Mock auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 10, role: 'student', full_name: 'Alice Student' },
    loading: false,
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

// Mock RouteGuard to render children directly
vi.mock('@/lib/route-guard', () => ({
  RouteGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock KeyboardShortcutsHelp
vi.mock('@/components/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsHelp: () => null,
}));

// Mock CourseCard
vi.mock('@/components/course-card', () => ({
  CourseCard: ({ title, progress }: { title: string; progress: number }) => (
    <div data-testid="course-card">
      <span>{title}</span>
      <span>{progress}%</span>
    </div>
  ),
}));

// Mock APIs
vi.mock('@/lib/api', () => ({
  systemAPI: { getStudentStats: vi.fn() },
  enrollmentsAPI: { getByStudent: vi.fn() },
  progressAPI: { getByStudent: vi.fn() },
}));

import { systemAPI, enrollmentsAPI, progressAPI } from '@/lib/api';
import StudentDashboard from './page';

const mockStats = {
  enrolledCourses: 3,
  completedCourses: 1,
  avgProgress: '45%',
  totalHours: 12,
};

const mockEnrollments = [
  {
    course_id: 101,
    title: 'Intro to React',
    teacher_name: 'Bob Teacher',
    progress_percentage: 60,
    total_lessons: 10,
    enrolled_at: '2024-01-15T00:00:00Z',
    category: 'Programming',
  },
  {
    course_id: 102,
    title: 'Advanced Python',
    teacher_name: 'Carol Teacher',
    progress_percentage: 30,
    total_lessons: 8,
    enrolled_at: '2024-02-01T00:00:00Z',
    category: 'Programming',
  },
  {
    course_id: 103,
    title: 'UI/UX Design',
    teacher_name: 'Dave Teacher',
    progress_percentage: 0,
    total_lessons: 6,
    enrolled_at: '2024-03-10T00:00:00Z',
    category: 'Design',
  },
];

const mockProgress = [
  { lesson_id: 1, completed: true, time_spent: 1800 },
  { lesson_id: 2, completed: false, time_spent: 600 },
];

beforeEach(() => {
  vi.clearAllMocks();
  (systemAPI.getStudentStats as any).mockResolvedValue(mockStats);
  (enrollmentsAPI.getByStudent as any).mockResolvedValue(mockEnrollments);
  (progressAPI.getByStudent as any).mockResolvedValue(mockProgress);
});

// ─── 11.1 / 11.2 Data fetching ───────────────────────────────────────────────

describe('Student Dashboard - Data Fetching (11.1, 11.2)', () => {
  it('fetches enrollments via enrollmentsAPI.getByStudent on mount', async () => {
    render(<StudentDashboard />);
    await waitFor(() =>
      expect(enrollmentsAPI.getByStudent).toHaveBeenCalledWith(10)
    );
  });

  it('fetches progress via progressAPI.getByStudent on mount', async () => {
    render(<StudentDashboard />);
    await waitFor(() =>
      expect(progressAPI.getByStudent).toHaveBeenCalledWith(10)
    );
  });

  it('fetches student stats via systemAPI.getStudentStats on mount', async () => {
    render(<StudentDashboard />);
    await waitFor(() =>
      expect(systemAPI.getStudentStats).toHaveBeenCalledTimes(1)
    );
  });
});

// ─── 11.3 Statistics display ─────────────────────────────────────────────────

describe('Student Dashboard - Statistics (11.3)', () => {
  it('displays enrolled courses count from stats', async () => {
    render(<StudentDashboard />);
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getByText('Enrolled Courses')).toBeInTheDocument();
  });

  it('displays completed courses count from stats', async () => {
    render(<StudentDashboard />);
    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('displays average progress from stats', async () => {
    render(<StudentDashboard />);
    expect(await screen.findByText('45%')).toBeInTheDocument();
    expect(screen.getByText('Avg. Progress')).toBeInTheDocument();
  });

  it('displays total hours from stats', async () => {
    render(<StudentDashboard />);
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('Est. Hours')).toBeInTheDocument();
  });
});

// ─── 11.4 Enrolled courses with progress bars ────────────────────────────────

describe('Student Dashboard - Enrolled Courses (11.4)', () => {
  it('renders a CourseCard for each enrolled course', async () => {
    render(<StudentDashboard />);
    const cards = await screen.findAllByTestId('course-card');
    expect(cards).toHaveLength(3);
  });

  it('shows course titles in the cards', async () => {
    render(<StudentDashboard />);
    expect(await screen.findByText('Intro to React')).toBeInTheDocument();
    expect(screen.getByText('Advanced Python')).toBeInTheDocument();
    expect(screen.getByText('UI/UX Design')).toBeInTheDocument();
  });

  it('passes progress_percentage to CourseCard', async () => {
    render(<StudentDashboard />);
    expect(await screen.findByText('60%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });
});

// ─── 11.5 Recent activity feed ───────────────────────────────────────────────

describe('Student Dashboard - Recent Activity (11.5)', () => {
  it('shows Recent Activity section heading', async () => {
    render(<StudentDashboard />);
    expect(await screen.findByText('Recent Activity')).toBeInTheDocument();
  });

  it('shows enrollment activity items derived from enrollments', async () => {
    render(<StudentDashboard />);
    expect(await screen.findByText('Enrolled in Intro to React')).toBeInTheDocument();
  });

  it('shows at most 3 recent activity items', async () => {
    render(<StudentDashboard />);
    await screen.findByText('Recent Activity');
    const activityItems = screen.getAllByText(/Enrolled in/);
    expect(activityItems.length).toBeLessThanOrEqual(3);
  });
});

// ─── 11.6 Loading and error states ───────────────────────────────────────────

describe('Student Dashboard - Loading State (11.6)', () => {
  it('shows loading spinner while fetching data', () => {
    (systemAPI.getStudentStats as any).mockReturnValue(new Promise(() => {}));
    render(<StudentDashboard />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('hides loading spinner after data is fetched', async () => {
    render(<StudentDashboard />);
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    );
  });
});

describe('Student Dashboard - Error State (11.6)', () => {
  it('shows error message when API call fails', async () => {
    (systemAPI.getStudentStats as any).mockRejectedValue(new Error('Network error'));
    render(<StudentDashboard />);
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('hides loading spinner after error', async () => {
    (enrollmentsAPI.getByStudent as any).mockRejectedValue(new Error('fail'));
    render(<StudentDashboard />);
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    );
  });
});

// ─── Empty enrollments ───────────────────────────────────────────────────────

describe('Student Dashboard - Empty Enrollments', () => {
  it('shows empty state message when no courses enrolled', async () => {
    (enrollmentsAPI.getByStudent as any).mockResolvedValue([]);
    render(<StudentDashboard />);
    expect(await screen.findByText(/no courses enrolled yet/i)).toBeInTheDocument();
  });

  it('shows browse courses link when no enrollments', async () => {
    (enrollmentsAPI.getByStudent as any).mockResolvedValue([]);
    render(<StudentDashboard />);
    expect(await screen.findByText(/browse available courses/i)).toBeInTheDocument();
  });

  it('renders no CourseCards when enrollments are empty', async () => {
    (enrollmentsAPI.getByStudent as any).mockResolvedValue([]);
    render(<StudentDashboard />);
    await screen.findByText(/no courses enrolled yet/i);
    expect(screen.queryAllByTestId('course-card')).toHaveLength(0);
  });
});
