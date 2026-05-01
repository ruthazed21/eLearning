'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { RouteGuard } from '@/lib/route-guard';
import { useAuth } from '@/lib/auth-context';
import { lessonsAPI, coursesAPI, feedbackAPI } from '@/lib/api';
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
  Accessibility,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Video,
  Loader2,
} from 'lucide-react';

interface Material {
  id: number;
  name: string;
  type: 'video' | 'document';
  course: string;
  uploadDate: string;
  hasVideo: boolean;
  hasDescription: boolean;
  accessibilityScore: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  issueType: string;
  issues: {
    critical: number;
    warning: number;
    passed: number;
  };
}

interface AccessibilityReport {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

function scoreMaterial(lesson: any, courseTitle: string, reports: AccessibilityReport[]): Material {
  const hasVideo = !!lesson.video_url;
  const hasDescription = !!(lesson.description && lesson.description.trim().length > 10);
  const hasTitle = !!(lesson.title && lesson.title.trim().length > 3);

  let passed = 0;
  let warning = 0;
  let critical = 0;

  // Check: has title
  if (hasTitle) passed++; else critical++;
  // Check: has description
  if (hasDescription) passed++; else warning++;
  // Check: has video (for video lessons)
  if (hasVideo) passed++; else warning++;
  // Check: duration set
  if (lesson.duration_minutes) passed++; else warning++;

  const total = passed + warning + critical;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Determine priority based on score and critical issues
  let priority: 'low' | 'medium' | 'high' | 'critical';
  if (critical > 0) {
    priority = 'critical';
  } else if (score < 60) {
    priority = 'high';
  } else if (score < 80) {
    priority = 'medium';
  } else {
    priority = 'low';
  }

  // Find related accessibility reports for this lesson
  const lessonReports = reports.filter((report) => {
    const subjectLower = report.subject.toLowerCase();
    const lessonTitleLower = lesson.title.toLowerCase();
    const courseTitleLower = courseTitle.toLowerCase();
    return subjectLower.includes(lessonTitleLower) || 
           (subjectLower.includes(courseTitleLower) && subjectLower.includes(lessonTitleLower));
  });

  // Extract issue type from the most recent report
  let issueType = 'No Issues Reported';
  if (lessonReports.length > 0) {
    const latestReport = lessonReports[0];
    // Extract issue type from subject (format: "Issue Type - Course: Lesson")
    const match = latestReport.subject.match(/^([^-]+)/);
    issueType = match ? match[1].trim() : 'Accessibility Issue';
  }

  return {
    id: lesson.id,
    name: lesson.title,
    type: hasVideo ? 'video' : 'document',
    course: courseTitle,
    uploadDate: lesson.created_at
      ? new Date(lesson.created_at).toISOString().split('T')[0]
      : 'Unknown',
    hasVideo,
    hasDescription,
    accessibilityScore: score,
    priority,
    issueType,
    issues: { critical, warning, passed },
  };
}

export default function TeacherAccessibilityPage() {
  useCommonShortcuts('teacher');
  const { user } = useAuth();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessibilityReports, setAccessibilityReports] = useState<AccessibilityReport[]>([]);

  useEffect(() => {
    if (user?.id) fetchMaterials(user.id);
  }, [user?.id]);

  const fetchMaterials = async (teacherId: number) => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch accessibility reports using teacher-specific endpoint
      let reports: AccessibilityReport[] = [];
      try {
        const teacherFeedback = await feedbackAPI.getTeacherAccessibility();
        reports = teacherFeedback;
        setAccessibilityReports(reports);
      } catch (err) {
        console.error('Failed to fetch accessibility reports:', err);
        // Continue even if reports fail to load
      }

      const courses = await coursesAPI.getAll({ teacherId });
      const allMaterials: Material[] = [];

      await Promise.all(
        courses.map(async (course: any) => {
          try {
            const lessons = await lessonsAPI.getByCourse(course.id);
            lessons.forEach((lesson: any) => {
              allMaterials.push(scoreMaterial(lesson, course.title, reports));
            });
          } catch {
            // skip courses with no lessons
          }
        })
      );

      setMaterials(allMaterials);
    } catch (err: any) {
      console.error('Failed to fetch materials:', err);
      setError(err.message || 'Failed to load course materials');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-600',
      medium: 'bg-blue-600',
      high: 'bg-orange-600',
      critical: 'bg-red-600',
    };

    return <Badge className={colors[priority] || colors.medium}>{priority.toUpperCase()}</Badge>;
  };

  const averageScore =
    materials.length > 0
      ? Math.round(materials.reduce((sum, m) => sum + m.accessibilityScore, 0) / materials.length)
      : 0;

  return (
    <RouteGuard allowedRoles={['teacher']}>
      <DashboardLayout role="teacher" userName={user?.full_name || 'Teacher'} userRole="Teacher">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accessibility Checker</h1>
            <p className="text-gray-600 mt-1">Review accessibility scores for your course materials</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Overall Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Accessibility className="h-6 w-6 text-blue-700" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Average Score</p>
                        <p className="text-2xl font-bold">{averageScore}%</p>
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
                        <p className="text-sm text-gray-600">Fully Accessible</p>
                        <p className="text-2xl font-bold">
                          {materials.filter((m) => m.accessibilityScore >= 80).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-yellow-100 p-3 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-yellow-700" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Needs Review</p>
                        <p className="text-2xl font-bold">
                          {materials.filter((m) => m.accessibilityScore >= 60 && m.accessibilityScore < 80).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-red-100 p-3 rounded-lg">
                        <XCircle className="h-6 w-6 text-red-700" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Critical Issues</p>
                        <p className="text-2xl font-bold">
                          {materials.filter((m) => m.accessibilityScore < 60).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Materials Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Course Materials Accessibility Report ({materials.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {materials.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No lessons found. Upload lessons to see accessibility scores.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lesson Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Upload Date</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Issue Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materials.map((material) => (
                          <TableRow key={material.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {material.type === 'video' ? (
                                  <Video className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                  <FileText className="h-4 w-4" aria-hidden="true" />
                                )}
                                {material.name}
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{material.type}</TableCell>
                            <TableCell>{material.course}</TableCell>
                            <TableCell>{material.uploadDate}</TableCell>
                            <TableCell>{getPriorityBadge(material.priority)}</TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-700">{material.issueType}</span>
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

          {/* Accessibility Guidelines */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Accessibility Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-medium text-blue-900">Videos</p>
                  <p className="text-sm text-blue-800">Include captions, transcripts, and audio descriptions</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-medium text-blue-900">Descriptions</p>
                  <p className="text-sm text-blue-800">Add detailed lesson descriptions so students know what to expect</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-medium text-blue-900">Duration</p>
                  <p className="text-sm text-blue-800">Set accurate duration so students can plan their learning time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
