'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RouteGuard } from '@/lib/route-guard';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { CourseCard } from '@/components/course-card';
import { Input } from '@/components/ui/input';
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { coursesAPI, enrollmentsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Search, Loader2, AlertCircle, BookOpen } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CoursesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<number[]>([]);

  const userId = user?.id ?? null;

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all published courses and student's enrollments in parallel
      const [allCourses, studentEnrollments] = await Promise.all([
        coursesAPI.getAll(),
        userId ? enrollmentsAPI.getByStudent(userId) : Promise.resolve([]),
      ]);

      setCourses(allCourses as any);
      setMyEnrollments((studentEnrollments as any).map((e: any) => e.course_id));
    } catch (err: any) {
      console.error('Failed to fetch courses:', err);
      setError(err.message || 'Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Extract unique categories from courses
  const categories = Array.from(
    new Set(courses.map((c) => c.category).filter(Boolean))
  ) as string[];

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.teacher_name &&
        course.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'all' || course.category === categoryFilter;

    const matchesDifficulty =
      difficultyFilter === 'all' || course.difficulty_level === difficultyFilter;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault();
            router.push('/student/dashboard');
            break;
          case 'p':
            e.preventDefault();
            router.push('/student/progress');
            break;
          case 'q':
            e.preventDefault();
            router.push('/student/quiz');
            break;
          case 'f':
            e.preventDefault();
            document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
            break;
        }
      }

      if (!e.ctrlKey && !e.altKey && !e.shiftKey && /^[1-9]$/.test(e.key)) {
        const courseIndex = parseInt(e.key) - 1;
        if (courseIndex < filteredCourses.length) {
          e.preventDefault();
          router.push(`/student/course/${filteredCourses[courseIndex].id}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, filteredCourses]);

  const keyboardShortcuts = [
    { keys: ['Ctrl', 'H'], description: 'Go to Dashboard' },
    { keys: ['Ctrl', 'P'], description: 'Go to Progress' },
    { keys: ['Ctrl', 'Q'], description: 'Go to Quiz' },
    { keys: ['Ctrl', 'F'], description: 'Focus search' },
    { keys: ['1-9'], description: 'Open course (quick access)' },
  ];

  return (
    <RouteGuard allowedRoles={['student']}>
      <DashboardLayout role="student" userName={user?.full_name || 'Student'} userRole="Student">
        <KeyboardShortcutsHelp shortcuts={keyboardShortcuts} />
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">All Courses</h1>
            <p className="text-lg text-gray-500">Explore and enroll in available courses</p>
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
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    placeholder="Search courses..."
                    className="pl-10 h-11"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search courses"
                  />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter} aria-label="Filter by category">
                  <SelectTrigger className="w-full sm:w-48 h-11" aria-label="Filter by category">
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

                <Select value={difficultyFilter} onValueChange={setDifficultyFilter} aria-label="Filter by difficulty">
                  <SelectTrigger className="w-full sm:w-48 h-11" aria-label="Filter by difficulty">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Courses Grid */}
              <section aria-label="Available courses">
                {filteredCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => {
                      const isEnrolled = myEnrollments.includes(course.id);
                      return (
                        <div key={course.id} className="relative">
                          {isEnrolled && (
                            <span
                              className="absolute top-3 right-3 z-10 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full"
                              data-testid="enrolled-badge"
                            >
                              Enrolled
                            </span>
                          )}
                          <CourseCard
                            id={course.id.toString()}
                            title={course.title}
                            instructor={course.teacher_name || 'Instructor'}
                            lessons={course.lessons_count || 0}
                            duration={course.duration || 'Flexible'}
                            enrolled={isEnrolled}
                            onEnrolled={fetchCourses}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No courses found matching your search.</p>
                    <Button
                      variant="link"
                      className="text-blue-600 mt-2"
                      onClick={() => {
                        setSearchQuery('');
                        setCategoryFilter('all');
                        setDifficultyFilter('all');
                      }}
                    >
                      Clear filters and view all
                    </Button>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
