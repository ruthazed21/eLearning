import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AddQuizDialog } from './add-quiz-dialog';
import { EditQuizDialog } from './edit-quiz-dialog';
import { AddQuestionDialog } from './add-question-dialog';
import { quizzesAPI } from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
  quizzesAPI: {
    create: vi.fn(),
    update: vi.fn(),
    addQuestion: vi.fn(),
  },
}));

describe('Quiz Dialogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AddQuizDialog', () => {
    it('renders correctly when open', () => {
      render(
        <AddQuizDialog
          courseId={1}
          open={true}
          onOpenChange={() => {}}
          onAdd={() => {}}
        />
      );

      expect(screen.getByText('Create New Quiz')).toBeInTheDocument();
      expect(screen.getByLabelText(/quiz title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/passing score/i)).toBeInTheDocument();
    });

    it('submits quiz creation with correct data', async () => {
      const mockOnAdd = vi.fn();
      const mockQuiz = {
        id: 1,
        title: 'Test Quiz',
        description: 'Test Description',
        passing_score: 70,
        time_limit_minutes: null,
      };

      (quizzesAPI.create as any).mockResolvedValue(mockQuiz);

      render(
        <AddQuizDialog
          courseId={1}
          open={true}
          onOpenChange={() => {}}
          onAdd={mockOnAdd}
        />
      );

      // Fill in the form
      fireEvent.change(screen.getByLabelText(/quiz title/i), {
        target: { value: 'Test Quiz' },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Test Description' },
      });

      // Submit the form
      fireEvent.click(screen.getByText('Create Quiz'));

      await waitFor(() => {
        expect(quizzesAPI.create).toHaveBeenCalledWith({
          courseId: 1,
          title: 'Test Quiz',
          description: 'Test Description',
          passingScore: 70,
          timeLimitMinutes: null,
        });
        expect(mockOnAdd).toHaveBeenCalledWith(mockQuiz);
      });
    });
  });

  describe('EditQuizDialog', () => {
    const mockQuiz = {
      id: 1,
      title: 'Existing Quiz',
      description: 'Existing Description',
      passing_score: 80,
      time_limit_minutes: 30,
    };

    it('renders with existing quiz data', () => {
      render(
        <EditQuizDialog
          quiz={mockQuiz}
          open={true}
          onOpenChange={() => {}}
          onSave={() => {}}
        />
      );

      expect(screen.getByDisplayValue('Existing Quiz')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('80')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    });
  });

  describe('AddQuestionDialog', () => {
    it('renders multiple choice question form', () => {
      render(
        <AddQuestionDialog
          quizId={1}
          open={true}
          onOpenChange={() => {}}
          onAdd={() => {}}
          nextOrder={1}
        />
      );

      expect(screen.getByText('Add New Question')).toBeInTheDocument();
      expect(screen.getByLabelText(/question text/i)).toBeInTheDocument();
      expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
      expect(screen.getAllByText(/option/i)).toHaveLength(2); // Default 2 options
    });

    it('allows adding more options for multiple choice', () => {
      render(
        <AddQuestionDialog
          quizId={1}
          open={true}
          onOpenChange={() => {}}
          onAdd={() => {}}
          nextOrder={1}
        />
      );

      const addOptionButton = screen.getByText('Add Option');
      fireEvent.click(addOptionButton);

      expect(screen.getAllByPlaceholderText(/option/i)).toHaveLength(3);
    });

    it('switches to true/false options when type changes', () => {
      render(
        <AddQuestionDialog
          quizId={1}
          open={true}
          onOpenChange={() => {}}
          onAdd={() => {}}
          nextOrder={1}
        />
      );

      // Change to True/False
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
      fireEvent.click(screen.getByText('True/False'));

      expect(screen.getByDisplayValue('True')).toBeInTheDocument();
      expect(screen.getByDisplayValue('False')).toBeInTheDocument();
    });
  });
});