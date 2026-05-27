'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { useCommonShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useAuth } from '@/lib/auth-context';
import { RouteGuard } from '@/lib/route-guard';
import { usersAPI, coursesAPI, systemAPI } from '@/lib/api';
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
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Users, BookOpen, UserCheck, TrendingUp, Edit, Settings2, Trash2 } from 'lucide-react';
import { TeacherStatusDialog } from '@/components/dialogs/teacher-status-dialog';
import { EditCourseDialog } from '@/components/dialogs/edit-course-dialog';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
}

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

export default function AdminDashboard() {
  useCommonShortcuts('admin');
  const { user } = useAuth();

  const [statusUser, setStatusUser] = useState<User | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);

  // Statistics state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    activeStudents: 0,
    platformGrowth: '0%'
  });

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch users and courses in parallel; stats endpoint is optional
      const [usersData, coursesData] = await Promise.all([
        usersAPI.getAll(),
        coursesAPI.getAll()
      ]);

      const users = Array.isArray(usersData) ? usersData : [];
      const courses = Array.isArray(coursesData) ? coursesData : [];

      // Try to get stats from dedicated endpoint, fall back to deriving from data
      let statsData = {
        totalUsers: users.length,
        totalCourses: courses.length,
        activeStudents: users.filter((u: any) => u.role === 'student' && u.approval_status === 'approved').length,
        platformGrowth: '+0%'
      };

      try {
        const statsResponse = await systemAPI.getStats();
        if (statsResponse && typeof statsResponse === 'object') {
          const stats = statsResponse as any;
          statsData = {
            totalUsers: stats.totalUsers ?? statsData.totalUsers,
            totalCourses: stats.totalCourses ?? statsData.totalCourses,
            activeStudents: stats.activeStudents ?? statsData.activeStudents,
            platformGrowth: stats.platformGrowth ?? statsData.platformGrowth
          };
        }
      } catch (statsErr) {
        console.warn('Stats endpoint unavailable, using derived stats:', statsErr);
      }

      setStats(statsData);

      // Set recent users (last 5)
      const sortedUsers = [...users].sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentUsers(sortedUsers.slice(0, 4).map((u: any) => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        role: u.role.charAt(0).toUpperCase() + u.role.slice(1),
        status: u.approval_status === 'approved' ? 'Active' : 'Inactive',
        joined: new Date(u.created_at).toISOString().split('T')[0]
      })));

      // Set recent courses (last 4)
      const sortedCourses = [...courses].sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentCourses(sortedCourses.slice(0, 4).map((c: any) => ({
        id: c.id,
        title: c.title,
        instructor: c.teacher_name || c.instructor || 'Unknown',
        students: parseInt(c.enrollment_count) || c.students || 0,
        totalStudents: parseInt(c.enrollment_count) || c.students || 0,
        lessons: parseInt(c.lessons_count) || 0,
        totalLessons: parseInt(c.lessons_count) || 0,
        duration: c.duration || '',
        category: c.category,
        // Keep raw backend status for API calls; display label derived in render
        status: c.status,
        created: new Date(c.created_at).toISOString().split('T')[0],
        description: c.description
      })));

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (deletingUser) {
      try {
        await usersAPI.delete(deletingUser.id);
        setRecentUsers(recentUsers.filter(u => u.id !== deletingUser.id));
        setDeletingUser(null);
      } catch (err: any) {
        console.error('Failed to delete user:', err);
        setError(err.message || 'Failed to delete user');
      }
    }
  };

  const handleDeleteCourse = async () => {
    if (deletingCourse) {
      try {
        await coursesAPI.delete(deletingCourse.id);
        setRecentCourses(recentCourses.filter(c => c.id !== deletingCourse.id));
        setDeletingCourse(null);
      } catch (err: any) {
        console.error('Failed to delete course:', err);
        setError(err.message || 'Failed to delete course');
      }
    }
  };

  const statsData = [
    { title: 'Total Users', value: stats.totalUsers.toString(), icon: Users, color: 'blue' },
    { title: 'Total Courses', value: stats.totalCourses.toString(), icon: BookOpen, color: 'green' },
    { title: 'Active Students', value: stats.activeStudents.toString(), icon: UserCheck, color: 'purple' },
    { title: 'Platform Growth', value: stats.platformGrowth, icon: TrendingUp, color: 'orange' },
  ];

  return (
    <RouteGuard allowedRoles={['admin']}>
    <DashboardLayout role="admin" userName={user?.full_name || "Admin User"} userRole="Administrator">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System overview and management</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading dashboard data...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  onClick={fetchDashboardData}
                  className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && !error && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsData.map((stat) => {
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
                      <div className="text-3xl font-bold">{stat.value}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                {recentUsers.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No users found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.joined}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {user.role.toLowerCase() === 'teacher' && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setStatusUser(user)}
                                        aria-label={`Change status for ${user.name}`}
                                      >
                                        <Settings2 className="h-4 w-4" aria-hidden="true" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Change teacher status</p>
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
                                      onClick={() => setDeletingUser(user)}
                                      aria-label={`Delete ${user.name}`}
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete user</p>
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

            {/* Recent Courses */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Courses</CardTitle>
              </CardHeader>
              <CardContent>
                {recentCourses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No courses found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Title</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentCourses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">{course.title}</TableCell>
                          <TableCell>{course.instructor}</TableCell>
                          <TableCell>{course.students}</TableCell>
                          <TableCell>
                            <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                              {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                            </Badge>
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
                                      aria-label={`Delete ${course.title}`}
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden="true" />
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
          </>
        )}
      </div>

      <TeacherStatusDialog
        user={statusUser}
        open={!!statusUser}
        onOpenChange={(open) => !open && setStatusUser(null)}
        onSave={(updatedUser) => {
          setRecentUsers(recentUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
          fetchDashboardData();
        }}
      />

      {/* Edit Course Dialog */}
      <EditCourseDialog
        course={editingCourse}
        open={!!editingCourse}
        onOpenChange={(open) => !open && setEditingCourse(null)}
        onSave={(updatedCourse) => {
          setRecentCourses(recentCourses.map(c => c.id === updatedCourse.id ? updatedCourse : c));
          fetchDashboardData(); // Refresh stats
        }}
      />

      {/* Delete User Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete ${deletingUser?.name}? This action cannot be undone.`}
      />

      {/* Delete Course Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingCourse}
        onOpenChange={(open) => !open && setDeletingCourse(null)}
        onConfirm={handleDeleteCourse}
        title="Delete Course"
        description={`Are you sure you want to delete "${deletingCourse?.title}"? This action cannot be undone.`}
      />
    </DashboardLayout>
    </RouteGuard>
  );
}
