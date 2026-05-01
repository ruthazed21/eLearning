import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QuizCard } from './quiz-card';

// Mock SpeechSynthesis API
const mockSpeak = vi.fn();
const mockCancel = vi.fn();

// Create a proper mock for SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  
  constructor(text?: string) {
    if (text) this.text = text;
  }
}

// Setup global mocks before tests
beforeAll(() => {
  Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    value: {
      speak: mockSpeak,
      cancel: mockCancel,
    },
  });

  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    writable: true,
    value: MockSpeechSynthesisUtterance,
  });
});

describe('QuizCard Accessibility Features', () => {
  const mockOptions = [
    { id: 1, text: 'Option A', is_correct: true },
    { id: 2, text: 'Option B', is_correct: false },
    { id: 3, text: 'Option C', is_correct: false },
    { id: 4, text: 'Option D', is_correct: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides audio feedback for correct answers', async () => {
    const mockOnSubmit = vi.fn();
    
    render(
      <QuizCard
        question="What is 2 + 2?"
        options={mockOptions}
        questionNumber={1}
        totalQuestions={5}
        onSubmit={mockOnSubmit}
      />
    );

    // Select the correct answer (Option A)
    const correctOption = screen.getByLabelText(/Option A: Option A/);
    fireEvent.click(correctOption);

    // Click Next Question button
    const nextButton = screen.getByText('Next Question');
    fireEvent.click(nextButton);

    // Check that speech synthesis was called with correct message
    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalled();
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.text).toBe('Correct answer!');
      expect(utterance.pitch).toBe(1.2); // Higher pitch for correct answers
    });

    // Check that visual feedback is shown
    expect(screen.getByText('Correct Answer!')).toBeInTheDocument();
  });

  it('provides audio feedback for incorrect answers', async () => {
    const mockOnSubmit = vi.fn();
    
    render(
      <QuizCard
        question="What is 2 + 2?"
        options={mockOptions}
        questionNumber={1}
        totalQuestions={5}
        onSubmit={mockOnSubmit}
      />
    );

    // Select an incorrect answer (Option B)
    const incorrectOption = screen.getByLabelText(/Option B: Option B/);
    fireEvent.click(incorrectOption);

    // Click Next Question button
    const nextButton = screen.getByText('Next Question');
    fireEvent.click(nextButton);

    // Check that speech synthesis was called with failure message
    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalled();
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.text).toBe('Incorrect answer. You failed this question.');
      expect(utterance.pitch).toBe(0.8); // Lower pitch for incorrect answers
    });

    // Check that visual feedback is shown
    expect(screen.getByText('Incorrect Answer - You Failed This Question')).toBeInTheDocument();
  });

  it('provides audio feedback when using keyboard shortcuts', async () => {
    const mockOnSubmit = vi.fn();
    
    render(
      <QuizCard
        question="What is 2 + 2?"
        options={mockOptions}
        questionNumber={1}
        totalQuestions={5}
        onSubmit={mockOnSubmit}
      />
    );

    // Select incorrect answer using keyboard shortcut (2 = Option B)
    fireEvent.keyDown(window, { key: '2' });
    
    // Submit using Enter key
    fireEvent.keyDown(window, { key: 'Enter' });

    // Check that audio feedback is provided
    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalled();
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.text).toBe('Incorrect answer. You failed this question.');
    });
  });

  it('provides audio feedback when using arrow key navigation', async () => {
    const mockOnSubmit = vi.fn();
    
    render(
      <QuizCard
        question="What is 2 + 2?"
        options={mockOptions}
        questionNumber={1}
        totalQuestions={5}
        onSubmit={mockOnSubmit}
      />
    );

    // Select correct answer using keyboard shortcut (1 = Option A)
    fireEvent.keyDown(window, { key: '1' });
    
    // Submit using right arrow key
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    // Check that audio feedback is provided
    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalled();
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.text).toBe('Correct answer!');
    });
  });

  it('reads question aloud when R key is pressed', () => {
    render(
      <QuizCard
        question="What is 2 + 2?"
        options={mockOptions}
        questionNumber={1}
        totalQuestions={5}
      />
    );

    // Press R key to read aloud
    fireEvent.keyDown(window, { key: 'r' });

    expect(mockSpeak).toHaveBeenCalled();
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toContain('Question 1 of 5. What is 2 + 2?');
    expect(utterance.text).toContain('Options: A, Option A. B, Option B');
  });

  it('announces answer selection to screen readers', async () => {
    render(
      <QuizCard
        question="What is 2 + 2?"
        options={mockOptions}
        questionNumber={1}
        totalQuestions={5}
      />
    );

    // Select an option
    const option = screen.getByLabelText(/Option A: Option A/);
    fireEvent.click(option);

    // Check that screen reader announcement is present
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('Selected: Option A');
  });

  it('delays submission to allow audio feedback to complete', async () => {
    vi.useFakeTimers();
    const mockOnSubmit = vi.fn();
    
    render(
      <QuizCard
        question="What is 2 + 2?"
        options={mockOptions}
        questionNumber={1}
        totalQuestions={5}
        onSubmit={mockOnSubmit}
      />
    );

    // Select an answer and submit
    const option = screen.getByLabelText(/Option A: Option A/);
    fireEvent.click(option);
    
    const nextButton = screen.getByText('Next Question');
    fireEvent.click(nextButton);

    // onSubmit should not be called immediately
    expect(mockOnSubmit).not.toHaveBeenCalled();

    // Fast-forward time by 2 seconds
    vi.advanceTimersByTime(2000);

    // Now onSubmit should be called
    expect(mockOnSubmit).toHaveBeenCalledWith('1');

    vi.useRealTimers();
  });
});