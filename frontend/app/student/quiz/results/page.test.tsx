import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { useRouter, useSearchParams } from 'next/navigation';
import QuizResultsPage from './page';

// Mock Next.js hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock API
vi.mock('@/lib/api', () => ({
  quizzesAPI: {
    getById: vi.fn().mockResolvedValue({
      id: 1,
      title: 'Test Quiz',
      category: 'Programming',
      passing_score: 70,
    }),
  },
  getStoredUser: vi.fn(() => ({ fullName: 'Test Student' })),
}));

// Mock RouteGuard
vi.mock('@/lib/route-guard', () => ({
  RouteGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock DashboardLayout
vi.mock('@/components/dashboard-layout-new', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock KeyboardShortcutsHelp
vi.mock('@/components/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsHelp: () => <div>Keyboard Shortcuts Help</div>,
}));

describe('Quiz Results Page', () => {
  const mockPush = vi.fn();
  const mockSearchParams = new Map([
    ['score', '85'],
    ['correct', '17'],
    ['total', '20'],
    ['quizId', '1'],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => mockSearchParams.get(key),
    });
  });

  it('renders quiz results page with accessibility features', () => {
    render(<QuizResultsPage />);

    // Check that audio instructions are present
    expect(screen.getByText('Audio Instructions for Screen Readers')).toBeInTheDocument();
    
    // Check that keyboard shortcuts are documented
    expect(screen.getByText(/Press R to read your complete quiz results aloud/)).toBeInTheDocument();
    expect(screen.getByText(/Press S to read detailed statistics/)).toBeInTheDocument();
    expect(screen.getByText(/Press F to read performance feedback/)).toBeInTheDocument();
    expect(screen.getByText(/Press A to read available actions/)).toBeInTheDocument();
  });
});