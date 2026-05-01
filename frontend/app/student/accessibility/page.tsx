'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { RouteGuard } from '@/lib/route-guard';
import { useAuth } from '@/lib/auth-context';
import { feedbackAPI, coursesAPI, lessonsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCommonShortcuts } from '@/hooks/use-keyboard-shortcuts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Accessibility,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  XCircle,
} from 'lucide-react';

interface AccessibilityReport {
  id: number;
  category: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  admin_response?: string;
}

interface Course {
  id: number;
  title: string;
}

interface Lesson {
  id: number;
  title: string;
  course_id: number;
}

export default function StudentAccessibilityPage() {
  useCommonShortcuts('student');
  const { user } = useAuth();

  const [reports, setReports] = useState<AccessibilityReport[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Form state
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [issueType, setIssueType] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchReports(user.id);
      fetchCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedCourse) {
      fetchLessons(parseInt(selectedCourse));
    } else {
      setLessons([]);
      setSelectedLesson('');
    }
  }, [selectedCourse]);

  const fetchReports = async (userId: number) => {
    try {
      setLoading(true);
      setError('');
      const data = await feedbackAPI.getByUser(userId);
      // Filter for accessibility-related feedback
      const accessibilityReports = data.filter(
        (item: any) => item.category === 'accessibility'
      );
      setReports(accessibilityReports);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setError(err.message || 'Failed to load accessibility reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await coursesAPI.getAll();
      setCourses(data);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  const fetchLessons = async (courseId: number) => {
    try {
      const data = await lessonsAPI.getByCourse(courseId);
      setLessons(data);
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedCourse || !selectedLesson || !issueType || !description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const courseName = courses.find((c) => c.id === parseInt(selectedCourse))?.title || 'Unknown';
      const lessonName = lessons.find((l) => l.id === parseInt(selectedLesson))?.title || 'Unknown';

      const subject = `${issueType} - ${courseName}: ${lessonName}`;

      await feedbackAPI.create({
        category: 'accessibility',
        subject,
        message: description,
        priority,
      });

      setSuccess('Accessibility report submitted successfully!');
      setShowReportDialog(false);
      resetForm();
      if (user?.id) fetchReports(user.id);

      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Failed to submit report:', err);
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCourse('');
    setSelectedLesson('');
    setIssueType('');
    setPriority('medium');
    setDescription('');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      open: { color: 'bg-blue-600', icon: Clock },
      in_progress: { color: 'bg-yellow-600', icon: AlertCircle },
      resolved: { color: 'bg-green-600', icon: CheckCircle },
      closed: { color: 'bg-gray-600', icon: XCircle },
    };

    const variant = variants[status] || variants.open;
    const Icon = variant.icon;

    return (
      <Badge className={variant.color}>
        <Icon className="h-3 w-3 mr-1" aria-hidden="true" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-600',
      medium: 'bg-blue-600',
      high: 'bg-orange-600',
      critical: 'bg-red-600',
    };

    return <Badge className={colors[priority] || colors.medium}>{priority}</Badge>;
  };

  return (
    <RouteGuard allowedRoles={['student']}>
      <DashboardLayout role="student" userName={user?.full_name || 'Student'} userRole="Student">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Accessibility Support</h1>
              <p className="text-gray-600 mt-1">Report accessibility issues with course materials</p>
            </div>
            <Button onClick={() => setShowReportDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Report Issue
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">{success}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <MessageSquare className="h-6 w-6 text-blue-700" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Reports</p>
                        <p className="text-2xl font-bold">{reports.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-yellow-100 p-3 rounded-lg">
                        <Clock className="h-6 w-6 text-yellow-700" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pending</p>
                        <p className="text-2xl font-bold">
                          {reports.filter((r) => r.status === 'open' || r.status === 'in_progress').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-700" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Resolved</p>
                        <p className="text-2xl font-bold">
                          {reports.filter((r) => r.status === 'resolved').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-red-100 p-3 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-red-700" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">High Priority</p>
                        <p className="text-2xl font-bold">
                          {reports.filter((r) => r.priority === 'high' || r.priority === 'critical').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Reports Table */}
              <Card>
                <CardHeader>
                  <CardTitle>My Accessibility Reports ({reports.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {reports.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Accessibility className="h-12 w-12 mx-auto mb-4 text-gray-400" aria-hidden="true" />
                      <p>No accessibility reports yet.</p>
                      <p className="text-sm mt-2">Click "Report Issue" to submit your first report.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Issue</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Response</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{report.subject}</p>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{report.message}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getPriorityBadge(report.priority)}</TableCell>
                            <TableCell>{getStatusBadge(report.status)}</TableCell>
                            <TableCell>
                              {new Date(report.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </TableCell>
                            <TableCell>
                              {report.admin_response ? (
                                <p className="text-sm text-gray-700 line-clamp-2">{report.admin_response}</p>
                              ) : (
                                <span className="text-sm text-gray-400">No response yet</span>
                              )}
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

          {/* Common Accessibility Issues Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Common Accessibility Issues to Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-medium text-blue-900">Missing Captions or Transcripts</p>
                  <p className="text-sm text-blue-800">Videos without captions or text alternatives</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-medium text-blue-900">Poor Audio Quality</p>
                  <p className="text-sm text-blue-800">Audio that is unclear or difficult to hear</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-medium text-blue-900">Unclear Instructions</p>
                  <p className="text-sm text-blue-800">Lesson descriptions that are missing or confusing</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-medium text-blue-900">Visual Content Issues</p>
                  <p className="text-sm text-blue-800">Images or diagrams without text descriptions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Issue Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Report Accessibility Issue</DialogTitle>
              <DialogDescription>
                Help us improve course accessibility by reporting issues you encounter
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesson">Lesson *</Label>
                <Select
                  value={selectedLesson}
                  onValueChange={setSelectedLesson}
                  disabled={!selectedCourse}
                >
                  <SelectTrigger id="lesson">
                    <SelectValue placeholder={selectedCourse ? 'Select a lesson' : 'Select a course first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {lessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id.toString()}>
                        {lesson.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issueType">Issue Type *</Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger id="issueType">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Missing Captions">Missing Captions</SelectItem>
                    <SelectItem value="Missing Transcript">Missing Transcript</SelectItem>
                    <SelectItem value="Poor Audio Quality">Poor Audio Quality</SelectItem>
                    <SelectItem value="Missing Description">Missing Description</SelectItem>
                    <SelectItem value="Unclear Instructions">Unclear Instructions</SelectItem>
                    <SelectItem value="Visual Content Issue">Visual Content Issue</SelectItem>
                    <SelectItem value="Navigation Issue">Navigation Issue</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                    <SelectItem value="medium">Medium - Affects learning experience</SelectItem>
                    <SelectItem value="high">High - Significantly impacts learning</SelectItem>
                    <SelectItem value="critical">Critical - Cannot access content</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe the accessibility issue in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-sm text-gray-500">
                  Include specific details about what makes the content inaccessible
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReportDialog(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitReport} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </RouteGuard>
  );
}
