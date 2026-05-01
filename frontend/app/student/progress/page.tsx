'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RouteGuard } from '@/lib/route-guard';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { ProgressCard } from '@/components/progress-card';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { systemAPI, progressAPI, quizzesAPI, enrollmentsAPI } from '@/lib/api';
import { BookOpen, Award, FileCheck, TrendingUp, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function ProgressPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statsData, setStatsData] = useState<any>(null);
  const [courseProgressData, setCourseProgressData] = useState<any[]>([]);
  const [quizAttemptsData, setQuizAttemptsData] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [courseFilter, setCourseFilter] = useState('all');

  const fetchProgressData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError('');

      const [stats, courseProgress, quizAttempts, enrollmentData] = await Promise.all([
        systemAPI.getStudentStats(),
        progressAPI.getByStudent(user.id),
        quizzesAPI.getRecentAttempts(),
        enrollmentsAPI.getByStudent(user.id),
      ]);

      setStatsData(stats);
      setCourseProgressData(courseProgress);
      setQuizAttemptsData(quizAttempts);
      setEnrollments(enrollmentData);
    } catch (err: any) {
      console.error('Failed to fetch progress data:', err);
      setError(err.message || 'Failed to load progress data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

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
          case 'q':
            e.preventDefault();
            router.push('/student/quiz');
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const keyboardShortcuts = [
    { keys: ['Ctrl', 'H'], description: 'Go to Dashboard' },
    { keys: ['Ctrl', 'C'], description: 'Go to Courses' },
    { keys: ['Ctrl', 'Q'], description: 'Go to Quiz' },
  ];

  const overallStats = statsData ? [
    { title: 'Courses Enrolled', value: statsData.enrolledCourses || 0, total: Math.max(statsData.enrolledCourses || 1, 1), icon: BookOpen, color: 'blue' },
    { title: 'Courses Completed', value: statsData.completedCourses || 0, total: Math.max(statsData.enrolledCourses || 1, 1), icon: FileCheck, color: 'green' },
    { title: 'Average Progress', value: parseInt(statsData.avgProgress) || 0, total: 100, icon: TrendingUp, color: 'purple' },
    { title: 'Total Hours (Est.)', value: statsData.totalHours || 0, total: Math.max(statsData.totalHours || 1, 1), icon: Award, color: 'orange' },
  ] : [];

  // Build unique course list for filter dropdown
  const courseOptions = courseProgressData.map((c: any) => c.title).filter(Boolean);

  // Apply course filter
  const filteredCourseProgress = courseFilter === 'all'
    ? courseProgressData
    : courseProgressData.filter((c: any) => c.title === courseFilter);

  // Calculate completion stats from filtered data
  const totalLessons = filteredCourseProgress.reduce((sum: number, c: any) => sum + (c.total_lessons || 0), 0);
  const completedLessons = filteredCourseProgress.reduce((sum: number, c: any) => sum + (c.completed_lessons || 0), 0);
  const totalTimeMinutes = filteredCourseProgress.reduce((sum: number, c: any) => sum + (c.time_spent_minutes || 0), 0);

  return (
    <RouteGuard allowedRoles={['student']}>
      <DashboardLayout role="student" userName={user?.full_name || 'Student'} userRole="Student">
        <KeyboardShortcutsHelp shortcuts={keyboardShortcuts} />
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Learning Progress</h1>
            <p className="text-lg text-gray-500">Track your learning journey and achievements</p>
          </div>

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
          ) : (
            <>
              {/* Overall Statistics */}
              <section aria-labelledby="overall-stats-heading" className="space-y-4">
                <h2 id="overall-stats-heading" className="text-2xl font-bold text-gray-900">Overall Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {overallStats.map((stat) => (
                    <ProgressCard key={stat.title} {...stat} />
                  ))}
                </div>
              </section>

              {/* Course Progress */}
              <section aria-labelledby="course-progress-heading" className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 id="course-progress-heading" className="text-2xl font-bold text-gray-900">Course Progress</h2>
                  {courseOptions.length > 0 && (
                    <select
                      aria-label="Filter by course"
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Courses</option>
                      {courseOptions.map((title: string) => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Completion summary */}
                {filteredCourseProgress.length > 0 && (
                  <div className="flex gap-6 text-sm text-gray-600">
                    <span data-testid="total-lessons">{completedLessons}/{totalLessons} lessons completed</span>
                    {totalTimeMinutes > 0 && (
                      <span data-testid="total-time" className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {totalTimeMinutes >= 60
                          ? `${Math.floor(totalTimeMinutes / 60)}h ${totalTimeMinutes % 60}m`
                          : `${totalTimeMinutes}m`} spent
                      </span>
                    )}
                  </div>
                )}

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {filteredCourseProgress.length > 0 ? (
                        filteredCourseProgress.map((course: any, index: number) => (
                          <div key={index} className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-gray-900">{course.title}</h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {course.completed_lessons}/{course.total_lessons} lessons completed
                                </p>
                                {course.time_spent_minutes != null && course.time_spent_minutes > 0 && (
                                  <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5" data-testid={`time-spent-${index}`}>
                                    <Clock className="h-3 w-3" />
                                    {course.time_spent_minutes >= 60
                                      ? `${Math.floor(course.time_spent_minutes / 60)}h ${course.time_spent_minutes % 60}m`
                                      : `${course.time_spent_minutes}m`} spent
                                  </p>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-gray-900">{Math.round(course.progress_percentage)}%</span>
                            </div>
                            <Progress
                              value={course.progress_percentage}
                              aria-label={`${course.title} progress: ${course.progress_percentage}%`}
                              className="h-2"
                            />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No course progress data available.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Quiz Performance */}
              <section aria-labelledby="quiz-performance-heading" className="space-y-4">
                <h2 id="quiz-performance-heading" className="text-2xl font-bold text-gray-900">Recent Quiz Performance</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizAttemptsData.length > 0 ? (
                    quizAttemptsData.map((attempt: any) => (
                      <Card key={attempt.id} className="border-0 shadow-sm">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-gray-900">{attempt.quiz_title}</h3>
                              <p className="text-sm text-gray-500">{attempt.course_title}</p>
                            </div>
                            <Badge className={attempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {attempt.passed ? 'Passed' : 'Failed'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center text-gray-600">
                              <Award className="h-4 w-4 mr-2 text-gray-400" />
                              <span>Score: <strong>{Math.round(attempt.score)}%</strong></span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Clock className="h-4 w-4 mr-2 text-gray-400" />
                              <span>{new Date(attempt.completed_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="border-0 shadow-sm col-span-full">
                      <CardContent className="p-6">
                        <div className="text-center py-6">
                          <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 font-medium">No quiz attempts yet.</p>
                          <p className="text-sm text-gray-400 mt-1">Take a quiz in one of your courses to see your performance here.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
