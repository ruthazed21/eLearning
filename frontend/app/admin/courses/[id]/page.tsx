'use client';

import { use, useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { useCommonShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Plus,
  Loader2
} from 'lucide-react';
import { coursesAPI, lessonsAPI, enrollmentsAPI } from '@/lib/api';
import { RouteGuard } from '@/lib/route-guard';
import { EditCourseDialog } from '@/components/dialogs/edit-course-dialog';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { AddLessonDialog } from '@/components/dialogs/add-lesson-dialog';
import { EditLessonDialog } from '@/components/dialogs/edit-lesson-dialog';

interface Lesson {
  id: number;
  title: string;
  duration: string;
  order: number;
  description?: string;
  video_url?: string;
}

interface Student {
  id: number;
  name: string;
  email: string;
  enrolledDate: string;
  progress: number;
  status: string;
}

interface CourseData {
  id: number;
  title: string;
  instructor: string;
  description: string;
  status: string;
  created: string;
  totalStudents: number;
  totalLessons: number;
  duration: string;
  category: string;
}

export default function AdminCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  useCommonShortcuts('admin');

  // Unwrap params Promise
  const { id } = use(params);

  const [course, setCourse] = useState<CourseData | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourseData();
    fetchEnrollments();
  }, [id]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await coursesAPI.getById(parseInt(id)) as any;
      setCourse({
        id: data.id,
        title: data.title,
        instructor: data.teacher_name || 'Admin',
        description: data.description || '',
        status: (data.status || 'Active').charAt(0).toUpperCase() + (data.status || 'Active').slice(1),
        created: new Date(data.created_at).toISOString().split('T')[0],
        totalStudents: data.enrollment_count || 0,
        totalLessons: data.lessons?.length || 0,
        duration: data.duration || 'N/A',
        category: data.category || 'Uncategorized',
      });
      setLessons(data.lessons.map((l: any) => ({
        id: l.id,
        title: l.title,
        duration: l.duration_minutes ? `${l.duration_minutes} min` : '0 min',
        order: l.order_index,
        description: l.description || '',
        video_url: l.video_url || '',
      })));
    } catch (err: any) {
      console.error('Failed to fetch course details:', err);
      setError(err.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const data = await enrollmentsAPI.getByCourse(parseInt(id)) as any;
      setStudents(data.map((e: any) => ({
        id: e.student_id,
        name: e.full_name,
        email: e.email,
        enrolledDate: new Date(e.enrolled_at).toISOString().split('T')[0],
        progress: e.progress || 0,
        status: 'Active' // We don't have enrollment status yet
      })));
    } catch (err: any) {
      console.error('Failed to fetch enrollments:', err);
    }
  };

  // State for dialogs
  const [editingCourse, setEditingCourse] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [addingLesson, setAddingLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Handlers
  const handleDeleteCourse = async () => {
    if (!course) return;
    try {
      await coursesAPI.delete(course.id);
      window.location.href = '/admin/courses';
    } catch (err: any) {
      console.error('Failed to delete course:', err);
      setError('Failed to delete course');
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    try {
      await lessonsAPI.delete(lessonId);
      setLessons(lessons.filter(l => l.id !== lessonId));
      setDeletingLesson(null);
    } catch (err: any) {
      console.error('Failed to delete lesson:', err);
      setError('Failed to delete lesson');
    }
  };

  const handleAddLesson = (newLesson: any) => {
    setLessons([...lessons, {
      id: newLesson.id,
      title: newLesson.title,
      duration: newLesson.duration_minutes ? `${newLesson.duration_minutes} min` : '0 min',
      order: newLesson.order_index,
      description: newLesson.description || '',
      video_url: newLesson.video_url || '',
    }].sort((a, b) => a.order - b.order));
    fetchCourseData(); // Refresh summary stats
  };

  const handleEditLesson = (updatedLesson: Lesson) => {
    setLessons(lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l).sort((a, b) => a.order - b.order));
  };

  if (loading && !course) {
    return (
      <RouteGuard allowedRoles={['admin']}>
      <DashboardLayout role="admin" userName="Admin User" userRole="Administrator">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
      </RouteGuard>
    );
  }

  if (error && !course) {
    return (
      <RouteGuard allowedRoles={['admin']}>
      <DashboardLayout role="admin" userName="Admin User" userRole="Administrator">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Course</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </DashboardLayout>
      </RouteGuard>
    );
  }

  if (!course) return null;

  return (
    <RouteGuard allowedRoles={['admin']}>
    <DashboardLayout role="admin" userName="Admin User" userRole="Administrator">
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                <Badge variant={course.status === 'Active' ? 'default' : 'secondary'}>
                  {course.status}
                </Badge>
              </div>
              <p className="text-gray-600">Instructor: {course.instructor}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCourse(true)}
                  >
                    <Edit className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit course</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingCourse(true)}
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
        </div>

        {/* Course Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-blue-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold">{course.totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Lessons</p>
                  <p className="text-2xl font-bold">{course.totalLessons}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-2xl font-bold">{course.duration}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Calendar className="h-6 w-6 text-orange-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-2xl font-bold">{course.created}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Description */}
        <Card>
          <CardHeader>
            <CardTitle>Course Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{course.description}</p>
            <div className="mt-4 flex gap-4">
              <Badge variant="outline">{course.category}</Badge>
              <Badge variant="outline">Beginner Level</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Course Content (Lessons) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Course Content ({lessons.length} Lessons)</CardTitle>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setAddingLesson(true)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Lesson
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Lesson Title</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.map((lesson) => (
                  <TableRow key={lesson.id}>
                    <TableCell className="font-medium">{lesson.order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        {lesson.title}
                      </div>
                    </TableCell>
                    <TableCell>{lesson.duration}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingLesson(lesson)}
                              >
                                <Edit className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit lesson</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingLesson(lesson)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" aria-hidden="true" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete lesson</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Enrolled Students */}
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Students ({students.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrolled Date</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.enrolledDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${student.progress}%` }}
                            role="progressbar"
                            aria-valuenow={student.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${student.progress}% progress`}
                          />
                        </div>
                        <span className="text-sm">{student.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status === 'Active' ? 'default' : 'secondary'}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.location.href = `/admin/users/${student.id}`}
                            >
                              <Users className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View student details</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Course Dialog */}
      {editingCourse && (
        <EditCourseDialog
          course={course as any}
          open={editingCourse}
          onOpenChange={setEditingCourse}
          onSave={(updatedCourse) => {
            fetchCourseData();
            console.log('Course updated:', updatedCourse);
          }}
        />
      )}

      {/* Delete Course Confirmation */}
      <DeleteConfirmDialog
        open={deletingCourse}
        onOpenChange={setDeletingCourse}
        onConfirm={handleDeleteCourse}
        title="Delete Course"
        description={`Are you sure you want to delete "${course.title}"? This action cannot be undone and will remove all lessons and unenroll ${course.totalStudents} students.`}
      />

      {/* Delete Lesson Confirmation */}
      {deletingLesson && (
        <DeleteConfirmDialog
          open={!!deletingLesson}
          onOpenChange={(open) => !open && setDeletingLesson(null)}
          onConfirm={() => handleDeleteLesson(deletingLesson.id)}
          title="Delete Lesson"
          description={`Are you sure you want to delete "${deletingLesson.title}"? This action cannot be undone.`}
        />
      )}

      {/* Add Lesson Dialog */}
      <AddLessonDialog
        courseId={course.id}
        open={addingLesson}
        onOpenChange={setAddingLesson}
        onAdd={handleAddLesson}
        nextOrder={lessons.length + 1}
      />

      {/* Edit Lesson Dialog */}
      <EditLessonDialog
        lesson={editingLesson}
        open={!!editingLesson}
        onOpenChange={(open) => !open && setEditingLesson(null)}
        onSave={handleEditLesson}
      />
    </DashboardLayout>
    </RouteGuard>
  );
}
