'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Volume2, Keyboard, CheckCircle, XCircle } from 'lucide-react';

interface QuizOption {
  id: number;
  text: string;
  is_correct?: boolean;
}

interface QuizCardProps {
  question: string;
  options: QuizOption[];
  questionNumber: number;
  totalQuestions: number;
  onSubmit?: (answer: string) => void;
  onPrevious?: () => void;
  selectedAnswer?: string;
}

export function QuizCard({
  question,
  options,
  questionNumber,
  totalQuestions,
  onSubmit,
  onPrevious,
  selectedAnswer: initialAnswer = '',
}: QuizCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>(initialAnswer);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const questionRef = useRef<HTMLDivElement>(null);

  // Update selected answer when question changes
  useEffect(() => {
    setSelectedAnswer(initialAnswer);
    setAnswerFeedback(null);
    setShowFeedback(false);
  }, [initialAnswer, questionNumber]);

  // Focus on question when it changes for screen readers
  useEffect(() => {
    if (questionRef.current) {
      questionRef.current.focus();
    }
  }, [questionNumber]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Number keys 1-4 or A-D to select options
      if (['1', '2', '3', '4'].includes(e.key)) {
        const index = parseInt(e.key) - 1;
        if (index < options.length) {
          setSelectedAnswer(options[index].id.toString());
          setShowFeedback(false);
        }
        return;
      }

      const keyLower = e.key.toLowerCase();
      if (['a', 'b', 'c', 'd'].includes(keyLower)) {
        const index = keyLower.charCodeAt(0) - 'a'.charCodeAt(0);
        if (index < options.length) {
          setSelectedAnswer(options[index].id.toString());
          setShowFeedback(false);
        }
        return;
      }

      // Enter to submit
      if (e.key === 'Enter' && selectedAnswer) {
        e.preventDefault();
        handleSubmitWithFeedback();
        return;
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowRight' && selectedAnswer) {
        e.preventDefault();
        handleSubmitWithFeedback();
        return;
      }

      if (e.key === 'ArrowLeft' && onPrevious && questionNumber > 1) {
        e.preventDefault();
        onPrevious();
        return;
      }

      // R to read question and options aloud
      if (keyLower === 'r') {
        e.preventDefault();
        readAloud();
        return;
      }

      // H to toggle help
      if (keyLower === 'h') {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnswer, options, onSubmit, onPrevious, questionNumber]);

  // Text-to-speech function
  const readAloud = () => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance();
      utterance.text = `Question ${questionNumber} of ${totalQuestions}. ${question}. Options: ${options.map((opt, idx) => `${String.fromCharCode(65 + idx)}, ${opt.text}`).join('. ')}`;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }
  };

  // Audio feedback function for accessibility
  const playAudioFeedback = (isCorrect: boolean) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance();
      utterance.text = isCorrect ? 'Correct answer!' : 'Incorrect answer. You failed this question.';
      utterance.rate = 1.0;
      utterance.pitch = isCorrect ? 1.2 : 0.8;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }
  };

  // Check if the selected answer is correct
  const checkAnswer = (answerId: string): boolean => {
    const selectedOption = options.find(opt => opt.id.toString() === answerId);
    return selectedOption?.is_correct === true;
  };

  // Handle submit with immediate feedback
  const handleSubmitWithFeedback = () => {
    if (!selectedAnswer) return;

    const isCorrect = checkAnswer(selectedAnswer);
    setAnswerFeedback(isCorrect ? 'correct' : 'incorrect');
    setShowFeedback(true);

    // Play audio feedback for accessibility
    playAudioFeedback(isCorrect);

    // Announce result to screen readers
    const announcement = isCorrect 
      ? 'Correct answer selected' 
      : 'Incorrect answer selected. You failed this question.';
    
    // Create a temporary element for screen reader announcement
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'assertive');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = announcement;
    document.body.appendChild(announcer);
    
    // Remove the announcer after a short delay
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);

    // Proceed to next question after a short delay to allow feedback to be heard
    setTimeout(() => {
      if (onSubmit) {
        onSubmit(selectedAnswer);
      }
    }, 2000); // 2 second delay to allow audio feedback to complete
  };

  const handleSubmit = () => {
    if (selectedAnswer) {
      handleSubmitWithFeedback();
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    }
  };

  return (
    <Card className="w-full max-w-3xl border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle
            ref={questionRef}
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            Question {questionNumber} of {totalQuestions}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={readAloud}
              aria-label="Read question aloud"
              title="Read question aloud (R)"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
              aria-label="Toggle keyboard shortcuts help"
              title="Toggle keyboard shortcuts (H)"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Answer Feedback */}
        {showFeedback && answerFeedback && (
          <div className={`rounded-lg p-4 border-2 ${
            answerFeedback === 'correct' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {answerFeedback === 'correct' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${
                answerFeedback === 'correct' ? 'text-green-800' : 'text-red-800'
              }`}>
                {answerFeedback === 'correct' ? 'Correct Answer!' : 'Incorrect Answer - You Failed This Question'}
              </span>
            </div>
          </div>
        )}

        {/* Keyboard Help Panel */}
        {showKeyboardHelp && (
          <div className="rounded-lg bg-blue-50 p-4 space-y-2 border border-blue-200">
            <h3 className="font-semibold text-sm text-blue-900">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
              <div><Badge variant="secondary" className="mr-2">1-4</Badge>Select option</div>
              <div><Badge variant="secondary" className="mr-2">A-D</Badge>Select option</div>
              <div><Badge variant="secondary" className="mr-2">Enter</Badge>Submit answer</div>
              <div><Badge variant="secondary" className="mr-2">→</Badge>Next question</div>
              <div><Badge variant="secondary" className="mr-2">←</Badge>Previous question</div>
              <div><Badge variant="secondary" className="mr-2">R</Badge>Read aloud</div>
              <div><Badge variant="secondary" className="mr-2">H</Badge>Toggle help</div>
            </div>
          </div>
        )}

        {/* Question Text */}
        <div
          className="text-xl font-medium text-gray-900"
          role="heading"
          aria-level={2}
        >
          {question}
        </div>

        {/* Screen reader live region for announcements */}
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {selectedAnswer && `Selected: ${options.find(o => o.id.toString() === selectedAnswer)?.text}`}
        </div>

        {/* Options */}
        <RadioGroup
          value={selectedAnswer}
          onValueChange={(value) => {
            setSelectedAnswer(value);
            setShowFeedback(false);
          }}
          className="space-y-3"
        >
          {options.map((option, index) => {
            const optionId = `q${questionNumber}-option-${index}`;
            const shortcut = String.fromCharCode(65 + index); // A, B, C, D
            const isSelected = selectedAnswer === option.id.toString();

            return (
              <Label
                key={optionId}
                htmlFor={optionId}
                className={`flex items-center space-x-3 rounded-lg p-4 cursor-pointer transition-all ${isSelected
                  ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                  : 'bg-gray-50 border-2 border-transparent hover:border-gray-300 hover:bg-gray-100'
                  }`}
              >
                <RadioGroupItem
                  value={option.id.toString()}
                  id={optionId}
                  aria-label={`Option ${shortcut}: ${option.text}`}
                />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-base text-gray-900">{option.text}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {shortcut} / {index + 1}
                  </Badge>
                </div>
              </Label>
            );
          })}
        </RadioGroup>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={questionNumber === 1}
          aria-label="Previous question"
        >
          Previous
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedAnswer}
          aria-label={questionNumber === totalQuestions ? 'Submit quiz' : 'Next question'}
        >
          {questionNumber === totalQuestions ? 'Submit Quiz' : 'Next Question'}
        </Button>
      </CardFooter>
    </Card>
  );
}
