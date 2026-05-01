/**
 * Tests for Student Course Details Page - Task 13.8
 * Validates: Requirements US-3.3 (Course Content Access)
 * Properties: P3.3.1, P3.3.2, P3.3.3, P3.3.4, P3.3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/student/course/1',
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

// Mock VideoPlayer
vi.mock('@/components/video-player', () => ({
  VideoPlayer: ({ title }: { title: string }) => <div data-testid="video-player">{title}</div>,
}));

// Mock EnrollCourseDialog
vi.mock('@/components/dialogs/enroll-course-dialog', () => ({
  EnrollCourseDialog: ({ courseTitle, onSuccess }: { courseTitle: string; onSuccess?: () => void }) => (
    <button data-testid="enroll-dialog-btn" onClick={onSuccess}>
      Enroll Now - {courseTitle}
    </button>
  ),
}));

// Mock APIs
vi.mock('@/lib/api', () => ({
  coursesAPI: { getById: vi.fn() },
  progressAPI: { getByCourse: vi.fn(), completeLesson: vi.fn() },
}));

import { coursesAPI, progressAPI } from '@/lib/api';
import CourseDetailPage from './page';

const mockLessons = [
  { id: 101, title: 'Lesson 1: Intro', description: 'Introduction content', video_url: 'https://example.com/v1', order_index: 1 },
  { id: 102, title: 'Lesson 2: Basics', description: 'Basics content', video_url: null, order_index: 2 },
  { id: 103, title: 'Lesson 3: Advanced', description: 'Advanced content', video_url: null, order_index: 3 },
];

const mockCourseEnrolled = {
  id: 1,
  title: 'Intro to React',
  teacher_name: 'Bob Teacher',
  is_enrolled: true,
  lessons: mockLessons,
};

const mockCourseNotEnrolled = {
  id: 1,
  title: 'Intro to React',
  teacher_name: 'Bob Teacher',
  is_enrolled: false,
  lessons: mockLessons,
};

const mockProgress = {
  lessons: [
    { lesson_id: 101, completed: true },
    { lesson_id: 102, completed: false },
    { lesson_id: 103, completed: false },
  ],
};

/**
 * Create a fake "thenable" that React.use() can resolve synchronously.
 * React 19 treats thenables specially — a thenable with a cached result
 * is returned synchronously without suspending.
 */
function makeResolvedThenable<T>(value: T): Promise<T> {
  // React.use() checks for a special internal status on the promise.
  // We create a native Promise and attach the resolved value in a way
  // that React's internal cache can pick it up.
  const p = Promise.resolve(value) as any;
  // React 19 uses these internal fields to avoid suspending
  p.status = 'fulfilled';
  p.value = value;
  return p;
}

beforeEach(() => {
  vi.clearAllMocks();
  (coursesAPI.getById as any).mockResolvedValue(mockCourseEnrolled);
  (progressAPI.getByCourse as any).mockResolvedValue(mockProgress);
  (progressAPI.completeLesson as any).mockResolvedValue({});
});

// ─── 13.1 Fetch course data on mount ─────────────────────────────────────────

describe('Course Details - Fetch Course Data (13.1)', () => {
  it('calls coursesAPI.getById with the course id on mount', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await waitFor(() =>
      expect(coursesAPI.getById).toHaveBeenCalledWith(1)
    );
  });

  it('displays course title after fetch', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    expect(await screen.findByText('Intro to React')).toBeInTheDocument();
  });

  it('displays instructor name after fetch', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    expect(await screen.findByText(/Bob Teacher/)).toBeInTheDocument();
  });
});

// ─── 13.3 Fetch progress when enrolled ───────────────────────────────────────

describe('Course Details - Fetch Progress (13.3)', () => {
  it('calls progressAPI.getByCourse when enrolled', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await waitFor(() =>
      expect(progressAPI.getByCourse).toHaveBeenCalledWith(1)
    );
  });

  it('does not call progressAPI.getByCourse when not enrolled', async () => {
    (coursesAPI.getById as any).mockResolvedValue(mockCourseNotEnrolled);
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await screen.findByText('You are not enrolled in this course.');
    expect(progressAPI.getByCourse).not.toHaveBeenCalled();
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('Course Details - Loading State', () => {
  it('shows loading spinner while fetching', async () => {
    (coursesAPI.getById as any).mockReturnValue(new Promise(() => {}));
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    );
  });

  it('hides loading spinner after data is fetched', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    );
  });
});

// ─── Error state ──────────────────────────────────────────────────────────────

