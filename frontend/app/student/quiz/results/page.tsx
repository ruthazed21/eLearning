'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RouteGuard } from '@/lib/route-guard';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { quizzesAPI, getStoredUser } from '@/lib/api';
import {
  Award,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RotateCcw,
  Home,
  Loader2,
  Volume2,
  Keyboard
} from 'lucide-react';
import Link from 'next/link';

export default function QuizResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const score = parseInt(searchParams.get('score') || '0');
  const correct = parseInt(searchParams.get('correct') || '0');
  const total = parseInt(searchParams.get('total') || '10');
  const quizId = searchParams.get('quizId');

  const [user, setUser] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const storedUser = getStoredUser();
      setUser(storedUser);

      if (quizId) {
        const quizData = await quizzesAPI.getById(parseInt(quizId));
        setQuiz(quizData);
      }
    } catch (err) {
      console.error('Failed to fetch quiz details:', err);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const passed = score >= (quiz?.passing_score || 70);
  const incorrect = total - correct;

  // Auto-read results when page loads
  useEffect(() => {
    if (!loading && quiz) {
      // Small delay to ensure page is fully rendered
      const timer = setTimeout(() => {
        readResultsAloud();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, quiz]);

  // Focus management for screen readers
  useEffect(() => {
    if (!loading && resultsRef.current) {
      resultsRef.current.focus();
    }
  }, [loading]);

  // Text-to-speech function for reading results
  const readResultsAloud = () => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance();
      
      // Create comprehensive results announcement
      const resultText = `Quiz Results for ${quiz?.title || 'Course Quiz'}. 
        Your score is ${score} percent. 
        You answered ${correct} out of ${total} questions correctly. 
        You got ${incorrect} questions wrong. 
        ${passed ? 'Congratulations! You passed the quiz!' : 'You did not pass this time. Keep practicing!'} 
        ${getPerformanceFeedback()}
        Press R to read results again, S to read detailed statistics, F to read feedback, or A to read available actions.`;
      
      utterance.text = resultText;
      utterance.rate = 0.9;
      utterance.pitch = passed ? 1.1 : 0.9;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }
  };

  // Read detailed statistics
  const readStatistics = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance();
      utterance.text = `Detailed Statistics: Total questions: ${total}. Correct answers: ${correct}. Incorrect answers: ${incorrect}. Final score: ${score} percent. Passing score required: ${quiz?.passing_score || 70} percent.`;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }
  };

  // Read performance feedback
  const readFeedback = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance();
      utterance.text = `Performance Feedback: ${getPerformanceFeedback()}`;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }
  };

  // Read available actions
  const readActions = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance();
      utterance.text = `Available Actions: Press R to retake the quiz, or press Control H to go back to dashboard. You can also use Control C to go to courses, or Control P to go to progress page.`;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }
  };

  // Get performance feedback text
  const getPerformanceFeedback = () => {
    if (score >= 90) {
      return "Excellent work! You have a strong understanding of the material. You're ready to move on to more advanced topics.";
    } else if (score >= 70) {
      return "Good job! You have a solid grasp of the basics. Review the questions you missed to strengthen your knowledge.";
    } else if (score >= 50) {
      return "You're making progress, but need more practice. Review the course materials and try the quiz again to improve your score.";
    } else {
      return "Keep learning! Review the course materials carefully and practice more. Don't hesitate to ask your instructor for help.";
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault();
            router.push('/student/dashboard');
            break;
          case 'c':
            e.preventDefault();
            router.push('/student/courses');
            break;
          case 'p':
            e.preventDefault();
            router.push('/student/progress');
            break;
        }
      }

      // Audio and navigation shortcuts (without Ctrl)
      if (!e.ctrlKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault();
            if (e.shiftKey) {
              // Shift+R to retake quiz
              router.push(`/student/quiz?id=${quizId}`);
            } else {
              // R to read results
              readResultsAloud();
            }
            break;
          case 's':
            e.preventDefault();
            readStatistics();
            break;
          case 'f':
            e.preventDefault();
            readFeedback();
            break;
          case 'a':
            e.preventDefault();
            readActions();
            break;
          case 'h':
            e.preventDefault();
            setShowKeyboardHelp(prev => !prev);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, quizId, quiz, score, correct, total, incorrect, passed]);

  const keyboardShortcuts = [
    { keys: ['R'], description: 'Read results aloud' },
    { keys: ['S'], description: 'Read statistics' },
    { keys: ['F'], description: 'Read feedback' },
    { keys: ['A'], description: 'Read available actions' },
    { keys: ['Shift', 'R'], description: 'Retake quiz' },
    { keys: ['Ctrl', 'H'], description: 'Go to Dashboard' },
    { keys: ['Ctrl', 'C'], description: 'Go to Courses' },
    { keys: ['Ctrl', 'P'], description: 'Go to Progress' },
    { keys: ['H'], description: 'Toggle help' },
  ];

  return (
    <RouteGuard allowedRoles={['student']}>
      <DashboardLayout role="student" userName={user?.fullName || "Student"} userRole="Student">
        <KeyboardShortcutsHelp shortcuts={keyboardShortcuts} />
        <div className="space-y-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-blue-100 text-blue-700 border-0">{quiz?.category || 'Quiz'}</Badge>
                    <h1 
                      ref={resultsRef}
                      tabIndex={-1}
                      className="text-4xl font-bold text-gray-900 tracking-tight"
                      role="heading"
                      aria-level={1}
                    >
                      Quiz Results
                    </h1>
                    <p className="text-lg text-gray-500">{quiz?.title || 'Course Quiz'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={readResultsAloud}
                      aria-label="Read results aloud"
                      title="Read results aloud (R)"
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
              </div>

              {/* Keyboard Help Panel */}
              {showKeyboardHelp && (
                <Card className="border-0 shadow-sm bg-blue-50 border-blue-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-blue-900">Audio & Keyboard Shortcuts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
                      {keyboardShortcuts.map((shortcut, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {shortcut.keys.map((key, keyIndex) => (
                              <Badge key={keyIndex} variant="secondary" className="text-xs">
                                {key}
                              </Badge>
                            ))}
                          </div>
                          <span>{shortcut.description}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Screen reader live region for announcements */}
              <div
                className="sr-only"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                Quiz results loaded. Press R to hear your results.
              </div>

              {/* Score Card */}
              <Card className={`border-0 shadow-lg ${passed ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-orange-50 to-orange-100'}`}>
                <CardContent className="pt-8 pb-8">
                  <div className="text-center space-y-6">
                    <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full ${passed ? 'bg-green-500' : 'bg-orange-500'
                      }`}>
                      {passed ? (
                        <CheckCircle2 className="h-14 w-14 text-white" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-14 w-14 text-white" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <h2 
                        className={`text-6xl font-bold ${passed ? 'text-green-700' : 'text-orange-700'}`}
                        role="heading"
                        aria-level={2}
                        aria-label={`Your score is ${score} percent`}
                      >
                        {score}%
                      </h2>
                      <p 
                        className={`text-xl font-semibold mt-3 ${passed ? 'text-green-800' : 'text-orange-800'}`}
                        role="status"
                        aria-live="polite"
                      >
                        {passed ? 'Congratulations! You Passed!' : 'Keep Practicing!'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="region" aria-label="Quiz Statistics">
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-500 p-3 rounded-xl">
                        <Award className="h-6 w-6 text-white" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Questions</p>
                        <p className="text-3xl font-bold text-gray-900" aria-label={`${total} total questions`}>{total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-500 p-3 rounded-xl">
                        <CheckCircle2 className="h-6 w-6 text-white" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Correct Answers</p>
                        <p className="text-3xl font-bold text-green-700" aria-label={`${correct} correct answers`}>{correct}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-red-500 p-3 rounded-xl">
                        <XCircle className="h-6 w-6 text-white" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Incorrect Answers</p>
                        <p className="text-3xl font-bold text-red-700" aria-label={`${incorrect} incorrect answers`}>{incorrect}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Feedback */}
              <Card className="border-0 shadow-sm" role="region" aria-label="Performance Feedback">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <TrendingUp className="h-6 w-6" aria-hidden="true" />
                    Performance Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-gray-700 leading-relaxed" role="status" aria-live="polite">
                      {getPerformanceFeedback()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4" role="region" aria-label="Available Actions">
                <Button
                  onClick={() => router.push(`/student/quiz?id=${quizId}`)}
                  className="gap-2"
                  variant="outline"
                  size="lg"
                  aria-label="Retake quiz (Shift+R)"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Retake Quiz
                </Button>
                <Link href="/student/dashboard" className="flex-1">
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    aria-label="Back to Dashboard (Ctrl+H)"
                  >
                    <Home className="h-4 w-4" aria-hidden="true" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>

              {/* Audio Instructions */}
              <Card className="bg-blue-50 border-blue-100 border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-blue-900">Audio Instructions for Screen Readers</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-blue-800 text-sm" role="list">
                    <li>• Press <strong>R</strong> to read your complete quiz results aloud</li>
                    <li>• Press <strong>S</strong> to read detailed statistics</li>
                    <li>• Press <strong>F</strong> to read performance feedback</li>
                    <li>• Press <strong>A</strong> to read available actions</li>
                    <li>• Press <strong>Shift+R</strong> to retake the quiz</li>
                    <li>• Press <strong>H</strong> to toggle keyboard shortcuts help</li>
                    <li>• Use <strong>Ctrl+H</strong>, <strong>Ctrl+C</strong>, or <strong>Ctrl+P</strong> for navigation</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
