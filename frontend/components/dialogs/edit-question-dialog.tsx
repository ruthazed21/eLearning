'use client';

import { useState, useEffect } from 'react';
import { quizzesAPI } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, X } from 'lucide-react';

interface Option {
  id?: number;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  points: number;
  order_index: number;
  options?: Option[];
}

interface EditQuestionDialogProps {
  question: Question | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (question: Question) => void;
}

export function EditQuestionDialog({ question, open, onOpenChange, onSave }: EditQuestionDialogProps) {
  const [questionText, setQuestionText] = useState('');
  const [points, setPoints] = useState('1');
  const [options, setOptions] = useState<Option[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (question) {
      setQuestionText(question.question_text);
      setPoints(question.points?.toString() || '1');
      
      if (question.options && question.options.length > 0) {
        setOptions(question.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })));
      } else if (question.question_type === 'true_false') {
        setOptions([
          { text: 'True', isCorrect: false },
          { text: 'False', isCorrect: false },
        ]);
      } else if (question.question_type === 'multiple_choice') {
        setOptions([
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ]);
      } else {
        setOptions([]);
      }
      
      setError('');
    }
  }, [question]);

  const addOption = () => {
    setOptions([...options, { text: '', isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const validateForm = () => {
    if (!questionText.trim()) {
      setError('Question text is required');
      return false;
    }

    if (question && (question.question_type === 'multiple_choice' || question.question_type === 'true_false')) {
      const hasCorrectAnswer = options.some(opt => opt.isCorrect);
      if (!hasCorrectAnswer) {
        setError('At least one option must be marked as correct');
        return false;
      }

      const hasEmptyOptions = options.some(opt => !opt.text.trim());
      if (hasEmptyOptions) {
        setError('All options must have text');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;

    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const questionData = {
        questionText,
        points: parseInt(points) || 1,
        options: question.question_type === 'short_answer' ? [] : options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
      };

      const data = await quizzesAPI.updateQuestion(question.id, questionData);
      
      // Transform the response to match our interface
      const updatedQuestion: Question = {
        id: data.id,
        question_text: data.question_text,
        question_type: data.question_type,
        points: data.points,
        order_index: data.order_index,
        options: data.options || [],
      };

      onSave(updatedQuestion);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to update question:', err);
      setError(err.message || 'Failed to update question');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!question) return null;

  const questionTypeLabel = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True/False',
    short_answer: 'Short Answer',
  }[question.question_type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Update the question details below. Question type: {questionTypeLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="edit-question-text">Question Text *</Label>
              <Textarea
                id="edit-question-text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter your question here..."
                rows={3}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-points">Points *</Label>
              <Input
                id="edit-points"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                min="1"
                className="w-32"
                required
              />
            </div>

            {/* Options for Multiple Choice and True/False */}
            {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Answer Options *</Label>
                  {question.question_type === 'multiple_choice' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Option
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <Checkbox
                        checked={option.isCorrect}
                        onCheckedChange={(checked) => updateOption(index, 'isCorrect', !!checked)}
                      />
                      <Input
                        value={option.text}
                        onChange={(e) => updateOption(index, 'text', e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1"
                        disabled={question.question_type === 'true_false'}
                      />
                      {question.question_type === 'multiple_choice' && options.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Check the box next to the correct answer(s)
                </p>
              </div>
            )}

            {/* Instructions for Short Answer */}
            {question.question_type === 'short_answer' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-700">
                  Short answer questions will be manually graded. Students can type their response in a text field.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}