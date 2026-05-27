'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import { getTeacherApprovalRedirect, isTeacherApproved } from './teacher-approval';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('student' | 'teacher' | 'admin')[];
  requireAuth?: boolean;
  /** When true, teachers with pending/rejected approval cannot view this route. */
  requireTeacherApproval?: boolean;
}

export function RouteGuard({
  children,
  allowedRoles,
  requireAuth = true,
  requireTeacherApproval = false,
}: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !user) {
      router.push('/');
      return;
    }

    // Block teacher dashboard/protected pages until admin approves the account.
    if (user && requireTeacherApproval && user.role === 'teacher') {
      const redirect = getTeacherApprovalRedirect(user);
      if (redirect) {
        router.replace(redirect);
        return;
      }
    }

    if (user && allowedRoles && !allowedRoles.includes(user.role)) {
      switch (user.role) {
        case 'student':
          router.push('/student/dashboard');
          break;
        case 'teacher':
          if (isTeacherApproved(user)) {
            router.push('/teacher/dashboard');
          } else {
            router.replace(getTeacherApprovalRedirect(user) || '/auth/pending');
          }
          break;
        case 'admin':
          router.push('/admin/dashboard');
          break;
        default:
          router.push('/');
      }
    }
  }, [user, loading, allowedRoles, requireAuth, requireTeacherApproval, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-live="polite">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"
            aria-hidden="true"
          />
          <p className="mt-4 text-lg text-white">Loading…</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  if (user && requireTeacherApproval && user.role === 'teacher' && !isTeacherApproved(user)) {
    return null;
  }

  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
