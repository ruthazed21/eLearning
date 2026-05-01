import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentAccessibilityPage from './page';

// Mock dependencies
vi.mock('@/lib/route-guard', () => ({
  RouteGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/dashboard-layout-new', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 1, full_name: 'Test Student', role: 'student' },
  }),
}));

vi.mock('@/hooks/use-keyboard-shortcuts', () => ({
  useCommonShortcuts: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  feedbackAPI: {
    getByUser: vi.fn().mockResolvedValue([
      {
        id: 1,
        category: 'accessibility',
        subject: 'Missing Captions - Course 1: Lesson 1',
        message: 'Video has no captions',
        priority: 'high',
        status: 'open',
        created_at: '2026-03-15T10:00:00Z',
        updated_at: '2026-03-15T10:00:00Z',
      },
    ]),
    create: vi.fn().mockResolvedValue({ id: 2 }),
  },
  coursesAPI: {
    getAll: vi.fn().mockResolvedValue([
      { id: 1, title: 'Test Course 1' },
      { id: 2, title: 'Test Course 2' },
    ]),
  },
  lessonsAPI: {
    getByCourse: vi.fn().mockResolvedValue([
      { id: 1, title: 'Test Lesson 1', course_id: 1 },
      { id: 2, title: 'Test Lesson 2', course_id: 1 },
    ]),
  },
}));

describe('StudentAccessibilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title and description', async () => {
    render(<StudentAccessibilityPage />);

    await waitFor(() => {
      expect(screen.getByText('Accessibility Support')).toBeInTheDocument();
      expect(screen.getByText('Report accessibility issues with course materials')).toBeInTheDocument();
    });
  });

  it('displays the Report Issue button', async () => {
    render(<StudentAccessibilityPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /report issue/i })).toBeInTheDocument();
    });
  });

  it('displays statistics cards', async () => {
    render(<StudentAccessibilityPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Reports')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
    });
  });

  it('displays accessibility reports table', async () => {
    render(<StudentAccessibilityPage />);

    await waitFor(() => {
      expect(screen.getByText('My Accessibility Reports (1)')).toBeInTheDocument();
      expect(screen.getByText('Missing Captions - Course 1: Lesson 1')).toBeInTheDocument();
    });
  });

  it('displays common accessibility issues info', async () => {
    render(<StudentAccessibilityPage />);

    await waitFor(() => {
      expect(screen.getByText('Common Accessibility Issues to Report')).toBeInTheDocument();
      expect(screen.getByText('Missing Captions or Transcripts')).toBeInTheDocument();
      expect(screen.getByText('Poor Audio Quality')).toBeInTheDocument();
    });
  });

  it('shows empty state when no reports exist', async () => {
    const { feedbackAPI } = await import('@/lib/api');
    vi.mocked(feedbackAPI.getByUser).mockResolvedValueOnce([]);

    render(<StudentAccessibilityPage />);

    await waitFor(() => {
      expect(screen.getByText('No accessibility reports yet.')).toBeInTheDocument();
    });
  });
});