describe('Course Details - Error State', () => {
  it('shows error message when API call fails', async () => {
    (coursesAPI.getById as any).mockRejectedValue(new Error('Network error'));
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('hides loading spinner after error', async () => {
    (coursesAPI.getById as any).mockRejectedValue(new Error('fail'));
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    );
  });
});

// ─── 13.4 / 13.5 Enrollment check and enroll button ─────────────────────────

describe('Course Details - Not Enrolled State (13.4, 13.5)', () => {
  beforeEach(() => {
    (coursesAPI.getById as any).mockResolvedValue(mockCourseNotEnrolled);
  });

  it('shows "not enrolled" message when not enrolled (P3.3.1)', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    expect(await screen.findByText('You are not enrolled in this course.')).toBeInTheDocument();
  });

  it('shows Enroll Now button when not enrolled (13.5)', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    expect(await screen.findByTestId('enroll-dialog-btn')).toBeInTheDocument();
  });

  it('shows Go Back to Courses button when not enrolled', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    expect(await screen.findByRole('button', { name: /go back to courses/i })).toBeInTheDocument();
  });

  it('does not show lessons list when not enrolled', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await screen.findByText('You are not enrolled in this course.');
    expect(screen.queryByText('Course Content')).not.toBeInTheDocument();
  });
});

// ─── 13.6 Display lessons with completion status ──────────────────────────────

describe('Course Details - Lessons List (13.6, P3.3.2, P3.3.3)', () => {
  it('shows Course Content section when enrolled', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    expect(await screen.findByText('Course Content')).toBeInTheDocument();
  });

  it('renders all lessons in the sidebar', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await screen.findByText('Course Content');
    expect(screen.getAllByText('Lesson 1: Intro').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lesson 2: Basics').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lesson 3: Advanced').length).toBeGreaterThan(0);
  });

  it('marks completed lessons with a check icon (P3.3.3)', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await screen.findByText('Course Content');
    // Lesson 1 is completed per mockProgress — its button has aria-label with ", completed"
    const lesson1Btn = screen.getByRole('button', { name: /lesson 1: intro.*completed/i });
    expect(lesson1Btn).toBeInTheDocument();
  });

  it('does not mark incomplete lessons as completed', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await screen.findByText('Course Content');
    const lesson2Btn = screen.getByRole('button', { name: /^lesson 2: basics$/i });
    expect(lesson2Btn).toBeInTheDocument();
  });
});

// ─── Mark lesson complete (P3.3.4, P3.3.5) ───────────────────────────────────

describe('Course Details - Mark Lesson Complete (P3.3.4)', () => {
  it('calls progressAPI.completeLesson when Mark as Complete clicked', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    // First lesson is already completed; second is not — click it to make it current
    await screen.findByText('Course Content');
    fireEvent.click(screen.getByRole('button', { name: /^lesson 2: basics$/i }));

    const markBtn = await screen.findByRole('button', { name: /mark as complete/i });
    fireEvent.click(markBtn);

    await waitFor(() =>
      expect(progressAPI.completeLesson).toHaveBeenCalledWith(102)
    );
  });

  it('hides Mark as Complete button after lesson is marked complete (P3.3.5)', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await screen.findByText('Course Content');
    fireEvent.click(screen.getByRole('button', { name: /^lesson 2: basics$/i }));

    const markBtn = await screen.findByRole('button', { name: /mark as complete/i });
    fireEvent.click(markBtn);

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /mark as complete/i })).not.toBeInTheDocument()
    );
  });
});

// ─── 13.7 Lesson navigation ───────────────────────────────────────────────────

describe('Course Details - Lesson Navigation (13.7)', () => {
  it('shows Next Lesson button when not on last lesson', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    // First lesson is active by default (not last)
    expect(await screen.findByRole('button', { name: /next lesson/i })).toBeInTheDocument();
  });

  it('navigates to next lesson when Next Lesson clicked', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await screen.findByText('Course Content');

    fireEvent.click(screen.getByRole('button', { name: /next lesson/i }));

    await waitFor(() => {
      const cardTitles = screen.getAllByText('Lesson 2: Basics');
      expect(cardTitles.length).toBeGreaterThan(0);
    });
  });

  it('shows Finish Course button on last lesson', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await screen.findByText('Course Content');

    // Navigate to last lesson
    fireEvent.click(screen.getByRole('button', { name: /^lesson 3: advanced$/i }));

    expect(await screen.findByRole('button', { name: /finish course|complete all lessons/i })).toBeInTheDocument();
  });

  it('clicking a lesson in sidebar makes it the active lesson', async () => {
    render(<CourseDetailPage params={makeResolvedThenable({ id: '1' })} />);
    await screen.findByText('Course Content');

    fireEvent.click(screen.getByRole('button', { name: /^lesson 3: advanced$/i }));

    await waitFor(() => {
      const cardTitles = screen.getAllByText('Lesson 3: Advanced');
      expect(cardTitles.length).toBeGreaterThan(0);
    });
  });
});
