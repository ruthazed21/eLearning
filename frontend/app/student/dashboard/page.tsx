'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RouteGuard } from '@/lib/route-guard';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { Card, CardContent } from '@/components/ui/card';
import { CourseCard } from '@/components/course-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { systemAPI, enrollmentsAPI, progressAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statsData, setStatsData] = useState<any>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [welcomeText, setWelcomeText] = useState('Welcome back');


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const justSignedUp = localStorage.getItem('justSignedUp');
      if (justSignedUp === 'true') {
        setWelcomeText('Welcome');
        localStorage.removeItem('justSignedUp');
      }
    }

    if (user?.id) {
      fetchDashboardData(user.id);
    }
  }, [user]);

  const fetchDashboardData = async (studentId: number) => {
    try {
      setLoading(true);
      setError('');

      const [stats, enrollments, progress] = await Promise.all([
        systemAPI.getStudentStats(),
        enrollmentsAPI.getByStudent(studentId),
        progressAPI.getByStudent(studentId),
      ]) as [any, any[], any[]];

      setStatsData(stats);
      setEnrolledCourses(enrollments);
      setProgressData(progress);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stats = statsData ? [
    { title: 'Enrolled Courses', value: statsData.enrolledCourses?.toString() || '0', icon: BookOpen, color: 'yellow' },
    { title: 'Completed', value: statsData.completedCourses?.toString() || '0', icon: Award, color: 'green' },
    { title: 'Avg. Progress', value: statsData.avgProgress || '0%', icon: TrendingUp, color: 'purple' },
    { title: 'Est. Hours', value: statsData.totalHours?.toString() || '0', icon: Clock, color: 'orange' },
  ] : [];

  const recentActivity = enrolledCourses.slice(0, 3).map(course => ({
    title: `Enrolled in ${course.title}`,
    course: course.category || 'Course',
    time: new Date(course.enrolled_at).toLocaleDateString() === new Date().toLocaleDateString()
      ? 'Today'
      : new Date(course.enrolled_at).toLocaleDateString()
  }));



  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigation shortcuts (Ctrl+Key)
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault();
            router.push('/student/courses');
            break;
          case 'p':
            e.preventDefault();
            router.push('/student/progress');
            break;
          case 'q':
            e.preventDefault();
            router.push('/student/quiz');
            break;
          case 'h':
            e.preventDefault();
            router.push('/student/dashboard');
            break;
        }
      }

      // Number shortcuts for quick course access (1-3)
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && ['1', '2', '3'].includes(e.key)) {
        const courseIndex = parseInt(e.key) - 1;
        if (courseIndex < enrolledCourses.length) {
          e.preventDefault();
          router.push(`/student/course/${enrolledCourses[courseIndex].course_id}`);
        }
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, enrolledCourses]);

  const keyboardShortcuts = [
    { keys: ['Ctrl', 'H'], description: 'Go to Dashboard' },
    { keys: ['Ctrl', 'C'], description: 'Go to Courses' },
    { keys: ['Ctrl', 'P'], description: 'Go to Progress' },
    { keys: ['Ctrl', 'Q'], description: 'Go to Quiz' },
    { keys: ['1-3'], description: 'Open course (quick access)' },

  ];

  return (
    <RouteGuard allowedRoles={['student']}>
      <DashboardLayout role="student" userName={user?.full_name || "Student"} userRole="Student">
        <KeyboardShortcutsHelp shortcuts={keyboardShortcuts} />
        <div className="space-y-8">
          {/* Welcome Section - Clear hierarchy */}
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{welcomeText}, {user?.full_name?.split(' ')[0] || 'Student'}</h1>
            <p className="text-lg text-gray-500">Continue your learning journey</p>
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
              <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
            </div>
          ) : (
            <>

              {/* Statistics Cards - Improved spacing and contrast */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  const colorClasses = {
                    yellow: 'bg-yellow-400',
                    green: 'bg-green-500',
                    purple: 'bg-purple-500',
                    orange: 'bg-orange-500',
                  }[stat.color];

                  return (
                    <Card key={stat.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-500">
                              {stat.title}
                            </p>
                            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${colorClasses}`}>
                            <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>



              {/* My Courses Section - Better spacing and hierarchy */}
              <section aria-labelledby="my-courses-heading" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 id="my-courses-heading" className="text-2xl font-bold text-gray-900">
                    My Courses
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-yellow-600 hover:text-yellow-700"
                    onClick={() => router.push('/student/courses')}
                  >
                    View all
                    <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {enrolledCourses.length > 0 ? (
                    enrolledCourses.map((enrollment) => (
                      <CourseCard
                        key={enrollment.course_id}
                        id={enrollment.course_id.toString()}
                        title={enrollment.title}
                        instructor={enrollment.teacher_name || 'Instructor'}
                        progress={enrollment.progress_percentage}
                        lessons={enrollment.total_lessons || 0}
                        enrolled={true}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">No courses enrolled yet</p>
                      <Button
                        variant="link"
                        className="text-yellow-600 mt-2"
                        onClick={() => router.push('/student/courses')}
                      >
                        Browse available courses
                      </Button>
                    </div>
                  )}
                </div>
              </section>

              {/* Recent Activity - Simplified and cleaner */}
              <section aria-labelledby="recent-activity-heading" className="space-y-4">
                <h2 id="recent-activity-heading" className="text-2xl font-bold text-gray-900">
                  Recent Activity
                </h2>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <ul className="space-y-4" role="list">
                      {recentActivity.map((activity, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-4 pb-4 last:pb-0 border-b last:border-0 border-gray-100"
                        >
                          <div className="bg-gray-100 p-2.5 rounded-lg flex-shrink-0">
                            <BookOpen className="h-4 w-4 text-gray-600" aria-hidden="true" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
                            <p className="text-sm text-gray-500">{activity.course}</p>
                          </div>
                          <p className="text-xs text-gray-400 flex-shrink-0">{activity.time}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            </>
          )}
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
