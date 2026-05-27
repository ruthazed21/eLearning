'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { coursesAPI, getStoredUser } from '@/lib/api';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, Users, FileText, Edit, Search, Loader2, Trash2, Eye, Upload } from 'lucide-react';
import { AddCourseDialog } from '@/components/dialogs/add-course-dialog';
import { EditCourseDialog } from '@/components/dialogs/edit-course-dialog';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { RouteGuard } from '@/lib/route-guard';
import { toast } from 'sonner';

interface Course {
  id: number;
  title: string;
  instructor: string;
  students?: number;
  totalStudents: number;
  lessons?: number;
  totalLessons: number;
  duration: string;
  category: string;
  status: string;
  created: string;
  description: string;
}

function mapApiCourse(c: any): Course {
  return {
    id: c.id,
    title: c.title,
    instructor: c.teacher_name,
    students: c.enrollment_count || 0,
    totalStudents: c.enrollment_count || 0,
    lessons: c.lessons_count || 0,
    totalLessons: c.lessons_count || 0,
    duration: c.duration || '',
    category: c.category,
    created: c.created_at,
    status: c.status,
    description: c.description,
  };
}

export default function TeacherCoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [publishingCourse, setPublishingCourse] = useState<number | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    setUser(storedUser);
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await coursesAPI.getTeacherCourses();
      setCourses(data.map(mapApiCourse));
    } catch (err: any) {
      console.error('Failed to fetch courses:', err);
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishCourse = async (courseId: number) => {
    setPublishingCourse(courseId);
    try {
      await coursesAPI.update(courseId, { status: 'published' });
      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, status: 'published' } : c
      ));
      toast.success('Course published', { description: 'Your course is now live and visible to students.' });
    } catch (err: any) {
      console.error('Failed to publish course:', err);
      toast.error('Error', { description: err.message || 'Failed to publish course' });
    } finally {
      setPublishingCourse(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCourse) return;
    setDeleteLoading(true);
    try {
      await coursesAPI.delete(deletingCourse.id);
      setCourses(prev => prev.filter(c => c.id !== deletingCourse.id));
      toast.success('Course deleted', { description: `"${deletingCourse.title}" has been deleted.` });
      setDeletingCourse(null);
    } catch (err: any) {
      console.error('Failed to delete course:', err);
      toast.error('Error', { description: err.message || 'Failed to delete course' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditSave = (updatedCourse: any) => {
    // EditCourseDialog already calls coursesAPI.update() internally and returns the API response
    setCourses(prev => prev.map(c => {
      if (c.id !== updatedCourse.id) return c;
      return {
        ...c,
        title: updatedCourse.title ?? c.title,
        description: updatedCourse.description ?? c.description,
        status: updatedCourse.status ?? c.status,
      };
    }));
    toast.success('Course updated', { description: 'Your changes have been saved.' });
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault();
            router.push('/teacher/dashboard');
            break;
          case 'u':
            e.preventDefault();
            router.push('/teacher/upload');
            break;
          case 'a':
            e.preventDefault();
            router.push('/teacher/accessibility');
            break;
          case 'n':
            e.preventDefault();
            document.querySelector<HTMLButtonElement>('button[aria-label*="Add new course"]')?.click();
            break;
        }
      }

      // Number shortcuts for quick course edit (1-4)
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && ['1', '2', '3', '4'].includes(e.key)) {
        const courseIndex = parseInt(e.key) - 1;
        if (courseIndex < courses.length) {
          e.preventDefault();
          setEditingCourse(courses[courseIndex]);
        }
      }

      // P for publish first draft course
      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.altKey) {
        const firstDraftCourse = courses.find(c => c.status === 'draft');
        if (firstDraftCourse) {
          e.preventDefault();
          handlePublishCourse(firstDraftCourse.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, courses]);

  const keyboardShortcuts = [
    { keys: ['Ctrl', 'H'], description: 'Go to Dashboard' },
    { keys: ['Ctrl', 'U'], description: 'Go to Upload' },
    { keys: ['Ctrl', 'A'], description: 'Go to Accessibility' },
    { keys: ['Ctrl', 'N'], description: 'Add new course' },
    { keys: ['1-4'], description: 'Edit course (quick access)' },
    { keys: ['P'], description: 'Publish first draft course' },
  ];

  return (
    <RouteGuard allowedRoles={['teacher']} requireTeacherApproval>
    <DashboardLayout role="teacher" userName={user?.fullName || "Teacher"} userRole="Teacher">
      <KeyboardShortcutsHelp shortcuts={keyboardShortcuts} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
            <p className="text-gray-600 mt-1">Manage and edit your courses</p>
          </div>
          <AddCourseDialog
            onSuccess={fetchCourses}
            onCourseCreated={(created) => {
              setCourses(prev => [mapApiCourse(created), ...prev]);
            }}
          />
        </div>

        {/* Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by course name or category..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
              {searchQuery ? 'No courses match your search.' : 'No courses found. Start by creating your first course.'}
            </div>
          ) : (
            filteredCourses.map((course) => (
              <Card key={course.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={
                      course.status === 'published' ? 'default' : 
                      course.status === 'draft' ? 'secondary' : 
                      'outline'
                    }>
                      {course.status}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCourse(course)}
                        aria-label={`Edit ${course.title}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingCourse(course)}
                        aria-label={`Delete ${course.title}`}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {course.description}
                  </p>
                  {course.status === 'draft' && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-xs text-yellow-700">
                        📝 This course is in draft mode. Publish it to make it visible to students.
                      </p>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-700 mx-auto mb-1" aria-hidden="true" />
                      <p className="text-2xl font-bold text-blue-700">{course.students}</p>
                      <p className="text-xs text-gray-600">Students</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <FileText className="h-5 w-5 text-green-700 mx-auto mb-1" aria-hidden="true" />
                      <p className="text-2xl font-bold text-green-700">{course.lessons}</p>
                      <p className="text-xs text-gray-600">Lessons</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <BookOpen className="h-5 w-5 text-purple-700 mx-auto mb-1" aria-hidden="true" />
                      <p className="text-2xl font-bold text-purple-700">{course.category || '—'}</p>
                      <p className="text-xs text-gray-600">Category</p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-2">
                  {course.status === 'draft' ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEditingCourse(course)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Course
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handlePublishCourse(course.id)}
                        disabled={publishingCourse === course.id}
                      >
                        {publishingCourse === course.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {publishingCourse === course.id ? 'Publishing...' : 'Publish Course'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEditingCourse(course)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Course
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => router.push(`/teacher/courses/${course.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <EditCourseDialog
        course={editingCourse}
        open={!!editingCourse}
        onOpenChange={(open) => !open && setEditingCourse(null)}
        onSave={handleEditSave}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={!!deletingCourse}
        onOpenChange={(open) => !open && setDeletingCourse(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Course"
        description={`Are you sure you want to delete "${deletingCourse?.title}"? This action cannot be undone and will remove all associated lessons and enrollments.`}
      />
    </DashboardLayout>
    </RouteGuard>
  );
}
