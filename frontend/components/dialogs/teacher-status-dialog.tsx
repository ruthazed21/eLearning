'use client';

import { useState, useEffect } from 'react';
import { usersAPI } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  joined?: string;
}

interface TeacherStatusDialogProps {
  user: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (user: UserRow) => void;
}

/**
 * Admin-only: change teacher account status (approved = Active, pending = Inactive).
 * No other teacher profile fields are editable by admins.
 */
export function TeacherStatusDialog({ user, open, onOpenChange, onSave }: TeacherStatusDialogProps) {
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Inactive');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setStatus(user.status === 'Active' ? 'Active' : 'Inactive');
      setError('');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const approval_status = status === 'Active' ? 'approved' : 'pending';
      const response = await usersAPI.updateTeacherStatus(user.id, approval_status);

      const updatedUser: UserRow = {
        ...user,
        status: response.approval_status === 'approved' ? 'Active' : 'Inactive',
      };

      if (onSave) onSave(updatedUser);
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Change teacher status</DialogTitle>
            <DialogDescription>
              {user ? (
                <>
                  Update account status for <strong>{user.name}</strong>. Profile details cannot be
                  edited here — only Active or Inactive status.
                </>
              ) : (
                'Select a teacher account status.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded" role="alert">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="teacher-status">Account status</Label>
              <Select
                value={status}
                onValueChange={(value: 'Active' | 'Inactive') => setStatus(value)}
                disabled={loading}
              >
                <SelectTrigger id="teacher-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active (approved)</SelectItem>
                  <SelectItem value="Inactive">Inactive (pending approval)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Save status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
