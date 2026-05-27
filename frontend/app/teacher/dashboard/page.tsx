'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { coursesAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RouteGuard } from '@/lib/route-guard';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { BookOpen, Users, Upload, TrendingUp, Edit, Eye, Trash2, Loader2, Send } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EditCourseDialog } from '@/components/dialogs/edit-course-dialog';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';

interface Course {
  id: number;
  title: string;
  instructor: string;
  students: number;
  totalStudents: number;
  lessons: number;
  totalLessons: number;
  duration: string;
  category: string;
  status: string;
  created: string;
  description: string;
  completion: number;
}

interface Stats {
  totalCourses: number;
  totalStudents: number;
  uploadedLessons: number;
  avgCompletion: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0,
    totalStudents: 0,
    uploadedLessons: 0,
    avgCompletion: '0%',
  });

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);

  // Fetch teacher's courses filtered by teacher_id from auth context
  const fetchDashboardData = async (teacherId: number) => {
    try {
      setLoading(true);
      setError('');

      // Task 7.1: Fetch teacher's courses filtered by teacher_id
      const coursesData = await coursesAPI.getAll({ teacherId });

      // Task 7.2: Calculate statistics from courses data
      const totalCourses = coursesData.length;
      const totalStudents = coursesData.reduce(
        (sum: number, c: any) => sum + (parseInt(c.enrollment_count) || 0),
        0
      );

      // Map courses to local shape
      const mappedCourses: Course[] = coursesData.map((c: any) => ({
        id: c.id,
        title: c.title,
        instructor: c.teacher_name || '',
        students: parseInt(c.enrollment_count) || 0,
        totalStudents: parseInt(c.enrollment_count) || 0,
        lessons: parseInt(c.lessons_count) || 0,
        totalLessons: parseInt(c.lessons_count) || 0,
        completion: Math.round(parseFloat(c.avg_progress) || 0),
        description: c.description || '',
        duration: c.duration || '',
        category: c.category || '',
        created: c.created_at || '',
        status: c.status || 'draft',
      }));

      setCourses(mappedCourses);

      // Calculate avg completion from courses data
      const avgCompletion =
        mappedCourses.length > 0
          ? Math.round(
              mappedCourses.reduce((sum, c) => sum + c.completion, 0) /
                mappedCourses.length
            )
          : 0;

      setStats({
        totalCourses,
        totalStudents,
        uploadedLessons: mappedCourses.reduce((sum, c) => sum + c.lessons, 0),
        avgCompletion: `${avgCompletion}%`,
      });
    } catch (err: any) {
      console.error('Failed to fetch teacher dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Task 7.1: Trigger fetch when user id is available from auth context
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData(user.id);
    }
  }, [user?.id]);

  // Task 7.4: Edit handler — receives API response from EditCourseDialog and updates local state
  const handleEditCourse = (apiResponse: any) => {
    // EditCourseDialog calls coursesAPI.update internally and passes the raw API response here.
    // Merge the updated fields back into the existing course entry to preserve computed fields.
    setCourses(prev =>
      prev.map(c =>
        c.id === apiResponse.id
          ? {
              ...c,
              title: apiResponse.title ?? c.title,
              description: apiResponse.description ?? c.description,
              category: apiResponse.category ?? c.category,
              status: apiResponse.status ?? c.status,
            }
          : c
      )
    );
    setEditingCourse(null);
  };

  // Task 7.4: Delete handler — remove course via API and update local state
  const handleDeleteCourse = async (courseId: number) => {
    try {
      setProcessingId(courseId);
      await coursesAPI.delete(courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err: any) {
      console.error('Failed to delete course:', err);
      alert('Failed to delete course: ' + err.message);
    } finally {
      setProcessingId(null);
      setDeletingCourse(null);
    }
  };

  // Publish handler — update course status to published
  const handlePublishCourse = async (courseId: number) => {
    try {
      setPublishingId(courseId);
      await coursesAPI.update(courseId, { status: 'published' });
      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, status: 'published' } : c
      ));
    } catch (err: any) {
      console.error('Failed to publish course:', err);
      alert('Failed to publish course: ' + err.message);
    } finally {
      setPublishingId(null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault();
            router.push('/teacher/dashboard');
            break;
          case 'c':
            e.preventDefault();
            router.push('/teacher/courses');
            break;
          case 'u':
            e.preventDefault();
            router.push('/teacher/upload');
            break;
          case 'a':
            e.preventDefault();
            router.push('/teacher/accessibility');
            break;
        }
      }

      // Number shortcuts for quick course access (1-4)
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && ['1', '2', '3', '4'].includes(e.key)) {
        const courseIndex = parseInt(e.key) - 1;
        if (courseIndex < courses.length) {
          e.preventDefault();
          setEditingCourse(courses[courseIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, courses]);

  const keyboardShortcuts = [
    { keys: ['Ctrl', 'H'], description: 'Go to Dashboard' },
    { keys: ['Ctrl', 'C'], description: 'Go to Courses' },
    { keys: ['Ctrl', 'U'], description: 'Go to Upload' },
    { keys: ['Ctrl', 'A'], description: 'Go to Accessibility' },
    { keys: ['1-4'], description: 'Edit course (quick access)' },
  ];

  const statCards = [
    { title: 'Total Courses', value: stats.totalCourses.toString(), icon: BookOpen, color: 'blue' },
    { title: 'Total Students', value: stats.totalStudents.toString(), icon: Users, color: 'green' },
    { title: 'Uploaded Lessons', value: stats.uploadedLessons.toString(), icon: Upload, color: 'purple' },
    { title: 'Avg. Completion', value: stats.avgCompletion, icon: TrendingUp, color: 'orange' },
  ] as const;

  return (
    <RouteGuard allowedRoles={['teacher']} requireTeacherApproval>
    <DashboardLayout role="teacher" userName={user?.full_name || 'Teacher'} userRole="Teacher">
      <KeyboardShortcutsHelp shortcuts={keyboardShortcuts} />
      <div className="space-y-6">
        {/* Task 7.5: Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-medium">Failed to load dashboard data</p>
            <p className="text-sm mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => user?.id && fetchDashboardData(user.id)}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your courses and track student progress</p>
        </div>

        {/* Task 7.5: Loading State for stats cards */}
        {/* Task 7.2: Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-700',
              green: 'bg-green-100 text-green-700',
              purple: 'bg-purple-100 text-purple-700',
              orange: 'bg-orange-100 text-orange-700',
            }[stat.color];

            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${colorClasses}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-9 w-16 bg-gray-200 animate-pulse rounded" />
                  ) : (
                    <div className="text-3xl font-bold">{stat.value}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Task 7.3: Courses Table with student count */}
        <Card>
          <CardHeader>
            <CardTitle>My Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Task 7.5: Loading State */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No courses found. Start by uploading your first course.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Students Enrolled</TableHead>
                    <TableHead>Lessons</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Avg. Completion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell>{course.students}</TableCell>
                      <TableCell>{course.lessons}</TableCell>
                      <TableCell>
                        <Badge variant={
                          course.status === 'published' ? 'default' : 
                          course.status === 'draft' ? 'secondary' : 
                          'outline'
                        }>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-25">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${course.completion}%` }}
                              role="progressbar"
                              aria-valuenow={course.completion}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${course.completion}% completion`}
                            />
                          </div>
                          <span className="text-sm">{course.completion}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingCourse(course)}
                                  disabled={processingId === course.id}
                                  aria-label={`Edit ${course.title}`}
                                >
                                  {processingId === course.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Edit className="h-4 w-4" aria-hidden="true" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit course</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {course.status === 'draft' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePublishCourse(course.id)}
                                    disabled={publishingId === course.id}
                                    aria-label={`Publish ${course.title}`}
                                    className="bg-green-50 border-green-200 hover:bg-green-100"
                                  >
                                    {publishingId === course.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                                    ) : (
                                      <Send className="h-4 w-4 text-green-600" aria-hidden="true" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Publish course</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/teacher/courses/${course.id}`)}
                                  aria-label={`View ${course.title}`}
                                >
                                  <Eye className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View course details</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeletingCourse(course)}
                                  disabled={processingId === course.id}
                                  aria-label={`Delete ${course.title}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete course</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Course Dialog */}
        {editingCourse && (
          <EditCourseDialog
            course={editingCourse}
            open={!!editingCourse}
            onOpenChange={(open) => !open && setEditingCourse(null)}
            onSave={handleEditCourse}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {deletingCourse && (
          <DeleteConfirmDialog
            open={!!deletingCourse}
            onOpenChange={(open) => !open && setDeletingCourse(null)}
            onConfirm={() => handleDeleteCourse(deletingCourse.id)}
            title="Delete Course"
            description={`Are you sure you want to delete "${deletingCourse.title}"? This action cannot be undone and will remove all associated lessons and student progress.`}
          />
        )}
      </div>
    </DashboardLayout>
    </RouteGuard>
  );
}
