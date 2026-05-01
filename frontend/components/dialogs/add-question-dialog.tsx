'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, X } from 'lucide-react';

interface AddQuestionDialogProps {
  quizId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (question: any) => void;
  nextOrder: number;
}

interface Option {
  text: string;
  isCorrect: boolean;
}

export function AddQuestionDialog({ quizId, open, onOpenChange, onAdd, nextOrder }: AddQuestionDialogProps) {
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'short_answer'>('multiple_choice');
  const [points, setPoints] = useState('1');
  const [orderIndex, setOrderIndex] = useState(nextOrder);
  const [options, setOptions] = useState<Option[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setQuestionText('');
    setQuestionType('multiple_choice');
    setPoints('1');
    setOrderIndex(nextOrder + 1);
    setOptions([
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
    setError('');
  };

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

  const handleTypeChange = (type: 'multiple_choice' | 'true_false' | 'short_answer') => {
    setQuestionType(type);
    if (type === 'true_false') {
      setOptions([
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: false },
      ]);
    } else if (type === 'short_answer') {
      setOptions([]);
    } else {
      setOptions([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]);
    }
  };

  const validateForm = () => {
    if (!questionText.trim()) {
      setError('Question text is required');
      return false;
    }

    if (questionType === 'multiple_choice' || questionType === 'true_false') {
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
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const questionData = {
        questionText,
        questionType,
        points: parseInt(points) || 1,
        orderIndex,
        options: questionType === 'short_answer' ? [] : options,
      };

      const data = await quizzesAPI.addQuestion(quizId, questionData);
      onAdd(data);
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to add question:', err);
      setError(err.message || 'Failed to add question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetForm(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>
              Add a new question to this quiz. Choose the question type and configure the options.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="question-text">Question Text *</Label>
              <Textarea
                id="question-text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter your question here..."
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="question-type">Question Type *</Label>
                <Select value={questionType} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="points">Points *</Label>
                <Input
                  id="points"
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  min="1"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order">Order *</Label>
                <Input
                  id="order"
                  type="number"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(parseInt(e.target.value))}
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Options for Multiple Choice and True/False */}
            {(questionType === 'multiple_choice' || questionType === 'true_false') && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Answer Options *</Label>
                  {questionType === 'multiple_choice' && (
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
                        disabled={questionType === 'true_false'}
                      />
                      {questionType === 'multiple_choice' && options.length > 2 && (
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
            {questionType === 'short_answer' && (
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
              onClick={() => { resetForm(); onOpenChange(false); }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Adding...' : 'Add Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}