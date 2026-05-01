'use client';

import { useState, useEffect } from 'react';
import { feedbackAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { useCommonShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { RouteGuard } from '@/lib/route-guard';
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
import { Textarea } from '@/components/ui/textarea';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  User,
  Loader2,
  Trash2,
} from 'lucide-react';

interface Feedback {
  id: number;
  user: string;
  userRole: string;
  subject: string;
  message: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  submittedDate: string;
  adminResponse?: string;
}

function mapApiToFeedback(f: any): Feedback {
  const statusMap: Record<string, Feedback['status']> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  const priorityMap: Record<string, Feedback['priority']> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'High',
  };
  return {
    id: f.id,
    user: f.full_name || f.email || 'Unknown',
    userRole: f.role ? f.role.charAt(0).toUpperCase() + f.role.slice(1) : 'Student',
    subject: f.subject,
    message: f.message,
    category: f.category,
    priority: priorityMap[(f.priority || 'medium').toLowerCase()] ?? 'Medium',
    status: statusMap[(f.status || 'open').toLowerCase()] ?? 'Open',
    submittedDate: new Date(f.created_at).toISOString().split('T')[0],
    adminResponse: f.admin_response,
  };
}

export default function AdminFeedbackPage() {
  useCommonShortcuts('admin');
  const { user } = useAuth();

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Dialog state
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);
  const [response, setResponse] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await feedbackAPI.getAll();
      setFeedbacks(data.map(mapApiToFeedback));
    } catch (err: any) {
      console.error('Failed to fetch feedback:', err);
      setError(err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  // Apply client-side filters
  const filteredFeedbacks = feedbacks.filter((f) => {
    const statusMatch =
      statusFilter === 'all' ||
      f.status.toLowerCase().replace(' ', '_') === statusFilter;
    const priorityMatch =
      priorityFilter === 'all' || f.priority.toLowerCase() === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const handleViewFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setViewDialogOpen(true);
    setResponse(feedback.adminResponse || '');
  };

  const handleStatusChange = async (feedbackId: number, newStatus: Feedback['status']) => {
    const apiStatus = newStatus.toLowerCase().replace(' ', '_');
    try {
      await feedbackAPI.updateStatus(feedbackId, apiStatus);
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, status: newStatus } : f))
      );
      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback((prev) => prev ? { ...prev, status: newStatus } : prev);
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setError('Failed to update status');
    }
  };

  const handleSendResponse = async () => {
    if (!selectedFeedback) return;
    try {
      setIsSending(true);
      const apiStatus = selectedFeedback.status.toLowerCase().replace(' ', '_');
      await feedbackAPI.updateStatus(selectedFeedback.id, apiStatus, response);
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === selectedFeedback.id ? { ...f, adminResponse: response } : f
        )
      );
      setViewDialogOpen(false);
      setResponse('');
    } catch (err: any) {
      console.error('Failed to send response:', err);
      setError('Failed to send response');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteClick = (feedback: Feedback) => {
    setFeedbackToDelete(feedback);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!feedbackToDelete) return;
    try {
      setDeletingId(feedbackToDelete.id);
      await feedbackAPI.delete(feedbackToDelete.id);
      setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackToDelete.id));
      setDeleteDialogOpen(false);
      setFeedbackToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete feedback:', err);
      setError('Failed to delete feedback');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Open</Badge>;
      case 'In Progress':
        return <Badge className="bg-blue-600">In Progress</Badge>;
      case 'Resolved':
        return <Badge className="bg-green-600">Resolved</Badge>;
      case 'Closed':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <Badge variant="destructive">High</Badge>;
      case 'Medium':
        return <Badge className="bg-yellow-600">Medium</Badge>;
      case 'Low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const stats = {
    total: feedbacks.length,
    open: feedbacks.filter((f) => f.status === 'Open').length,
    inProgress: feedbacks.filter((f) => f.status === 'In Progress').length,
    resolved: feedbacks.filter((f) => f.status === 'Resolved').length,
  };

  return (
    <RouteGuard allowedRoles={['admin']}>
    <DashboardLayout role="admin" userName={user?.full_name || 'Admin User'} userRole="Administrator">
      <div className="space-y-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback Management</h1>
          <p className="text-gray-600 mt-1">Review and respond to user feedback</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Feedback</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
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
                  <p className="text-sm text-gray-600">Open</p>
                  <p className="text-2xl font-bold">{stats.open}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-blue-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
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
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">Status:</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter" className="w-40" aria-label="Status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="priority-filter" className="text-sm font-medium text-gray-700">Priority:</label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger id="priority-filter" className="w-40" aria-label="Priority">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Feedback Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {statusFilter === 'all' && priorityFilter === 'all'
                ? `All Feedback (${feedbacks.length})`
                : `Filtered Feedback (${filteredFeedbacks.length} of ${feedbacks.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredFeedbacks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {feedbacks.length === 0
                  ? 'No feedback received yet.'
                  : 'No feedback matches the selected filters.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedbacks.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" aria-hidden="true" />
                          <div>
                            <p className="font-medium">{feedback.user}</p>
                            <p className="text-xs text-gray-600">{feedback.userRole}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{feedback.subject}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{feedback.category}</Badge>
                      </TableCell>
                      <TableCell>{getPriorityBadge(feedback.priority)}</TableCell>
                      <TableCell>{getStatusBadge(feedback.status)}</TableCell>
                      <TableCell>{feedback.submittedDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  aria-label="View details"
                                  onClick={() => handleViewFeedback(feedback)}
                                >
                                  <Eye className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View details</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {feedback.status !== 'Resolved' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    aria-label="Mark as resolved"
                                    onClick={() => handleStatusChange(feedback.id, 'Resolved')}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Mark as resolved</p>
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
                                  aria-label="Delete feedback"
                                  onClick={() => handleDeleteClick(feedback)}
                                  className="text-red-600 hover:text-red-700"
                                  disabled={deletingId === feedback.id}
                                >
                                  {deletingId === feedback.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete feedback</p>
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

      {/* View / Respond Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>Review and respond to user feedback</DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">User</p>
                  <p className="font-medium">
                    {selectedFeedback.user} ({selectedFeedback.userRole})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">{selectedFeedback.submittedDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <Badge variant="outline">{selectedFeedback.category}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Priority</p>
                  {getPriorityBadge(selectedFeedback.priority)}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Subject</p>
                <p className="font-medium">{selectedFeedback.subject}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Message</p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm">{selectedFeedback.message}</p>
                </div>
              </div>

              {selectedFeedback.adminResponse && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Previous Response</p>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm">{selectedFeedback.adminResponse}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 mb-1">Update Status</p>
                <div className="flex gap-2 flex-wrap">
                  {(['Open', 'In Progress', 'Resolved', 'Closed'] as const).map((s) => (
                    <Button
                      key={s}
                      variant={selectedFeedback.status === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        handleStatusChange(selectedFeedback.id, s);
                        setSelectedFeedback({ ...selectedFeedback, status: s });
                      }}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">
                  {selectedFeedback.adminResponse ? 'Update Response' : 'Send Response (Optional)'}
                </p>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response to the user..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSendResponse} disabled={!response || isSending}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSending ? 'Saving...' : 'Save Response'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Feedback</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feedback? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {feedbackToDelete && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-sm">{feedbackToDelete.subject}</p>
              <p className="text-xs text-gray-600 mt-1">From: {feedbackToDelete.user}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setFeedbackToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletingId !== null}
            >
              {deletingId !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </RouteGuard>
  );
}
