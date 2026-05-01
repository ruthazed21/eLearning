/**
 * Tests for Student Quiz Page - Task 15.8
 * Validates: Requirements US-3.5 (Quiz Taking)
 * Properties: P3.5.1, P3.5.2, P3.5.3, P3.5.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

// ─── next/navigation mock ─────────────────────────────────────────────────────

const mockPush = vi.fn();
let mockSearchParams: Record<string, string | null> = {};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams[key] ?? null,
  }),
}));

// ─── Auth context mock ────────────────────────────────────────────────────────

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 10, role: 'student', full_name: 'Alice Student' },
    loading: false,
  }),
}));

// ─── Layout / guard mocks ─────────────────────────────────────────────────────

vi.mock('@/components/dashboard-layout-new', () => ({
  DashboardLayout: ({ children, userName }: { children: React.ReactNode; userName: string }) => (
    <div data-testid="layout" data-username={userName}>{children}</div>
  ),
}));

vi.mock('@/lib/route-guard', () => ({
  RouteGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ─── QuizCard mock ────────────────────────────────────────────────────────────

vi.mock('@/components/quiz-card', () => ({
  QuizCard: ({
    question,
    questionNumber,
    totalQuestions,
    onSubmit,
    onPrevious,
    selectedAnswer,
  }: any) => (
    <div data-testid="quiz-card">
      <span data-testid="question-text">{question}</span>
      <span data-testid="question-number">{questionNumber}</span>
      <span data-testid="total-questions">{totalQuestions}</span>
      {selectedAnswer && <span data-testid="selected-answer">{selectedAnswer}</span>}
      <button data-testid="submit-answer" onClick={() => onSubmit('42')}>
        {questionNumber === totalQuestions ? 'Submit Quiz' : 'Next Question'}
      </button>
      {questionNumber > 1 && (
        <button data-testid="prev-question" onClick={onPrevious}>
          Previous
        </button>
      )}
    </div>
  ),
}));

// ─── API mock ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  quizzesAPI: {
    getAvailable: vi.fn(),
    getByCourse: vi.fn(),
    getById: vi.fn(),
    submitAttempt: vi.fn(),
    getAttempts: vi.fn(),
  },
}));

import { quizzesAPI } from '@/lib/api';
import QuizPage from './page';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockQuiz = {
  id: 1,
  title: 'React Basics Quiz',
  description: 'Test your React knowledge',
  category: 'Programming',
  time_limit_minutes: 30,
  passing_score: 70,
  questions: [
    {
      id: 101,
      question_text: 'What is JSX?',
      options: [
        { id: 1, option_text: 'JavaScript XML' },
        { id: 2, option_text: 'Java Syntax Extension' },
        { id: 3, option_text: 'JSON XML' },
        { id: 4, option_text: 'None of the above' },
      ],
    },
    {
      id: 102,
      question_text: 'What is a React hook?',
      options: [
        { id: 5, option_text: 'A lifecycle method' },
        { id: 6, option_text: 'A function that lets you use state' },
        { id: 7, option_text: 'A class component' },
        { id: 8, option_text: 'A CSS utility' },
      ],
    },
  ],
};

const mockAvailableQuizzes = [
  {
    id: 1,
    title: 'React Basics Quiz',
    description: 'Test your React knowledge',
    course_title: 'Intro to React',
    question_count: 2,
    time_limit_minutes: 30,
    passing_score: 70,
  },
  {
    id: 2,
    title: 'Python Quiz',
    description: 'Test your Python knowledge',
    course_title: 'Advanced Python',
    question_count: 5,
    time_limit_minutes: null,
    passing_score: 60,
  },
];

const mockAttempts = [
  {
    id: 1,
    score: 85,
    passed: true,
    completed_at: '2024-03-15T10:00:00Z',
  },
  {
    id: 2,
    score: 55,
    passed: false,
    completed_at: '2024-03-10T09:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams = {};
  mockPush.mockClear();
  (quizzesAPI.getAttempts as any).mockResolvedValue([]);
});

// ─── 15.1 Available quizzes (no params) ──────────────────────────────────────

describe('Quiz Page - Available Quizzes (15.1)', () => {
  it('calls quizzesAPI.getAvailable when no params provided', async () => {
    (quizzesAPI.getAvailable as any).mockResolvedValue(mockAvailableQuizzes);
    render(<QuizPage />);
    await waitFor(() =>
      expect(quizzesAPI.getAvailable).toHaveBeenCalledTimes(1)
    );
  });

  it('displays available quiz titles when no params', async () => {
    (quizzesAPI.getAvailable as any).mockResolvedValue(mockAvailableQuizzes);
    render(<QuizPage />);
    expect(await screen.findByText('React Basics Quiz')).toBeInTheDocument();
    expect(screen.getByText('Python Quiz')).toBeInTheDocument();
  });

  it('shows "Available Quizzes" heading when no params', async () => {
    (quizzesAPI.getAvailable as any).mockResolvedValue(mockAvailableQuizzes);
    render(<QuizPage />);
    expect(await screen.findByText('Available Quizzes')).toBeInTheDocument();
  });

  it('navigates to quiz when a quiz card is clicked', async () => {
    (quizzesAPI.getAvailable as any).mockResolvedValue(mockAvailableQuizzes);
    render(<QuizPage />);
    const quizTitle = await screen.findByText('React Basics Quiz');
    fireEvent.click(quizTitle.closest('[class*="cursor-pointer"]')!);
    expect(mockPush).toHaveBeenCalledWith('/student/quiz?id=1');
  });
});

// ─── 15.2 Load quiz by ID ─────────────────────────────────────────────────────

describe('Quiz Page - Load Quiz by ID (15.2)', () => {
  it('calls quizzesAPI.getById when quizId param is provided', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    render(<QuizPage />);
    await waitFor(() =>
      expect(quizzesAPI.getById).toHaveBeenCalledWith(1)
    );
  });

  it('calls quizzesAPI.getByCourse then getById when courseId param is provided', async () => {
    mockSearchParams = { courseId: '5' };
    (quizzesAPI.getByCourse as any).mockResolvedValue([{ id: 1 }]);
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    render(<QuizPage />);
    await waitFor(() => {
      expect(quizzesAPI.getByCourse).toHaveBeenCalledWith(5);
      expect(quizzesAPI.getById).toHaveBeenCalledWith(1);
    });
  });

  it('displays quiz title after loading by ID', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    render(<QuizPage />);
    expect(await screen.findByText('React Basics Quiz')).toBeInTheDocument();
  });

  it('shows error when quiz not found (getByCourse returns empty)', async () => {
    mockSearchParams = { courseId: '5' };
    (quizzesAPI.getByCourse as any).mockResolvedValue([]);
    render(<QuizPage />);
    expect(await screen.findByText(/quiz not found/i)).toBeInTheDocument();
  });
});

// ─── 15.3 Display quiz questions ─────────────────────────────────────────────

describe('Quiz Page - Display Questions (15.3)', () => {
  it('renders QuizCard with first question', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    render(<QuizPage />);
    expect(await screen.findByTestId('quiz-card')).toBeInTheDocument();
    expect(screen.getByTestId('question-text')).toHaveTextContent('What is JSX?');
  });

  it('shows question number and total', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    render(<QuizPage />);
    await screen.findByTestId('quiz-card');
    expect(screen.getByTestId('question-number')).toHaveTextContent('1');
    expect(screen.getByTestId('total-questions')).toHaveTextContent('2');
  });

  it('shows quiz time limit and passing score', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    render(<QuizPage />);
    expect(await screen.findByText('30:00')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
  });
});

// ─── 15.4 Answer selection ────────────────────────────────────────────────────

describe('Quiz Page - Answer Selection (15.4)', () => {
  it('advances to next question after submitting an answer', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    render(<QuizPage />);
    await screen.findByTestId('quiz-card');

    fireEvent.click(screen.getByTestId('submit-answer'));

    await waitFor(() =>
      expect(screen.getByTestId('question-number')).toHaveTextContent('2')
    );
  });

  it('shows previous question button on second question', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    render(<QuizPage />);
    await screen.findByTestId('quiz-card');

    fireEvent.click(screen.getByTestId('submit-answer'));

    await waitFor(() =>
      expect(screen.getByTestId('prev-question')).toBeInTheDocument()
    );
  });

  it('goes back to previous question when Previous is clicked', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    render(<QuizPage />);
    await screen.findByTestId('quiz-card');

    // Go to question 2
    fireEvent.click(screen.getByTestId('submit-answer'));
    await waitFor(() =>
      expect(screen.getByTestId('question-number')).toHaveTextContent('2')
    );

    // Go back to question 1
    fireEvent.click(screen.getByTestId('prev-question'));
    await waitFor(() =>
      expect(screen.getByTestId('question-number')).toHaveTextContent('1')
    );
  });
});

// ─── 15.5 Submit quiz ─────────────────────────────────────────────────────────

describe('Quiz Page - Submit Quiz (15.5)', () => {
  it('calls quizzesAPI.submitAttempt on last question submit', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    (quizzesAPI.submitAttempt as any).mockResolvedValue({
      score: 85,
      earnedPoints: 1,
      totalPoints: 2,
    });
    render(<QuizPage />);
    await screen.findByTestId('quiz-card');

    // Answer question 1
    fireEvent.click(screen.getByTestId('submit-answer'));
    await waitFor(() =>
      expect(screen.getByTestId('question-number')).toHaveTextContent('2')
    );

    // Answer question 2 (last)
    fireEvent.click(screen.getByTestId('submit-answer'));

    await waitFor(() =>
      expect(quizzesAPI.submitAttempt).toHaveBeenCalledWith(1, expect.any(Object))
    );
  });

  it('redirects to results page after successful submission (15.6)', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    (quizzesAPI.submitAttempt as any).mockResolvedValue({
      score: 85,
      earnedPoints: 1,
      totalPoints: 2,
    });
    render(<QuizPage />);
    await screen.findByTestId('quiz-card');

    fireEvent.click(screen.getByTestId('submit-answer'));
    await waitFor(() =>
      expect(screen.getByTestId('question-number')).toHaveTextContent('2')
    );
    fireEvent.click(screen.getByTestId('submit-answer'));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/student/quiz/results')
      )
    );
  });

  it('shows error when submit fails', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    (quizzesAPI.submitAttempt as any).mockRejectedValue(new Error('Submission failed'));
    render(<QuizPage />);
    await screen.findByTestId('quiz-card');

    fireEvent.click(screen.getByTestId('submit-answer'));
    await waitFor(() =>
      expect(screen.getByTestId('question-number')).toHaveTextContent('2')
    );
    fireEvent.click(screen.getByTestId('submit-answer'));

    expect(await screen.findByText(/failed to submit/i)).toBeInTheDocument();
  });
});

// ─── 15.7 Previous attempts ───────────────────────────────────────────────────

describe('Quiz Page - Previous Attempts (15.7)', () => {
  it('calls quizzesAPI.getAttempts after loading quiz', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    (quizzesAPI.getAttempts as any).mockResolvedValue(mockAttempts);
    render(<QuizPage />);
    await waitFor(() =>
      expect(quizzesAPI.getAttempts).toHaveBeenCalledWith(1)
    );
  });

  it('displays Previous Attempts section when attempts exist', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    (quizzesAPI.getAttempts as any).mockResolvedValue(mockAttempts);
    render(<QuizPage />);
    expect(await screen.findByTestId('previous-attempts')).toBeInTheDocument();
    expect(screen.getByText('Previous Attempts')).toBeInTheDocument();
  });

  it('shows each attempt with score and pass/fail status', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    (quizzesAPI.getAttempts as any).mockResolvedValue(mockAttempts);
    render(<QuizPage />);
    await screen.findByTestId('previous-attempts');

    const items = screen.getAllByTestId('attempt-item');
    expect(items).toHaveLength(2);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('does not show Previous Attempts section when no attempts', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    (quizzesAPI.getAttempts as any).mockResolvedValue([]);
    render(<QuizPage />);
    await screen.findByTestId('quiz-card');
    expect(screen.queryByTestId('previous-attempts')).not.toBeInTheDocument();
  });

  it('still loads quiz even if getAttempts fails', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    (quizzesAPI.getAttempts as any).mockRejectedValue(new Error('Attempts unavailable'));
    render(<QuizPage />);
    expect(await screen.findByTestId('quiz-card')).toBeInTheDocument();
    expect(screen.queryByTestId('previous-attempts')).not.toBeInTheDocument();
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('Quiz Page - Loading State', () => {
  it('shows loading spinner while fetching quiz', () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockReturnValue(new Promise(() => {}));
    render(<QuizPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('hides loading spinner after data is fetched', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockResolvedValue(mockQuiz);
    render(<QuizPage />);
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    );
  });
});

// ─── Error state ──────────────────────────────────────────────────────────────

describe('Quiz Page - Error State', () => {
  it('shows error message when API call fails', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockRejectedValue(new Error('Network error'));
    render(<QuizPage />);
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('hides loading spinner after error', async () => {
    mockSearchParams = { id: '1' };
    (quizzesAPI.getById as any).mockRejectedValue(new Error('fail'));
    render(<QuizPage />);
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    );
  });
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('Quiz Page - Empty State (no quizzes available)', () => {
  it('shows empty state when no quizzes available', async () => {
    (quizzesAPI.getAvailable as any).mockResolvedValue([]);
    render(<QuizPage />);
    expect(await screen.findByText('No Quizzes Available')).toBeInTheDocument();
  });

  it('shows Browse Courses button in empty state', async () => {
    (quizzesAPI.getAvailable as any).mockResolvedValue([]);
    render(<QuizPage />);
    expect(await screen.findByRole('button', { name: /browse courses/i })).toBeInTheDocument();
  });

  it('navigates to courses page when Browse Courses clicked', async () => {
    (quizzesAPI.getAvailable as any).mockResolvedValue([]);
    render(<QuizPage />);
    const btn = await screen.findByRole('button', { name: /browse courses/i });
    fireEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith('/student/courses');
  });
});

// ─── Auth context usage ───────────────────────────────────────────────────────

describe('Quiz Page - Auth Context (useAuth)', () => {
  it('passes user full_name to DashboardLayout', async () => {
    (quizzesAPI.getAvailable as any).mockResolvedValue([]);
    render(<QuizPage />);
    await screen.findByText('No Quizzes Available');
    const layout = screen.getByTestId('layout');
    expect(layout).toHaveAttribute('data-username', 'Alice Student');
  });
});
