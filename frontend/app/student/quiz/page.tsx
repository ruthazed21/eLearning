'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RouteGuard } from '@/lib/route-guard';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { Button } from '@/components/ui/button';
import { QuizCard } from '@/components/quiz-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { quizzesAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Clock, Award, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function QuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizIdParam = searchParams.get('id');
  const courseIdParam = searchParams.get('courseId');

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<any>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [previousAttempts, setPreviousAttempts] = useState<any[]>([]);

  const fetchQuizData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      let quizData: any = null;

      if (quizIdParam) {
        quizData = await quizzesAPI.getById(parseInt(quizIdParam));
      } else if (courseIdParam) {
        const quizzes = (await quizzesAPI.getByCourse(parseInt(courseIdParam))) as any[];
        if (quizzes && quizzes.length > 0) {
          quizData = await quizzesAPI.getById(quizzes[0].id);
        }
      } else {
        // Fetch all available quizzes across enrolled courses
        const available = await quizzesAPI.getAvailable();
        setAvailableQuizzes(available);
        setLoading(false);
        return;
      }

      if (!quizData) {
        setError('Quiz not found. Please select a quiz from a course.');
        return;
      }

      setQuiz(quizData);
      setQuestions(quizData.questions || []);

      // Fetch previous attempts for this quiz (task 15.7)
      try {
        const attempts = await quizzesAPI.getAttempts(quizData.id);
        setPreviousAttempts(attempts || []);
      } catch {
        // Non-critical — don't fail the whole page if attempts can't be fetched
        setPreviousAttempts([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch quiz:', err);
      setError(err.message || 'Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [quizIdParam, courseIdParam]);

  useEffect(() => {
    fetchQuizData();
  }, [fetchQuizData]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  const handleAnswerSubmit = async (answer: string) => {
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: answer,
    };
    setAnswers(newAnswers);

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      try {
        setLoading(true);
        const result = await quizzesAPI.submitAttempt(quiz.id, newAnswers);

        router.push(`/student/quiz/results?score=${result.score}&correct=${result.earnedPoints}&total=${result.totalPoints}&quizId=${quiz.id}`);
      } catch (err: any) {
        console.error('Failed to submit quiz attempt:', err);
        setError('Failed to submit your quiz attempt. Please try again.');
        setLoading(false);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  return (
    <RouteGuard allowedRoles={['student']}>
      <DashboardLayout role="student" userName={user?.full_name || 'Student'} userRole="Student">
        <div className="space-y-8">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : quiz ? (
            <>
              {/* Quiz Header */}
              <div className="space-y-2">
                <Badge className="bg-blue-100 text-blue-700 border-0">{quiz.category || 'Quiz'}</Badge>
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{quiz.title}</h1>
                <p className="text-lg text-gray-500">{quiz.description}</p>
              </div>

              {/* Quiz Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="bg-blue-500 p-3 rounded-xl">
                      <Clock className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Time Limit</p>
                      <p className="text-3xl font-bold text-gray-900">{quiz.time_limit_minutes ? `${quiz.time_limit_minutes}:00` : 'No limit'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="bg-green-500 p-3 rounded-xl">
                      <Award className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Passing Score</p>
                      <p className="text-3xl font-bold text-gray-900">{quiz.passing_score}%</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quiz Question */}
              {currentQuestion && (
                <QuizCard
                  question={currentQuestion.question_text || currentQuestion.question}
                  options={currentQuestion.options?.map((o: any) => ({
                    id: o.id,
                    text: o.option_text || o.text,
                    is_correct: o.is_correct
                  })) || []}
                  questionNumber={currentQuestionIndex + 1}
                  totalQuestions={totalQuestions}
                  onSubmit={handleAnswerSubmit}
                  onPrevious={handlePrevious}
                  selectedAnswer={answers[currentQuestion.id]}
                />
              )}

              {/* Previous Attempts (task 15.7) */}
              {previousAttempts.length > 0 && (
                <Card className="border-0 shadow-sm" data-testid="previous-attempts">
                  <CardHeader>
                    <CardTitle className="text-lg">Previous Attempts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {previousAttempts.map((attempt: any, index: number) => (
                        <div
                          key={attempt.id ?? index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          data-testid="attempt-item"
                        >
                          <div className="flex items-center gap-3">
                            {attempt.passed ? (
                              <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Attempt {previousAttempts.length - index}
                              </p>
                              <p className="text-xs text-gray-500">
                                {attempt.completed_at
                                  ? new Date(attempt.completed_at).toLocaleDateString()
                                  : 'Date unknown'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900">{attempt.score}%</span>
                            <Badge
                              className={attempt.passed
                                ? 'bg-green-100 text-green-700 border-0'
                                : 'bg-red-100 text-red-700 border-0'}
                            >
                              {attempt.passed ? 'Passed' : 'Failed'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : availableQuizzes.length > 0 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Available Quizzes</h1>
                <p className="text-gray-500">Select a quiz from your enrolled courses to start.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableQuizzes.map((q) => (
                  <Card key={q.id} className="hover:shadow-md transition-all cursor-pointer border-0 shadow-sm" onClick={() => router.push(`/student/quiz?id=${q.id}`)}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">{q.course_title}</Badge>
                        <Badge variant="outline" className="text-gray-500 border-gray-200">{q.question_count} Questions</Badge>
                      </div>
                      <CardTitle className="text-xl mt-3">{q.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-4">{q.description || 'No description provided.'}</p>
                      <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                          <Clock className="h-4 w-4 text-blue-600" />
                          {q.time_limit_minutes ? `${q.time_limit_minutes}m` : 'No limit'}
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                          <Award className="h-4 w-4 text-green-600" />
                          {q.passing_score}% to pass
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Quizzes Available</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                There are currently no quizzes available for your enrolled courses. Check back later or enroll in new courses.
              </p>
              <Button
                onClick={() => router.push('/student/courses')}
                className="mt-6"
              >
                Browse Courses
              </Button>
            </div>
          )}

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-100 border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-blue-900">Quiz Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-blue-800 text-sm" role="list">
                <li>• Select one answer for each question</li>
                <li>• Navigate between questions using Previous/Next buttons or arrow keys</li>
                <li>• Use keyboard shortcuts (1-4 or A-D) to select answers quickly</li>
                <li>• Press R to read the question aloud, H for keyboard shortcuts help</li>
                <li>• Audio feedback will announce if your answer is correct or incorrect</li>
                <li>• Your progress is automatically saved</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
