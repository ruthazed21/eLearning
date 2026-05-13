'use client';

import { useState, useEffect } from 'react';
import { auditAPI } from '@/lib/api';
import { RouteGuard } from '@/lib/route-guard';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { useCommonShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Search,
  Filter,
  Download,
  User,
  Shield,
  LogIn,
  LogOut,
  UserPlus,
  Edit,
  Trash2,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  userRole: string;
  action: string;
  entityType: string;
  details: string;
  ipAddress: string;
}

interface AuditStats {
  totalLogs: number;
  uniqueUsers: number;
  uniqueActions: number;
  adminActions: number;
}

export default function AdminAuditLogPage() {
  useCommonShortcuts('admin');
  const { user } = useAuth();

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<AuditStats>({
    totalLogs: 0,
    uniqueUsers: 0,
    uniqueActions: 0,
    adminActions: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetchAuditData();
  }, [filterAction, filterEntityType, startDate, endDate]);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      setError('');

      const params: any = {};
      if (filterAction !== 'all') params.action = filterAction;
      if (filterEntityType !== 'all') params.entityType = filterEntityType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Build stats params - only include dates if they have values
      const statsParams: any = {};
      if (startDate) statsParams.startDate = startDate;
      if (endDate) statsParams.endDate = endDate;

      const [logsData, statsData] = await Promise.all([
        auditAPI.getAll(params),
        auditAPI.getStats(Object.keys(statsParams).length > 0 ? statsParams : undefined),
      ]);

      const logs = Array.isArray(logsData) ? logsData : [];
      const mapped: AuditLog[] = logs.map((log: any) => ({
        id: log.id,
        timestamp: new Date(log.created_at).toLocaleString(),
        user: log.full_name || log.email || 'System',
        userRole: log.role
          ? log.role.charAt(0).toUpperCase() + log.role.slice(1)
          : 'System',
        action: log.action,
        entityType: log.entity_type || 'system',
        details: typeof log.details === 'object'
          ? JSON.stringify(log.details)
          : (log.details || ''),
        ipAddress: log.ip_address || 'N/A',
      }));

      setAuditLogs(mapped);

      // statsData is an array of rows grouped by action
      // Each row has: total_logs, unique_users, unique_actions, action, action_count
      const stats = Array.isArray(statsData) ? statsData : [];
      if (stats && stats.length > 0) {
        const totalLogs = parseInt((stats[0] as any).total_logs) || 0;
        const uniqueUsers = parseInt((stats[0] as any).unique_users) || 0;
        const uniqueActions = parseInt((stats[0] as any).unique_actions) || 0;
        const adminActions = mapped.filter(l => l.userRole === 'Admin').length;
        setStats({ totalLogs, uniqueUsers, uniqueActions, adminActions });
      } else {
        setStats({ totalLogs: 0, uniqueUsers: 0, uniqueActions: 0, adminActions: 0 });
      }
    } catch (err: any) {
      console.error('Failed to fetch audit data:', err);
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Client-side search filter (applied on top of server-side filters)
  const filteredLogs = auditLogs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.user.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q)
    );
  });

  const getActionIcon = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('login')) return <LogIn className="h-4 w-4" aria-hidden="true" />;
    if (a.includes('logout')) return <LogOut className="h-4 w-4" aria-hidden="true" />;
    if (a.includes('create') || a.includes('register') || a.includes('approve'))
      return <UserPlus className="h-4 w-4" aria-hidden="true" />;
    if (a.includes('update') || a.includes('edit'))
      return <Edit className="h-4 w-4" aria-hidden="true" />;
    if (a.includes('delete') || a.includes('reject'))
      return <Trash2 className="h-4 w-4" aria-hidden="true" />;
    return <FileText className="h-4 w-4" aria-hidden="true" />;
  };

  const handleExport = () => {
    const csvContent =
      'Timestamp,User,Role,Action,Entity Type,Details,IP\n' +
      filteredLogs
        .map(
          log =>
            `"${log.timestamp}","${log.user}","${log.userRole}","${log.action}","${log.entityType}","${log.details}","${log.ipAddress}"`
        )
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute(
      'download',
      `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <RouteGuard allowedRoles={['admin']}>
      <DashboardLayout
        role="admin"
        userName={user?.full_name || 'Admin User'}
        userRole="Administrator"
      >
        <div className="space-y-6">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
              {error}
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
              <p className="text-gray-600 mt-1">
                Track all system activities and user actions
              </p>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export Logs
            </Button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-700" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Logs</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-logs">
                      {stats.totalLogs}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <User className="h-6 w-6 text-green-700" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unique Users</p>
                    <p className="text-2xl font-bold" data-testid="stat-unique-users">
                      {stats.uniqueUsers}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Shield className="h-6 w-6 text-purple-700" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unique Actions</p>
                    <p className="text-2xl font-bold" data-testid="stat-unique-actions">
                      {stats.uniqueActions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Shield className="h-6 w-6 text-orange-700" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Admin Actions</p>
                    <p className="text-2xl font-bold" data-testid="stat-admin-actions">
                      {stats.adminActions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                {/* Search + dropdowns row */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                      aria-hidden="true"
                    />
                    <Input
                      type="search"
                      placeholder="Search by user, action, or details..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      aria-label="Search audit logs"
                    />
                  </div>

                  <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger className="w-[180px]" aria-label="Filter by action">
                      <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="LOGIN">Login</SelectItem>
                      <SelectItem value="REGISTER">Register</SelectItem>
                      <SelectItem value="CREATE_USER">Create User</SelectItem>
                      <SelectItem value="UPDATE_USER">Update User</SelectItem>
                      <SelectItem value="DELETE_USER">Delete User</SelectItem>
                      <SelectItem value="CREATE_COURSE">Create Course</SelectItem>
                      <SelectItem value="UPDATE_COURSE">Update Course</SelectItem>
                      <SelectItem value="DELETE_COURSE">Delete Course</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                    <SelectTrigger className="w-[180px]" aria-label="Filter by entity type">
                      <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                      <SelectValue placeholder="Entity Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Entity Types</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="lesson">Lesson</SelectItem>
                      <SelectItem value="enrollment">Enrollment</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range row */}
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    <span className="text-sm text-gray-600 whitespace-nowrap">Date range:</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="start-date" className="text-xs text-gray-500">
                      From
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      className="w-[160px]"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      aria-label="Start date"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="end-date" className="text-xs text-gray-500">
                      To
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      className="w-[160px]"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      aria-label="End date"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                      }}
                    >
                      Clear dates
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail ({filteredLogs.length} entries)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-label="Loading" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No audit logs found matching your criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {log.timestamp}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            <div>
                              <p className="font-medium text-sm">{log.user}</p>
                              <p className="text-xs text-gray-600">{log.userRole}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span className="text-sm">{log.action}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {log.entityType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm truncate" title={log.details}>
                            {log.details}
                          </p>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-600">
                          {log.ipAddress}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-700" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Audit Trail Information
                  </h3>
                  <p className="text-sm text-blue-800">
                    All user actions and system events are logged for security and compliance
                    purposes. Logs are retained for 90 days and can be exported for external
                    analysis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
