import type { User } from '@/lib/auth-context';

/** Teacher dashboard/API access requires admin approval. */
export function isTeacherApproved(user: Pick<User, 'role' | 'approval_status'> | null | undefined): boolean {
  if (!user || user.role !== 'teacher') return true;
  return user.approval_status === 'approved';
}

export function isTeacherPending(user: Pick<User, 'role' | 'approval_status'> | null | undefined): boolean {
  if (!user || user.role !== 'teacher') return false;
  return user.approval_status === 'pending' || !user.approval_status;
}

export function isTeacherRejected(user: Pick<User, 'role' | 'approval_status'> | null | undefined): boolean {
  if (!user || user.role !== 'teacher') return false;
  return user.approval_status === 'rejected';
}

export function getTeacherApprovalRedirect(
  user: Pick<User, 'role' | 'approval_status'> | null | undefined
): '/auth/pending' | '/auth/pending?status=rejected' | null {
  if (isTeacherPending(user)) return '/auth/pending';
  if (isTeacherRejected(user)) return '/auth/pending?status=rejected';
  return null;
}
