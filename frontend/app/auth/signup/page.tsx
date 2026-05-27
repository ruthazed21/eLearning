 'use client';

import { useState, useEffect } from 'react';
import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { User } from '@/lib/auth-context';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';

type AccessibilityMode = 'default' | 'blind' | 'deaf';

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'teacher',
    schoolId: '',
    disabilityType: '',
    department: '',
    bio: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verification, setVerification] = useState<null | {
    verificationId: string;
    clientKey: string;
    status: 'pending' | 'expired' | 'verified';
    email: string;
    role: 'student' | 'teacher';
    expiresAt?: string;
    expiresInMinutes?: number;
  }>(null);
  const [verificationResendLoading, setVerificationResendLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('default');
  const [mounted, setMounted] = useState(false);
  const waitingHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('accessibilityMode') as AccessibilityMode;
    if (saved) {
      setAccessibilityMode(saved);
    }

    // Resume pending signup verification (if user clicked the email link and navigated away).
    try {
      const raw = sessionStorage.getItem('pendingSignupVerification');
      if (raw) {
        const parsed = JSON.parse(raw) as typeof verification;
        if (parsed?.verificationId && parsed?.clientKey && parsed?.status) {
          setVerification(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const validateSchoolId = (schoolId: string) => {
    if (!schoolId.toUpperCase().startsWith('BDU')) {
      return 'School ID must start with "BDU"';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.role === 'student') {
      if (!formData.schoolId) {
        newErrors.schoolId = 'School ID is required';
      } else {
        const schoolIdError = validateSchoolId(formData.schoolId);
        if (schoolIdError) newErrors.schoolId = schoolIdError;
      }
      if (!formData.disabilityType) {
        newErrors.disabilityType = 'Please select your disability type';
      }
    } else {
      if (!formData.department) {
        newErrors.department = 'Department is required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const signupData: any = {
        email: formData.email,
        password: formData.password,
        fullName: formData.name,
        role: formData.role,
      };

      if (formData.role === 'student') {
        signupData.schoolId = formData.schoolId;
        signupData.disabilityType = formData.disabilityType;
      } else {
        signupData.department = formData.department;
        signupData.bio = formData.bio;
      }

      const response = await authAPI.signup(signupData);
      if (response?.verificationRequired && response?.verificationId && response?.clientKey) {
        const nextVerification = {
          verificationId: String(response.verificationId),
          clientKey: String(response.clientKey),
          status: 'pending' as const,
          email: String(response.email || formData.email),
          role: (String(response.role || formData.role) as 'student' | 'teacher') ?? formData.role,
          expiresInMinutes: response?.expiresInMinutes ? Number(response.expiresInMinutes) : undefined,
        };

        sessionStorage.setItem('pendingSignupVerification', JSON.stringify(nextVerification));
        setVerification(nextVerification);
        return;
      }

      // Fallback (should not happen with the new backend, but keeps backward compatibility).
      if (response?.token && response?.user) {
        login(response.token, response.user as User);
        if (formData.role === 'teacher' && response.user.approval_status !== 'approved') {
          sessionStorage.setItem('pendingTeacherUser', JSON.stringify(response.user));
          router.push('/auth/pending');
        } else if (formData.role === 'teacher') {
          router.push('/teacher/dashboard');
        } else {
          router.push('/student/dashboard');
        }
      } else {
        setErrors({ server: 'Unexpected signup response from server.' });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setErrors({ server: error.message || 'Failed to create account. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verification) return;
    setVerificationError(null);
    setVerificationResendLoading(true);
    try {
      await authAPI.resendSignupVerification(verification.verificationId, verification.clientKey);
      // Keep the user on the same waiting state; polling will pick up any updated expiry.
      setVerification((prev) => (prev ? { ...prev, status: 'pending' } : prev));
    } catch (err: any) {
      const msg = err?.message || 'Could not resend verification email. Please try again.';
      setVerificationError(msg);
    } finally {
      setVerificationResendLoading(false);
    }
  };

  useEffect(() => {
    if (!verification) return;
    if (verification.status === 'pending' || verification.status === 'expired') {
      waitingHeadingRef.current?.focus();
    }
  }, [verification?.status]);

  useEffect(() => {
    if (!verification) return;
    if (verification.status !== 'pending') return;

    let cancelled = false;
    const poll = async () => {
      try {
        setVerificationError(null);
        const status = await authAPI.signupVerificationStatus(verification.verificationId, verification.clientKey);

        if (cancelled) return;

        if (status?.verified && status?.user) {
          sessionStorage.removeItem('pendingSignupVerification');

          // Teachers: email verified but admin approval still required — no dashboard access yet.
          if (status.approvalPending || (status.user.role === 'teacher' && status.user.approval_status === 'pending')) {
            sessionStorage.setItem('pendingTeacherUser', JSON.stringify(status.user));
            router.push('/auth/pending');
            return;
          }

          if (status.approvalRejected || status.user.approval_status === 'rejected') {
            sessionStorage.setItem('pendingTeacherUser', JSON.stringify(status.user));
            router.push('/auth/pending?status=rejected');
            return;
          }

          if (status?.token) {
            login(status.token, status.user as User);
            if (status.user.role === 'teacher') {
              router.push('/teacher/dashboard');
            } else {
              router.push('/student/dashboard');
            }
            return;
          }
        }

        const nextStatus = status?.status === 'expired' ? 'expired' : 'pending';
        setVerification((prev) =>
          prev
            ? {
                ...prev,
                status: nextStatus,
                expiresAt: status?.expiresAt ? String(status.expiresAt) : prev.expiresAt,
                email: prev.email,
                role: prev.role,
              }
            : prev
        );
      } catch (err: any) {
        if (cancelled) return;
        const msg = err?.message || 'Could not confirm verification status. Please request a new link.';
        setVerificationError(msg);
        setVerification((prev) => (prev ? { ...prev, status: 'expired' } : prev));
      }
    };

    poll();
    const interval = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [verification?.verificationId, verification?.clientKey, verification?.status, login, router]);

  // --- THIS IS THE PART THAT HELPS THE READER ---
  const activeError = Object.values(errors)[0];
  const bgColor = accessibilityMode === 'blind' ? 'bg-black' : 'bg-slate-950';
  const textSize = accessibilityMode === 'blind' ? 'text-xl' : 'text-base';

  if (!mounted) return null;

  if (verification) {
    const title =
      verification.status === 'pending'
        ? 'Verify your email'
        : verification.status === 'expired'
          ? 'Verification link expired'
          : 'Email verified';

    const expiresInMinutes =
      verification.expiresInMinutes ??
      (verification.expiresAt
        ? Math.max(0, Math.ceil((new Date(verification.expiresAt).getTime() - Date.now()) / 60000))
        : undefined);

    const liveDetails =
      verification.status === 'pending'
        ? `We sent a verification link to ${verification.email}. Waiting for you to confirm.`
        : verification.status === 'expired'
          ? 'Your verification link has expired. You can request a new link.'
          : 'Email verification completed.';

    return (
      <div className={'min-h-screen ' + bgColor + ' text-white flex flex-col'}>
        <PublicHeader />

        {/* 1. THE INVISIBLE VOICE READER */}
        <div aria-live="assertive" className="sr-only">
          {liveDetails}
        </div>

        <main id="main-content" className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border-2 border-border overflow-hidden">
            <div className="p-8 lg:p-10">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center">
                    {verification.status === 'expired' ? (
                      <AlertCircle className="h-10 w-10 text-slate-950" aria-hidden="true" />
                    ) : (
                      <GraduationCap className="h-10 w-10 text-slate-950" aria-hidden="true" />
                    )}
                  </div>
                </div>
                <h1
                  ref={waitingHeadingRef}
                  tabIndex={-1}
                  className={(accessibilityMode === 'blind' ? 'text-4xl' : 'text-3xl') + ' font-bold text-slate-950 mb-2'}
                >
                  {title}
                </h1>
                <p className={textSize + ' text-slate-600'}>
                  {verification.status === 'pending' ? (
                    <>
                      We sent a verification link to <span className="text-slate-900 font-semibold">{verification.email}</span>.
                      {expiresInMinutes != null ? (
                        <> This link expires in <span className="text-slate-900 font-semibold">{expiresInMinutes}</span> minutes.</>
                      ) : null}
                    </>
                  ) : (
                    <>Please request a new verification link.</>
                  )}
                </p>
              </div>

              <div className="space-y-4">
                <p role="status" aria-live="polite" className={textSize + ' text-slate-100'}>
                  {verification.status === 'pending'
                    ? 'Waiting for your email verification...'
                    : verification.status === 'expired'
                      ? 'Verification link expired. Resend now.'
                      : 'Email verified.'}
                </p>

                {verificationError ? (
                  <p className="text-red-400 text-sm" role="alert">
                    {verificationError}
                  </p>
                ) : null}

                <div className="space-y-3 pt-2">
                  <a
                    href="https://mail.google.com/mail/u/0/#inbox"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={'block w-full ' + textSize + ' bg-yellow-400 text-slate-950 font-bold py-3 rounded-lg text-center hover:bg-yellow-300 transition-all'}
                    aria-label="Open Gmail inbox"
                  >
                    Open Gmail
                  </a>

                  <a
                    href={`mailto:${encodeURIComponent(verification.email)}?subject=${encodeURIComponent('EduAccess — Verify your email address')}`}
                    className={'block w-full ' + textSize + ' bg-slate-800 text-white font-bold py-3 rounded-lg text-center hover:bg-slate-700 transition-all border-2 border-slate-600'}
                    aria-label="Go to your email app"
                  >
                    Go to email
                  </a>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleResendVerification}
                    className={'w-full ' + textSize + ' bg-yellow-400 text-slate-950 font-bold py-3 rounded-lg hover:bg-yellow-300 transition-all'}
                    disabled={verificationResendLoading}
                    aria-label={verificationResendLoading ? 'Resending verification email' : 'Resend verification email'}
                  >
                    {verificationResendLoading ? 'Resending...' : 'Resend verification email'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    );
  }

  return (
    <div className={'min-h-screen ' + bgColor + ' text-white flex flex-col'}>
      <PublicHeader />
      
      {/* 1. THE INVISIBLE VOICE READER */}
      <div aria-live="assertive" className="sr-only">
        {isSubmitting
          ? 'Processing your signup. Please wait.'
          : verification
            ? verification.status === 'pending'
              ? 'Verification email sent. Waiting for you to confirm.'
              : verification.status === 'expired'
                ? 'Your verification link has expired. You can resend it now.'
                : 'Email verified.'
            : activeError
              ? `Error: ${activeError}`
              : 'Signup Page Loaded. Please fill out the form to create your account.'}
      </div>

      <main id="main-content" className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border-2 border-border overflow-hidden">
          <div className="p-8 lg:p-10">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-10 w-10 text-slate-950" aria-hidden="true" />
                </div>
              </div>
              <h1 className={(accessibilityMode === 'blind' ? 'text-4xl' : 'text-3xl') + ' font-bold text-slate-950 mb-2'}>
                Create Your Account
              </h1>
              <p className={textSize + ' text-slate-600'}>
                Join our accessible e-learning platform
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <Label className={textSize + ' font-semibold text-slate-950'}>I am a *</Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="student" id="role-student" />
                    <Label htmlFor="role-student" className={'cursor-pointer ' + textSize + ' text-slate-950'}>Student</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="teacher" id="role-teacher" />
                    <Label htmlFor="role-teacher" className={'cursor-pointer ' + textSize + ' text-slate-950'}>Teacher</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className={textSize + ' font-semibold text-slate-950'}>Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your full name"
                  className={textSize + ' text-slate-950 border-2 border-slate-300 focus:border-yellow-400 rounded-lg px-4 py-3'}
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className={textSize + ' font-semibold text-slate-950'}>Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@example.com"
                  className={textSize + ' text-slate-950 border-2 border-slate-300 focus:border-yellow-400 rounded-lg px-4 py-3'}
                />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className={textSize + ' font-semibold text-slate-950'}>Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={textSize + ' text-slate-950 border-2 border-slate-300 focus:border-yellow-400 rounded-lg px-4 py-3'}
                />
                {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className={textSize + ' font-semibold text-slate-950'}>Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={textSize + ' text-slate-950 border-2 border-slate-300 focus:border-yellow-400 rounded-lg px-4 py-3'}
                />
                {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              {formData.role === 'student' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="schoolId" className={textSize + ' font-semibold text-slate-950'}>School ID *</Label>
                    <Input
                      id="schoolId"
                      value={formData.schoolId}
                      onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                      placeholder="Must start with 'BDU'"
                      className={textSize + ' text-slate-950 border-2 border-slate-300 focus:border-yellow-400 rounded-lg px-4 py-3'}
                    />
                    {errors.schoolId && <p className="text-red-600 text-sm mt-1">{errors.schoolId}</p>}
                  </div>

                  <div className="space-y-3">
                    <Label className={textSize + ' font-semibold text-slate-950'}>Disability Type *</Label>
                    <RadioGroup
                      value={formData.disabilityType}
                      onValueChange={(value) => setFormData({ ...formData, disabilityType: value })}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3 border-2 border-slate-300 rounded-lg p-4">
                        <RadioGroupItem value="blind" id="blind" />
                        <Label htmlFor="blind" className={'flex-1 cursor-pointer ' + textSize + ' text-slate-950 font-semibold'}>Blind / Visually Impaired</Label>
                      </div>
                      <div className="flex items-center space-x-3 border-2 border-slate-300 rounded-lg p-4">
                        <RadioGroupItem value="deaf" id="deaf" />
                        <Label htmlFor="deaf" className={'flex-1 cursor-pointer ' + textSize + ' text-slate-950 font-semibold'}>Deaf / Hearing Impaired</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="department" className={textSize + ' font-semibold text-slate-950'}>Department *</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className={textSize + ' text-slate-950 border-2 border-slate-300 focus:border-yellow-400 rounded-lg px-4 py-3'}
                  />
                </div>
              )}

              {/* 2. THE SMART BUTTON */}
              <Button 
                type="submit" 
                className={'w-full ' + textSize + ' bg-yellow-400 text-slate-950 font-bold py-3 rounded-lg hover:bg-yellow-300 transition-all'}
                disabled={isSubmitting}
                aria-label={isSubmitting ? "Processing signup" : "Submit registration form"}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>

              <p className={'text-center ' + textSize + ' text-slate-600 pt-2'}>
                Already have an account?{' '}
                <Link href="/auth/login" className="text-slate-950 font-semibold underline">
                  Login here
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
  }