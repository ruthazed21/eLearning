'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI, systemAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RouteGuard } from '@/lib/route-guard';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCommonShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  User,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  Briefcase,
  Loader2,
  Phone,
  Layout
} from 'lucide-react';

export default function TeacherProfilePage() {
  const router = useRouter();
  useCommonShortcuts('teacher');
  const { user, updateUser } = useAuth();

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    department: '',
    bio: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfileData(user.id);
    }
  }, [user?.id]);

  const fetchProfileData = async (userId: number) => {
    try {
      setLoading(true);
      setFetchError('');

      const [userData, statsData] = await Promise.all([
        usersAPI.getById(userId),
        systemAPI.getTeacherStats()
      ]);

      setProfileData(userData);
      setStats(statsData);

      setFormData(prev => ({
        ...prev,
        fullName: userData.full_name || '',
        department: userData.department || '',
        bio: userData.bio || '',
        phone: userData.phone || '',
      }));
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      setFetchError(err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.fullName) newErrors.fullName = 'Name is required';
    if (!formData.department) newErrors.department = 'Department is required';

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

    try {
      setIsSubmitting(true);

      const updatePayload: any = {
        fullName: formData.fullName,
        department: formData.department,
        bio: formData.bio,
        phone: formData.phone,
      };

      if (formData.newPassword) {
        updatePayload.currentPassword = formData.currentPassword;
        updatePayload.password = formData.newPassword;
      }

      const updatedUser = await usersAPI.update(user!.id, updatePayload);

      setProfileData(updatedUser);
      setSuccessMessage('Profile updated successfully!');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      // Update auth context after profile change (task 10.6)
      updateUser({ full_name: updatedUser.full_name });
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setErrors({ form: err.message || 'Failed to update profile. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RouteGuard allowedRoles={['teacher']} requireTeacherApproval>
    <DashboardLayout role="teacher" userName={user?.fullName || "Teacher"} userRole="Teacher">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account information</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Global Error Message */}
        {errors.form && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {fetchError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Account Information (Read-only) */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-600">Educational Email</Label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-5 w-5 text-gray-600" aria-hidden="true" />
                      <span className="font-medium">{profileData?.email}</span>
                    </div>
                    <p className="text-xs text-gray-600">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-600">Account Status</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={profileData?.approval_status === 'approved' ? 'default' : 'secondary'} className="text-base capitalize">
                        {profileData?.approval_status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-600">Member Since</Label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-600" aria-hidden="true" />
                      <span className="font-medium">{new Date(profileData?.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-600">Courses Created</Label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Layout className="h-5 w-5 text-gray-600" aria-hidden="true" />
                      <span className="font-medium">{stats?.totalCourses || 0} Courses</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editable Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Enter your full name"
                        className="flex-1"
                        aria-invalid={!!errors.fullName}
                        aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                      />
                    </div>
                    {errors.fullName && (
                      <p id="fullName-error" className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="e.g., Computer Science"
                        className="flex-1"
                        aria-invalid={!!errors.department}
                        aria-describedby={errors.department ? 'department-error' : undefined}
                      />
                    </div>
                    {errors.department && (
                      <p id="department-error" className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                        {errors.department}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Enter your phone number"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Input
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell students about yourself..."
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Change Password (Optional)</h3>
                  </div>

                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      placeholder="Enter current password"
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
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="Enter new password"
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
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Re-enter new password"
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
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
    </RouteGuard>
  );
}
