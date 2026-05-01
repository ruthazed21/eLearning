/**
 * Tests for Student Progress Page - Task 14.7
 * Validates: Requirements US-3.4 (Progress Tracking)
 * Properties: P3.4.1, P3.4.2, P3.4.3, P3.4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/student/progress',
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

// Mock Radix UI Select (doesn't work in jsdom)
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: (_props: any) => null,
  SelectValue: (_props: any) => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

// Mock APIs
vi.mock('@/lib/api', () => ({
  systemAPI: { getStudentStats: vi.fn() },
  progressAPI: { getByStudent: vi.fn() },
  quizzesAPI: { getRecentAttempts: vi.fn() },
  enrollmentsAPI: { getByStudent: vi.fn() },
}));

import { systemAPI, progressAPI, quizzesAPI, enrollmentsAPI } from '@/lib/api';
import ProgressPage from './page';

const mockStats = {
  enrolledCourses: 3,
  completedCourses: 1,
  avgProgress: '55',
  totalHours: 20,
};

const mockCourseProgress = [
  {
    title: 'Intro to React',
    completed_lessons: 6,
    total_lessons: 10,
    progress_percentage: 60,
    time_spent_minutes: 90,
  },
  {
    title: 'Advanced Python',
    completed_lessons: 2,
    total_lessons: 8,
    progress_percentage: 25,
    time_spent_minutes: 30,
  },
  {
    title: 'UI/UX Design',
    completed_lessons: 0,
    total_lessons: 6,
    progress_percentage: 0,
    time_spent_minutes: 0,
  },
];

const mockQuizAttempts = [
  {
    id: 1,
    quiz_title: 'React Basics Quiz',
    course_title: 'Intro to React',
    score: 85,
    passed: true,
    completed_at: '2024-03-15T10:00:00Z',
  },
  {
    id: 2,
    quiz_title: 'Python Advanced Quiz',
    course_title: 'Advanced Python',
    score: 45,
    passed: false,
    completed_at: '2024-03-20T14:00:00Z',
  },
];

const mockEnrollments = [
  { id: 1, course_id: 101, enrolled_at: '2024-01-01T00:00:00Z' },
  { id: 2, course_id: 102, enrolled_at: '2024-02-01T00:00:00Z' },
];

beforeEach(() => {
  vi.clearAllMocks();
  (systemAPI.getStudentStats as any).mockResolvedValue(mockStats);
  (progressAPI.getByStudent as any).mockResolvedValue(mockCourseProgress);
  (quizzesAPI.getRecentAttempts as any).mockResolvedValue(mockQuizAttempts);
  (enrollmentsAPI.getByStudent as any).mockResolvedValue(mockEnrollments);
});

// ─── 14.1 / 14.2 Data fetching ────────────────────────────────────────────────

describe('Progress Page - Data Fetching (14.1, 14.2)', () => {
  it('fetches enrollments via enrollmentsAPI.getByStudent on mount (14.1)', async () => {
    render(<ProgressPage />);
    await waitFor(() =>
      expect(enrollmentsAPI.getByStudent).toHaveBeenCalledWith(10)
    );
  });

  it('fetches progress via progressAPI.getByStudent on mount (14.2)', async () => {
    render(<ProgressPage />);
    await waitFor(() =>
      expect(progressAPI.getByStudent).toHaveBeenCalledWith(10)
    );
  });

  it('fetches stats via systemAPI.getStudentStats on mount', async () => {
    render(<ProgressPage />);
    await waitFor(() =>
      expect(systemAPI.getStudentStats).toHaveBeenCalledTimes(1)
    );
  });

  it('fetches quiz attempts via quizzesAPI.getRecentAttempts on mount', async () => {
    render(<ProgressPage />);
    await waitFor(() =>
      expect(quizzesAPI.getRecentAttempts).toHaveBeenCalledTimes(1)
    );
  });

  it('fetches all four data sources in parallel', async () => {
    render(<ProgressPage />);
    await waitFor(() => {
      expect(systemAPI.getStudentStats).toHaveBeenCalledTimes(1);
      expect(progressAPI.getByStudent).toHaveBeenCalledTimes(1);
      expect(quizzesAPI.getRecentAttempts).toHaveBeenCalledTimes(1);
      expect(enrollmentsAPI.getByStudent).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── 14.3 Completion statistics ───────────────────────────────────────────────

describe('Progress Page - Completion Statistics (14.3)', () => {
  it('displays enrolled courses count', async () => {
    render(<ProgressPage />);
    expect(await screen.findByText('Courses Enrolled')).toBeInTheDocument();
  });

  it('displays completed courses count', async () => {
    render(<ProgressPage />);
    expect(await screen.findByText('Courses Completed')).toBeInTheDocument();
  });

  it('displays average progress stat card', async () => {
    render(<ProgressPage />);
    expect(await screen.findByText('Average Progress')).toBeInTheDocument();
  });

  it('displays total hours stat card', async () => {
    render(<ProgressPage />);
    expect(await screen.findByText('Total Hours (Est.)')).toBeInTheDocument();
  });

  it('shows lessons completed summary (P3.4.2)', async () => {
    render(<ProgressPage />);
    // 6+2+0 = 8 completed out of 10+8+6 = 24 total
    expect(await screen.findByTestId('total-lessons')).toHaveTextContent('8/24 lessons completed');
  });
});

// ─── 14.4 Progress visualizations ────────────────────────────────────────────

describe('Progress Page - Progress Visualizations (14.4)', () => {
  it('shows Course Progress section heading', async () => {
    render(<ProgressPage />);
    expect(await screen.findByText('Course Progress')).toBeInTheDocument();
  });

  it('renders a progress bar for each course', async () => {
    render(<ProgressPage />);
    await screen.findByText('Course Progress');
    expect(screen.getAllByText('Intro to React').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Advanced Python').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UI/UX Design').length).toBeGreaterThan(0);
  });

  it('shows correct progress percentage for each course', async () => {
    render(<ProgressPage />);
    await screen.findByText('Course Progress');
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows lesson counts per course', async () => {
    render(<ProgressPage />);
    await screen.findByText('Course Progress');
    expect(screen.getByText('6/10 lessons completed')).toBeInTheDocument();
    expect(screen.getByText('2/8 lessons completed')).toBeInTheDocument();
  });
});

// ─── 14.5 Time spent per course ───────────────────────────────────────────────

describe('Progress Page - Time Spent (14.5, P3.4.3)', () => {
  it('shows time spent for courses with time data', async () => {
    render(<ProgressPage />);
    await screen.findByText('Course Progress');
    // Intro to React: 90 minutes = 1h 30m
    expect(screen.getByTestId('time-spent-0')).toHaveTextContent('1h 30m spent');
  });

  it('shows time in minutes for courses under 1 hour', async () => {
    render(<ProgressPage />);
    await screen.findByText('Course Progress');
    // Advanced Python: 30 minutes
    expect(screen.getByTestId('time-spent-1')).toHaveTextContent('30m spent');
  });

  it('does not show time spent for courses with 0 minutes', async () => {
    render(<ProgressPage />);
    await screen.findByText('Course Progress');
    // UI/UX Design: 0 minutes — no time element
    expect(screen.queryByTestId('time-spent-2')).not.toBeInTheDocument();
  });

  it('shows total time spent summary when time data exists', async () => {
    render(<ProgressPage />);
    // 90 + 30 = 120 minutes = 2h 0m
    expect(await screen.findByTestId('total-time')).toHaveTextContent('2h 0m spent');
  });
});

// ─── 14.6 Course filter ───────────────────────────────────────────────────────

describe('Progress Page - Course Filter (14.6)', () => {
  it('renders a course filter dropdown', async () => {
    render(<ProgressPage />);
    await screen.findByText('Course Progress');
    expect(screen.getByRole('combobox', { name: /filter by course/i })).toBeInTheDocument();
  });

  it('shows all courses by default', async () => {
    render(<ProgressPage />);
    await screen.findByText('Course Progress');
    // Use getAllByText since course titles may appear in both the dropdown option and the progress list
    expect(screen.getAllByText('Intro to React').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Advanced Python').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UI/UX Design').length).toBeGreaterThan(0);
  });

  it('filters to show only selected course', async () => {
    render(<ProgressPage />);
    await screen.findByText('Course Progress');

    fireEvent.change(screen.getByRole('combobox', { name: /filter by course/i }), {
      target: { value: 'Intro to React' },
    });

    await waitFor(() => {
      // After filtering, only Intro to React progress row should be visible (not Advanced Python or UI/UX Design h3)
      expect(screen.queryByRole('heading', { name: 'Advanced Python' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'UI/UX Design' })).not.toBeInTheDocument();
      // The h3 for Intro to React should still be present
      expect(screen.getAllByText('Intro to React').length).toBeGreaterThan(0);
    });
  });

  it('updates lesson summary when filter applied', async () => {
    render(<ProgressPage />);
    await screen.findByText('Course Progress');

    fireEvent.change(screen.getByRole('combobox', { name: /filter by course/i }), {
      target: { value: 'Intro to React' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('total-lessons')).toHaveTextContent('6/10 lessons completed');
    });
  });

  it('resets to all courses when "all" selected', async () => {
    render(<ProgressPage />);
    await screen.findByText('Course Progress');

    const select = screen.getByRole('combobox', { name: /filter by course/i });
    fireEvent.change(select, { target: { value: 'Intro to React' } });
    fireEvent.change(select, { target: { value: 'all' } });

    await waitFor(() => {
      // All three course h3 headings should be visible again
      expect(screen.getAllByText('Intro to React').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Advanced Python').length).toBeGreaterThan(0);
      expect(screen.getAllByText('UI/UX Design').length).toBeGreaterThan(0);
    });
  });
});

// ─── Quiz performance section ─────────────────────────────────────────────────

describe('Progress Page - Quiz Performance', () => {
  it('shows Recent Quiz Performance section heading', async () => {
    render(<ProgressPage />);
    expect(await screen.findByText('Recent Quiz Performance')).toBeInTheDocument();
  });

  it('displays quiz titles', async () => {
    render(<ProgressPage />);
    expect(await screen.findByText('React Basics Quiz')).toBeInTheDocument();
    expect(screen.getByText('Python Advanced Quiz')).toBeInTheDocument();
  });

  it('shows passed badge for passed quizzes', async () => {
    render(<ProgressPage />);
    expect(await screen.findByText('Passed')).toBeInTheDocument();
  });

  it('shows failed badge for failed quizzes', async () => {
    render(<ProgressPage />);
    expect(await screen.findByText('Failed')).toBeInTheDocument();
  });

  it('shows quiz scores', async () => {
    render(<ProgressPage />);
    expect(await screen.findByText('85%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('shows empty state when no quiz attempts', async () => {
    (quizzesAPI.getRecentAttempts as any).mockResolvedValue([]);
    render(<ProgressPage />);
    expect(await screen.findByText('No quiz attempts yet.')).toBeInTheDocument();
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('Progress Page - Loading State', () => {
  it('shows loading spinner while fetching data', () => {
    (systemAPI.getStudentStats as any).mockReturnValue(new Promise(() => {}));
    render(<ProgressPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('hides loading spinner after data is fetched', async () => {
    render(<ProgressPage />);
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    );
  });
});

// ─── Error state ──────────────────────────────────────────────────────────────

describe('Progress Page - Error State', () => {
  it('shows error message when API call fails', async () => {
    (systemAPI.getStudentStats as any).mockRejectedValue(new Error('Network error'));
    render(<ProgressPage />);
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('hides loading spinner after error', async () => {
    (progressAPI.getByStudent as any).mockRejectedValue(new Error('fail'));
    render(<ProgressPage />);
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    );
  });
});

// ─── Empty states ─────────────────────────────────────────────────────────────

describe('Progress Page - Empty States', () => {
  it('shows empty state when no course progress data', async () => {
    (progressAPI.getByStudent as any).mockResolvedValue([]);
    render(<ProgressPage />);
    expect(await screen.findByText('No course progress data available.')).toBeInTheDocument();
  });

  it('does not show course filter when no courses', async () => {
    (progressAPI.getByStudent as any).mockResolvedValue([]);
    render(<ProgressPage />);
    await screen.findByText('No course progress data available.');
    expect(screen.queryByRole('combobox', { name: /filter by course/i })).not.toBeInTheDocument();
  });
});
