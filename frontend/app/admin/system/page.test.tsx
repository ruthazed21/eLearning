/**
 * Tests for Admin System Page - Task 6.7
 * Validates: Requirements US-1.5 (System Monitoring)
 * Properties: P1.5.1, P1.5.2, P1.5.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// jsdom doesn't implement scrollIntoView - needed by Radix UI Select
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/system',
}));

// Mock auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'admin', full_name: 'Admin User' },
    loading: false,
  }),
}));

// Mock keyboard shortcuts
vi.mock('@/hooks/use-keyboard-shortcuts', () => ({
  useCommonShortcuts: vi.fn(),
}));

// Mock RouteGuard to render children directly
vi.mock('@/lib/route-guard', () => ({
  RouteGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock DashboardLayout to render children directly
vi.mock('@/components/dashboard-layout-new', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock auditAPI
vi.mock('@/lib/api', () => ({
  auditAPI: {
    getAll: vi.fn(),
    getStats: vi.fn(),
  },
}));

import { auditAPI } from '@/lib/api';
import AdminAuditLogPage from './page';

const mockLogs = [
  {
    id: 1,
    created_at: '2024-03-01T10:00:00Z',
    full_name: 'Alice Admin',
    email: 'alice@example.com',
    role: 'admin',
    action: 'login',
    entity_type: 'user',
    details: 'Admin login',
    ip_address: '192.168.1.1',
  },
  {
    id: 2,
    created_at: '2024-03-02T11:00:00Z',
    full_name: 'Bob Teacher',
    email: 'bob@example.com',
    role: 'teacher',
    action: 'create_course',
    entity_type: 'course',
    details: 'Created course: Math 101',
    ip_address: '192.168.1.2',
  },
  {
    id: 3,
    created_at: '2024-03-03T12:00:00Z',
    full_name: 'Carol Student',
    email: 'carol@example.com',
    role: 'student',
    action: 'login',
    entity_type: 'user',
    details: 'Student login',
    ip_address: '192.168.1.3',
  },
];

const mockStats = [
  {
    total_logs: '3',
    unique_users: '3',
    unique_actions: '2',
    action: 'login',
    action_count: '2',
  },
  {
    total_logs: '3',
    unique_users: '3',
    unique_actions: '2',
    action: 'create_course',
    action_count: '1',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  (auditAPI.getAll as any).mockResolvedValue(mockLogs);
  (auditAPI.getStats as any).mockResolvedValue(mockStats);
});

// ─── 6.1 Fetch audit logs ─────────────────────────────────────────────────────

describe('Admin System Page - Fetch Audit Logs (6.1)', () => {
  it('calls auditAPI.getAll on mount', async () => {
    render(<AdminAuditLogPage />);
    await waitFor(() => {
      expect(auditAPI.getAll).toHaveBeenCalledTimes(1);
    });
  });

  it('displays all fetched audit log entries', async () => {
    render(<AdminAuditLogPage />);
    expect(await screen.findByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Teacher')).toBeInTheDocument();
    expect(screen.getByText('Carol Student')).toBeInTheDocument();
  });

  it('displays action values in the table', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    expect(screen.getAllByText('login').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('create_course')).toBeInTheDocument();
  });

  it('displays IP addresses in the table', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.2')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    (auditAPI.getAll as any).mockReturnValue(new Promise(() => {}));
    (auditAPI.getStats as any).mockReturnValue(new Promise(() => {}));
    render(<AdminAuditLogPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    (auditAPI.getAll as any).mockRejectedValue(new Error('Network error'));
    render(<AdminAuditLogPage />);
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('loading is false after successful fetch (P1.5.1)', async () => {
    render(<AdminAuditLogPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  it('loading is false after failed fetch', async () => {
    (auditAPI.getAll as any).mockRejectedValue(new Error('fail'));
    render(<AdminAuditLogPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no logs found', async () => {
    (auditAPI.getAll as any).mockResolvedValue([]);
    (auditAPI.getStats as any).mockResolvedValue([]);
    render(<AdminAuditLogPage />);
    expect(
      await screen.findByText(/no audit logs found matching your criteria/i)
    ).toBeInTheDocument();
  });
});

// ─── 6.2 Fetch audit statistics ───────────────────────────────────────────────

describe('Admin System Page - Fetch Audit Statistics (6.2)', () => {
  it('calls auditAPI.getStats on mount', async () => {
    render(<AdminAuditLogPage />);
    await waitFor(() => {
      expect(auditAPI.getStats).toHaveBeenCalledTimes(1);
    });
  });

  it('displays total logs from stats (P1.5.3)', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    const totalLogsEl = screen.getByTestId('stat-total-logs');
    expect(totalLogsEl.textContent).toBe('3');
  });

  it('displays unique users from stats (P1.5.3)', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    const uniqueUsersEl = screen.getByTestId('stat-unique-users');
    expect(uniqueUsersEl.textContent).toBe('3');
  });

  it('displays unique actions from stats (P1.5.3)', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    const uniqueActionsEl = screen.getByTestId('stat-unique-actions');
    expect(uniqueActionsEl.textContent).toBe('2');
  });

  it('displays admin actions count (P1.5.3)', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    // Only Alice has role=admin, so adminActions = 1
    const adminActionsEl = screen.getByTestId('stat-admin-actions');
    expect(adminActionsEl.textContent).toBe('1');
  });

  it('shows zero stats when stats API returns empty array', async () => {
    (auditAPI.getStats as any).mockResolvedValue([]);
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    expect(screen.getByTestId('stat-total-logs').textContent).toBe('0');
    expect(screen.getByTestId('stat-unique-users').textContent).toBe('0');
  });
});

// ─── 6.3 Action filter ────────────────────────────────────────────────────────

describe('Admin System Page - Action Filter (6.3)', () => {
  it('passes action filter param to auditAPI.getAll (P1.5.2)', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');

    const actionTrigger = screen.getByRole('combobox', { name: /filter by action/i });
    fireEvent.click(actionTrigger);
    const loginOption = await screen.findByRole('option', { name: /^login$/i });
    fireEvent.click(loginOption);

    await waitFor(() => {
      expect(auditAPI.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'login' })
      );
    });
  });

  it('passes no action param when "All Actions" selected', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');

    // Default is "all" - no action param
    expect(auditAPI.getAll).toHaveBeenCalledWith({});
  });
});

// ─── 6.4 Entity type filter ───────────────────────────────────────────────────

describe('Admin System Page - Entity Type Filter (6.4)', () => {
  it('passes entityType filter param to auditAPI.getAll (P1.5.2)', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');

    const entityTrigger = screen.getByRole('combobox', { name: /filter by entity type/i });
    fireEvent.click(entityTrigger);
    const courseOption = await screen.findByRole('option', { name: /^course$/i });
    fireEvent.click(courseOption);

    await waitFor(() => {
      expect(auditAPI.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'course' })
      );
    });
  });

  it('displays entity type badges in the table', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    // entity_type 'user' and 'course' should appear as badges
    const userBadges = screen.getAllByText('user');
    expect(userBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('course')).toBeInTheDocument();
  });
});

// ─── 6.5 Date range filter ────────────────────────────────────────────────────

describe('Admin System Page - Date Range Filter (6.5)', () => {
  it('renders start date and end date inputs', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it('passes startDate param to auditAPI.getAll when set (P1.5.2)', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');

    const startInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startInput, { target: { value: '2024-03-01' } });

    await waitFor(() => {
      expect(auditAPI.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: '2024-03-01' })
      );
    });
  });

  it('passes endDate param to auditAPI.getAll when set (P1.5.2)', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');

    const endInput = screen.getByLabelText(/end date/i);
    fireEvent.change(endInput, { target: { value: '2024-03-31' } });

    await waitFor(() => {
      expect(auditAPI.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ endDate: '2024-03-31' })
      );
    });
  });

  it('shows "Clear dates" button when a date is set', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');

    const startInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startInput, { target: { value: '2024-03-01' } });

    expect(await screen.findByRole('button', { name: /clear dates/i })).toBeInTheDocument();
  });

  it('clears date filters when "Clear dates" is clicked', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');

    const startInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startInput, { target: { value: '2024-03-01' } });

    const clearBtn = await screen.findByRole('button', { name: /clear dates/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect((screen.getByLabelText(/start date/i) as HTMLInputElement).value).toBe('');
    });
  });
});

// ─── 6.6 Display audit log table ─────────────────────────────────────────────

describe('Admin System Page - Audit Log Table (6.6)', () => {
  it('renders table headers: Timestamp, User, Action, Entity Type, Details, IP Address', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Entity Type')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('IP Address')).toBeInTheDocument();
  });

  it('shows user role below user name', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
  });

  it('shows details text in the table', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    expect(screen.getByText('Admin login')).toBeInTheDocument();
    expect(screen.getByText('Created course: Math 101')).toBeInTheDocument();
  });

  it('shows entry count in card title', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');
    expect(screen.getByText('Audit Trail (3 entries)')).toBeInTheDocument();
  });

  it('client-side search filters by user name (P1.5.2)', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');

    const searchInput = screen.getByLabelText(/search audit logs/i);
    await userEvent.type(searchInput, 'alice');

    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.queryByText('Bob Teacher')).not.toBeInTheDocument();
    expect(screen.queryByText('Carol Student')).not.toBeInTheDocument();
  });

  it('client-side search filters by action (P1.5.2)', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');

    const searchInput = screen.getByLabelText(/search audit logs/i);
    await userEvent.type(searchInput, 'create_course');

    expect(screen.getByText('Bob Teacher')).toBeInTheDocument();
    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
  });

  it('client-side search filters by details (P1.5.2)', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');

    const searchInput = screen.getByLabelText(/search audit logs/i);
    await userEvent.type(searchInput, 'Math 101');

    expect(screen.getByText('Bob Teacher')).toBeInTheDocument();
    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
  });

  it('shows updated entry count after search filter', async () => {
    render(<AdminAuditLogPage />);
    await screen.findByText('Alice Admin');

    const searchInput = screen.getByLabelText(/search audit logs/i);
    await userEvent.type(searchInput, 'alice');

    expect(screen.getByText('Audit Trail (1 entries)')).toBeInTheDocument();
  });
});
