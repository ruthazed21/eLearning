'use client';

import { useState, useEffect } from 'react';
import { quizzesAPI } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Edit,
  Trash2,
  Plus,
  Clock,
  Target,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { AddQuestionDialog } from './add-question-dialog';
import { EditQuestionDialog } from './edit-question-dialog';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

interface Question {
  id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  points: number;
  order_index: number;
  options?: any[];
}

interface Quiz {
  id: number;
  title: string;
  description?: string;
  passing_score: number;
  time_limit_minutes?: number;
  question_count?: number;
}

interface QuizManagementDialogProps {
  quiz: Quiz | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuizManagementDialog({ quiz, open, onOpenChange }: QuizManagementDialogProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Dialog states
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (quiz && open) {
      fetchQuizDetails();
    }
  }, [quiz, open]);

  const fetchQuizDetails = async () => {
    if (!quiz) return;
    
    setLoading(true);
    setError('');
    
    try {
      const data = await quizzesAPI.getById(quiz.id);
      setQuestions(data.questions || []);
    } catch (err: any) {
      console.error('Failed to fetch quiz details:', err);
      setError(err.message || 'Failed to load quiz details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = (newQuestion: Question) => {
    setQuestions([...questions, newQuestion].sort((a, b) => a.order_index - b.order_index));
  };

  const handleEditQuestion = (updatedQuestion: Question) => {
    setQuestions(questions.map(q => 
      q.id === updatedQuestion.id ? updatedQuestion : q
    ).sort((a, b) => a.order_index - b.order_index));
  };

  const handleDeleteQuestion = async (questionId: number) => {
    try {
      await quizzesAPI.deleteQuestion(questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
      setDeletingQuestion(null);
    } catch (err: any) {
      console.error('Failed to delete question:', err);
      setError('Failed to delete question');
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'Multiple Choice';
      case 'true_false': return 'True/False';
      case 'short_answer': return 'Short Answer';
      default: return type;
    }
  };

  const getQuestionTypeBadge = (type: string) => {
    const variant = type === 'multiple_choice' ? 'default' : 
                   type === 'true_false' ? 'secondary' : 'outline';
    return <Badge variant={variant}>{getQuestionTypeLabel(type)}</Badge>;
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const nextOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order_index)) + 1 : 1;

  if (!quiz) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              {quiz.title}
            </DialogTitle>
            <DialogDescription>
              Manage questions and settings for this quiz
            </DialogDescription>
          </DialogHeader>

          {/* Quiz Info */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Passing Score</p>
                <p className="text-lg">{quiz.passing_score}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Time Limit</p>
                <p className="text-lg">{quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'No limit'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total Points</p>
                <p className="text-lg">{totalPoints}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {/* Questions Section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Questions ({questions.length})</h3>
              <Button size="sm" className="gap-2" onClick={() => setAddingQuestion(true)}>
                <Plus className="h-4 w-4" />
                Add Question
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <HelpCircle className="h-12 w-12 mb-2 text-gray-300" />
                <p className="text-lg font-medium">No questions yet</p>
                <p className="text-sm">Add your first question to get started</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Order</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead className="w-32">Type</TableHead>
                      <TableHead className="w-20">Points</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell className="font-medium">{question.order_index}</TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="truncate">{question.question_text}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getQuestionTypeBadge(question.question_type)}</TableCell>
                        <TableCell>{question.points}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingQuestion(question)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit question</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeletingQuestion(question)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete question</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <AddQuestionDialog
        quizId={quiz.id}
        open={addingQuestion}
        onOpenChange={setAddingQuestion}
        onAdd={handleAddQuestion}
        nextOrder={nextOrder}
      />

      {/* Edit Question Dialog */}
      <EditQuestionDialog
        question={editingQuestion}
        open={!!editingQuestion}
        onOpenChange={(open) => !open && setEditingQuestion(null)}
        onSave={handleEditQuestion}
      />

      {/* Delete Question Confirmation */}
      {deletingQuestion && (
        <DeleteConfirmDialog
          open={!!deletingQuestion}
          onOpenChange={(open) => !open && setDeletingQuestion(null)}
          onConfirm={() => handleDeleteQuestion(deletingQuestion.id)}
          title="Delete Question"
          description={`Are you sure you want to delete this question? This action cannot be undone.`}
        />
      )}
    </>
  );
}