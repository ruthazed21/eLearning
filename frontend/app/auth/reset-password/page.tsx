'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, GraduationCap, KeyRound } from 'lucide-react';
import { authAPI } from '@/lib/api';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') ?? '';

  const [formData, setFormData] = useState({
    email: emailFromQuery,
    code: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (emailFromQuery) {
      setFormData((prev) => ({ ...prev, email: emailFromQuery }));
    }
  }, [emailFromQuery]);

  const validate = (): Record<string, string> => {
    const validationErrors: Record<string, string> = {};
    const trimmedEmail = formData.email.trim().toLowerCase();

    if (!trimmedEmail) {
      validationErrors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      validationErrors.email = 'Please enter a valid email address';
    }

    const code = formData.code.trim().replace(/\s/g, '');
    if (!code) {
      validationErrors.code = 'Verification code is required';
    } else if (!/^\d{6}$/.test(code)) {
      validationErrors.code = 'Code must be exactly 6 digits';
    }

    if (!formData.newPassword) {
      validationErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      validationErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      validationErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match';
    }

    return validationErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setStatusMessage('');
    setStatusType('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const email = formData.email.trim().toLowerCase();
      const code = formData.code.trim().replace(/\s/g, '');

      await authAPI.confirmPasswordReset(
        email,
        code,
        formData.newPassword,
        formData.confirmPassword
      );

      setStatusType('success');
      setStatusMessage('Password reset successfully! Redirecting to login...');

      setTimeout(() => {
        router.push('/auth/login?reset=success');
      }, 2000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Password reset failed. Please try again.';
      setStatusMessage(message);
      setStatusType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setErrors({});
    setStatusMessage('');
    setStatusType('');

    const trimmedEmail = formData.email.trim().toLowerCase();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setErrors({ email: 'Enter a valid email before resending the code' });
      return;
    }

    setResending(true);
    try {
      const response = await authAPI.requestPasswordReset(trimmedEmail);
      const message =
        response && typeof response === 'object' && 'message' in response
          ? String((response as Record<string, unknown>).message)
          : 'A new verification code has been sent if the email is registered.';
      setStatusMessage(message);
      setStatusType('success');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not resend code. Please try again.';
      setStatusMessage(message);
      setStatusType('error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicHeader />
      <main id="main-content" className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border-2 border-border overflow-hidden">
          <div className="p-8 lg:p-10">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                  <KeyRound className="h-10 w-10 text-primary-foreground" aria-hidden="true" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
              <p className="text-base text-muted-foreground">
                Enter the 6-digit code from your email and choose a new password. Codes expire in
                10 minutes.
              </p>
            </div>

            {statusMessage ? (
              <div
                className={`mb-6 rounded-xl p-4 border-2 ${
                  statusType === 'success'
                    ? 'border-primary/40 bg-primary/10 text-foreground'
                    : 'border-destructive/40 bg-destructive/10 text-destructive'
                }`}
                role="alert"
              >
                <p className="flex items-start gap-2">
                  {statusType === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" />
                  )}
                  {statusMessage}
                </p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  className="border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-lg px-4 py-3"
                />
                {errors.email && (
                  <p className="text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="font-semibold text-foreground">
                  Verification Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.replace(/\D/g, '').slice(0, 6) })
                  }
                  placeholder="000000"
                  aria-invalid={!!errors.code}
                  className="border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-lg px-4 py-3 tracking-widest text-center text-lg font-mono"
                />
                {errors.code && (
                  <p className="text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {errors.code}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password" className="font-semibold text-foreground">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="At least 6 characters"
                  aria-invalid={!!errors.newPassword}
                  className="border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-lg px-4 py-3"
                />
                {errors.newPassword && (
                  <p className="text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {errors.newPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="font-semibold text-foreground">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repeat new password"
                  aria-invalid={!!errors.confirmPassword}
                  className="border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-lg px-4 py-3"
                />
                {errors.confirmPassword && (
                  <p className="text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 focus:ring-4 focus:ring-primary py-3 rounded-lg"
                disabled={isSubmitting || statusType === 'success'}
              >
                {isSubmitting ? 'Resetting password...' : 'Reset password'}
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="underline text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
              <Link
                href="/auth/forgot-password"
                className="underline text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                Request new code
              </Link>
            </div>

            <div className="mt-6 text-center text-muted-foreground text-sm">
              <Link
                href="/auth/login"
                className="font-semibold text-foreground hover:text-primary underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
