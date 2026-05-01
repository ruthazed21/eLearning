'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { useCommonShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { coursesAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RouteGuard } from '@/lib/route-guard';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, Edit, Trash2, Eye, Loader2 } from 'lucide-react';
import { AddCourseDialog } from '@/components/dialogs/add-course-dialog';
import { EditCourseDialog } from '@/components/dialogs/edit-course-dialog';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';

interface Course {
  id: number;
  title: string;
  instructor: string;
  students: number;
  lessons: number;
  totalStudents: number;
  totalLessons: number;
  duration: string;
  category: string;
  status: string;
  created: string;
  description: string;
}

function mapApiCourse(c: any): Course {
  const rawStatus = (c.status || 'draft').toLowerCase();
  return {
    id: c.id,
    title: c.title,
    instructor: c.teacher_name || c.instructor || 'Unknown',
    students: c.enrollment_count ?? c.enrolled_count ?? 0,
    lessons: c.lessons_count ?? 0,
    totalStudents: c.enrollment_count ?? c.enrolled_count ?? 0,
    totalLessons: c.lessons_count ?? 0,
    duration: c.duration || '',
    category: c.category || 'Uncategorized',
    status: rawStatus,
    created: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '',
    description: c.description || '',
  };
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Active',
    draft: 'Draft',
    archived: 'Archived',
    published: 'Published',
  };
  return map[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

function statusVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'active' || status === 'published') return 'default';
  if (status === 'archived') return 'outline';
  return 'secondary';
}

export default function AdminCoursesPage() {
  useCommonShortcuts('admin');
  const { user } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await coursesAPI.getAll();
      setCourses(data.map(mapApiCourse));
    } catch (err: any) {
      console.error('Failed to fetch courses:', err);
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // Derive unique categories from loaded courses
  const categories = useMemo(() => {
    const cats = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
    return cats.sort();
  }, [courses]);

  // Client-side filtering for category, status, and search
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesCategory =
        categoryFilter === 'all' || course.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' || course.status === statusFilter;
      const q = debouncedSearch.toLowerCase();
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        course.instructor.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q);
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [courses, categoryFilter, statusFilter, debouncedSearch]);

  // 3.4 - After create: add new course to local state
  const handleCourseCreated = (newCourse: any) => {
    setCourses((prev) => [mapApiCourse(newCourse), ...prev]);
  };

  // 3.5 - After edit: update course in local state
  const handleCourseUpdated = (updatedCourse: any) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === updatedCourse.id ? mapApiCourse(updatedCourse) : c))
    );
    setEditingCourse(null);
  };

  // 3.6 - Delete: remove from local state
  const handleDelete = async () => {
    if (!deletingCourse) return;
    try {
      setDeletingId(deletingCourse.id);
      await coursesAPI.delete(deletingCourse.id);
      setCourses((prev) => prev.filter((c) => c.id !== deletingCourse.id));
      setDeletingCourse(null);
    } catch (err: any) {
      console.error('Failed to delete course:', err);
      setError(err.message || 'Failed to delete course');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <RouteGuard allowedRoles={['admin']}>
    <DashboardLayout role="admin" userName={user?.full_name || 'Admin User'} userRole="Administrator">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Courses</h1>
            <p className="text-gray-600 mt-1">View and manage all platform courses</p>
          </div>
          <AddCourseDialog onCourseCreated={handleCourseCreated} />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder="Search courses by title, instructor, or category..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search courses"
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44 min-w-[11rem]" aria-label="Filter by category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <div className="flex gap-2" role="group" aria-label="Filter by status">
                {(['all', 'active', 'draft', 'archived'] as const).map((s) => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? 'default' : 'outline'}
                    onClick={() => setStatusFilter(s)}
                    aria-pressed={statusFilter === s}
                  >
                    {s === 'all' ? 'All' : statusLabel(s)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading courses...
                </span>
              ) : (
                `All Courses (${filteredCourses.length})`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12" aria-live="polite" aria-busy="true">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-label="Loading courses" />
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-12 text-gray-500" aria-live="polite">
                {courses.length === 0
                  ? 'No courses found. Create your first course.'
                  : 'No courses match the current filters.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Title</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Lessons</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate">{course.title}</div>
                      </TableCell>
                      <TableCell>{course.instructor}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{course.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{course.students}</span>
                          <span className="text-xs text-gray-500">enrolled</span>
                        </div>
                      </TableCell>
                      <TableCell>{course.lessons}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(course.status)}>
                          {statusLabel(course.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{course.created}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    (window.location.href = `/admin/courses/${course.id}`)
                                  }
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
                                  onClick={() => setEditingCourse(course)}
                                  aria-label={`Edit ${course.title}`}
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
                                  onClick={() => setDeletingCourse(course)}
                                  disabled={deletingId === course.id}
                                  aria-label={`Delete ${course.title}`}
                                >
                                  {deletingId === course.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-red-600" aria-hidden="true" />
                                  )}
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
      </div>

      {/* Edit Dialog */}
      <EditCourseDialog
        course={editingCourse}
        open={!!editingCourse}
        onOpenChange={(open) => !open && setEditingCourse(null)}
        onSave={handleCourseUpdated}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingCourse}
        onOpenChange={(open) => !open && setDeletingCourse(null)}
        onConfirm={handleDelete}
        title="Delete Course"
        description={`Are you sure you want to delete "${deletingCourse?.title}"? This action cannot be undone and will affect ${deletingCourse?.students} enrolled students.`}
      />
    </DashboardLayout>
    </RouteGuard>
  );
}
