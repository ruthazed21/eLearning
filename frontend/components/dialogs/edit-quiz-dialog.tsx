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
import { Loader2 } from 'lucide-react';

interface Quiz {
  id: number;
  title: string;
  description?: string;
  passing_score: number;
  time_limit_minutes?: number;
  question_count?: number;
  created_at?: string;
}

interface EditQuizDialogProps {
  quiz: Quiz | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (quiz: Quiz) => void;
}

export function EditQuizDialog({ quiz, open, onOpenChange, onSave }: EditQuizDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState('70');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title);
      setDescription(quiz.description || '');
      setPassingScore(quiz.passing_score?.toString() || '70');
      setTimeLimitMinutes(quiz.time_limit_minutes?.toString() || '');
      setError('');
    }
  }, [quiz]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;

    setIsSubmitting(true);
    setError('');

    try {
      const data = await quizzesAPI.update(quiz.id, {
        title,
        description: description || null,
        passingScore: parseInt(passingScore) || 70,
        timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : null,
      });

      onSave(data);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to update quiz:', err);
      setError(err.message || 'Failed to update quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!quiz) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Quiz</DialogTitle>
            <DialogDescription>
              Update the quiz details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-quiz-title">Quiz Title *</Label>
              <Input
                id="edit-quiz-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chapter 1 Assessment"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-quiz-description">Description (Optional)</Label>
              <Textarea
                id="edit-quiz-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this quiz covers..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-passing-score">Passing Score (%) *</Label>
                <Input
                  id="edit-passing-score"
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  placeholder="70"
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-time-limit">Time Limit (minutes)</Label>
                <Input
                  id="edit-time-limit"
                  type="number"
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(e.target.value)}
                  placeholder="No limit"
                  min="1"
                />
              </div>
            </div>
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