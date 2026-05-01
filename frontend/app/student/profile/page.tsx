'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RouteGuard } from '@/lib/route-guard';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { usersAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  User,
  Mail,
  IdCard,
  Calendar,
  Eye,
  Ear,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function StudentProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userData = await usersAPI.getById(user.id);
      setProfile(userData);
      setFormData(prev => ({
        ...prev,
        name: userData.full_name,
      }));
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      toast.error('Error', {
        description: err.message || 'Failed to load profile. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Name is required';

    if (formData.newPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to set new password';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        fullName: formData.name,
      };

      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      await usersAPI.update(profile.id, payload);

      // Update auth context after profile change (task 16.6)
      updateUser({ full_name: formData.name });

      setSuccessMessage('Profile updated successfully!');
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setProfile((prev: any) => ({ ...prev, full_name: formData.name }));
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      toast.error('Update Failed', {
        description: err.message || 'Failed to update profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault();
            router.push('/student/dashboard');
            break;
          case 'c':
            e.preventDefault();
            router.push('/student/courses');
            break;
          case 'p':
            e.preventDefault();
            router.push('/student/progress');
            break;
          case 'q':
            e.preventDefault();
            router.push('/student/quiz');
            break;
          case 's':
            e.preventDefault();
            document.querySelector<HTMLFormElement>('form')?.requestSubmit();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const keyboardShortcuts = [
    { keys: ['Ctrl', 'H'], description: 'Go to Dashboard' },
    { keys: ['Ctrl', 'C'], description: 'Go to Courses' },
    { keys: ['Ctrl', 'P'], description: 'Go to Progress' },
    { keys: ['Ctrl', 'Q'], description: 'Go to Quiz' },
    { keys: ['Ctrl', 'S'], description: 'Save changes' },
  ];

  return (
    <RouteGuard allowedRoles={['student']}>
      <DashboardLayout role="student" userName={profile?.full_name || 'Student'} userRole="Student">
        <KeyboardShortcutsHelp shortcuts={keyboardShortcuts} />
        <div className="space-y-8 max-w-4xl">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Profile Settings</h1>
            <p className="text-lg text-gray-500">Manage your account information</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : profile ? (
            <>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* School ID — read-only */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">School ID</Label>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <IdCard className="h-5 w-5 text-gray-600" aria-hidden="true" />
                        <span className="font-semibold text-gray-900">{profile.school_id}</span>
                      </div>
                      <p className="text-xs text-gray-400">School ID cannot be changed</p>
                    </div>

                    {/* Email — read-only */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">Email Address</Label>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <Mail className="h-5 w-5 text-gray-600" aria-hidden="true" />
                        <span className="font-semibold text-gray-900">{profile.email}</span>
                      </div>
                      <p className="text-xs text-gray-400">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">Account Status</Label>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge className={profile.approval_status === 'approved' ? 'bg-green-500' : 'bg-orange-500'}>
                          {profile.approval_status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">Disability Type</Label>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        {profile.disability_type === 'blind' ? (
                          <>
                            <Eye className="h-5 w-5 text-gray-600" aria-hidden="true" />
                            <span className="font-semibold text-gray-900">Blind / Visually Impaired</span>
                          </>
                        ) : (
                          <>
                            <Ear className="h-5 w-5 text-gray-600" aria-hidden="true" />
                            <span className="font-semibold text-gray-900">Deaf / Hearing Impaired</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        UI mode is locked based on your disability type
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">Member Since</Label>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-gray-600" aria-hidden="true" />
                        <span className="font-semibold text-gray-900">{new Date(profile.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Editable Profile Information */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">Edit Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter your full name"
                          className="flex-1 h-11"
                          aria-invalid={!!errors.name}
                          aria-describedby={errors.name ? 'name-error' : undefined}
                        />
                      </div>
                      {errors.name && (
                        <p id="name-error" className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" aria-hidden="true" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-gray-900 text-lg mb-4">Change Password (Optional)</h3>
                    </div>

                    {/* Current Password */}
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-sm font-medium">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                        className="h-11"
                        aria-invalid={!!errors.currentPassword}
                        aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
                      />
                      {errors.currentPassword && (
                        <p id="currentPassword-error" className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" aria-hidden="true" />
                          {errors.currentPassword}
                        </p>
                      )}
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        placeholder="Enter new password"
                        className="h-11"
                        aria-invalid={!!errors.newPassword}
                        aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
                      />
                      {errors.newPassword && (
                        <p id="newPassword-error" className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" aria-hidden="true" />
                          {errors.newPassword}
                        </p>
                      )}
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Re-enter new password"
                        className="h-11"
                        aria-invalid={!!errors.confirmPassword}
                        aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                      />
                      {errors.confirmPassword && (
                        <p id="confirmPassword-error" className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" aria-hidden="true" />
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                      <Button type="submit" className="w-full h-11" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500">Unable to load profile information.</p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
