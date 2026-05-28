'use client';

import { use, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { useCommonShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { RouteGuard } from '@/lib/route-guard';
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
  Settings2, 
  Trash2, 
  BookOpen, 
  Calendar,
  Mail,
  User,
  TrendingUp,
  Clock
} from 'lucide-react';
import { TeacherStatusDialog } from '@/components/dialogs/teacher-status-dialog';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';

interface EnrolledCourse {
  id: number;
  title: string;
  instructor: string;
  enrolledDate: string;
  progress: number;
  status: string;
  lastAccessed: string;
  completedLessons: number;
  totalLessons: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  useCommonShortcuts('admin');
  
  // Unwrap params Promise
  const { id } = use(params);
  
  // Mock user data - in real app, fetch based on id
  const [user, setUser] = useState<User>({
    id: parseInt(id),
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Student',
    status: 'Active',
    joined: '2024-01-20',
  });

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([
    { 
      id: 1, 
      title: 'Introduction to Web Development', 
      instructor: 'Dr. Sarah Johnson',
      enrolledDate: '2024-01-20', 
      progress: 75, 
      status: 'In Progress',
      lastAccessed: '2024-03-10',
      completedLessons: 9,
      totalLessons: 12
    },
    { 
      id: 2, 
      title: 'Data Structures and Algorithms', 
      instructor: 'Prof. Michael Chen',
      enrolledDate: '2024-02-01', 
      progress: 45, 
      status: 'In Progress',
      lastAccessed: '2024-03-09',
      completedLessons: 7,
      totalLessons: 15
    },
    { 
      id: 3, 
      title: 'Digital Marketing Fundamentals', 
      instructor: 'Emily Rodriguez',
      enrolledDate: '2024-02-15', 
      progress: 100, 
      status: 'Completed',
      lastAccessed: '2024-03-05',
      completedLessons: 10,
      totalLessons: 10
    },
  ]);

  // State for dialogs
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const isTeacher = user.role.toLowerCase() === 'teacher';

  // Handlers
  const handleDeleteUser = () => {
    console.log('Deleting user:', user.id);
    // TODO: API call to delete user
    // Redirect to users list after deletion
    window.location.href = '/admin/users';
  };

  // Calculate statistics
  const totalCourses = enrolledCourses.length;
  const completedCourses = enrolledCourses.filter(c => c.status === 'Completed').length;
  const averageProgress = Math.round(
    enrolledCourses.reduce((sum, c) => sum + c.progress, 0) / enrolledCourses.length
  );

  return (
    <RouteGuard allowedRoles={['admin']}>
    <DashboardLayout role="admin" userName="Admin User" userRole="Administrator">
      <div className="space-y-6">
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
                <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
                <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                  {user.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {user.email}
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" aria-hidden="true" />
                  {user.role}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isTeacher && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatusDialogOpen(true)}
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
                    onClick={() => setDeletingUser(true)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete user</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Enrolled Courses</p>
                  <p className="text-2xl font-bold">{totalCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed Courses</p>
                  <p className="text-2xl font-bold">{completedCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Progress</p>
                  <p className="text-2xl font-bold">{averageProgress}%</p>
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
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="text-2xl font-bold">{user.joined}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Full Name</p>
                <p className="text-lg font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Email Address</p>
                <p className="text-lg font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Role</p>
                <Badge variant="outline" className="text-base">{user.role}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Account Status</p>
                <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} className="text-base">
                  {user.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrolled Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Courses ({enrolledCourses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Title</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Enrolled Date</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Last Accessed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolledCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>{course.instructor}</TableCell>
                    <TableCell>{course.enrolledDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${course.progress}%` }}
                            role="progressbar"
                            aria-valuenow={course.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${course.progress}% progress`}
                          />
                        </div>
                        <span className="text-sm">{course.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {course.completedLessons}/{course.totalLessons}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {course.lastAccessed}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={course.status === 'Completed' ? 'default' : 'secondary'}>
                        {course.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <TeacherStatusDialog
        user={user}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onSave={(updatedUser: any) => setUser({ ...user, ...updatedUser, joined: updatedUser.joined || user.joined } as User)}
      />

      {/* Delete User Confirmation */}
      <DeleteConfirmDialog
        open={deletingUser}
        onOpenChange={setDeletingUser}
        onConfirm={handleDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete ${user.name}? This action cannot be undone and will remove all enrollment data and progress for this user.`}
      />
    </DashboardLayout>
    </RouteGuard>
  );
}
