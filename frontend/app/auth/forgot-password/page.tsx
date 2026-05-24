'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, GraduationCap } from 'lucide-react';
import { authAPI } from '@/lib/api';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setStatusMessage('');
    setStatusType('');

    const validationErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      validationErrors.email = 'Email address is required';
    }

    if (step === 'confirm') {
      if (!formData.code.trim()) {
        validationErrors.code = 'Reset code is required';
      }
      if (!formData.newPassword) {
        validationErrors.newPassword = 'New password is required';
      } else if (formData.newPassword.length < 6) {
        validationErrors.newPassword = 'Password must be at least 6 characters';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        validationErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (step === 'request') {
        const response = await authAPI.requestPasswordReset(formData.email);
        setStatusMessage(
          response && typeof response === 'object' && 'message' in response
            ? String((response as Record<string, unknown>).message)
            : 'A reset code has been sent if the email is registered.'
        );
        setStatusType('success');
        setStep('confirm');
      } else {
        const response = await authAPI.confirmPasswordReset(formData.email, formData.code, formData.newPassword);
        setStatusMessage(
          response && typeof response === 'object' && 'message' in response
            ? String((response as Record<string, unknown>).message)
            : 'Password reset successfully. You can now log in with your new password.'
        );
        setStatusType('success');
        setFormData((prev) => ({ ...prev, code: '', newPassword: '', confirmPassword: '' }));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Password reset failed. Please try again.';
      setStatusMessage(message);
      setStatusType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendAnotherCode = async () => {
    setStatusMessage('');
    setStatusType('');
    setErrors({});

    if (!formData.email.trim()) {
      setErrors({ email: 'Email address is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authAPI.requestPasswordReset(formData.email);
      setStatusMessage(
        response && typeof response === 'object' && 'message' in response
          ? String((response as Record<string, unknown>).message)
          : 'A new reset code has been sent if the email is registered.'
      );
      setStatusType('success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not resend code. Please try again.';
      setStatusMessage(message);
      setStatusType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <PublicHeader />
      <main id="main-content" className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border-2 border-border overflow-hidden">
          <div className="p-8 lg:p-10">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-10 w-10 text-slate-950" aria-hidden="true" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-slate-950 mb-2">Reset Password</h1>
              <p className="text-base text-slate-600">
                {step === 'request'
                  ? 'Enter your email to receive a verification code.'
                  : 'Enter the code from your email and choose a new password.'}
              </p>
            </div>

            {statusMessage ? (
              <div
                className={`mb-6 rounded-xl p-4 ${
                  statusType === 'success'
                    ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-800'
                    : 'bg-red-50 border-2 border-red-300 text-red-800'
                }`}
                role="alert"
              >
                <p className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" />
                  {statusMessage}
                </p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-slate-950">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className="text-slate-950 border-2 border-slate-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 rounded-lg px-4 py-3"
                />
                {errors.email && (
                  <p id="email-error" className="text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {errors.email}
                  </p>
                )}
              </div>

              {step === 'confirm' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="code" className="font-semibold text-slate-950">
                      Reset Code
                    </Label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Enter your 6-digit code"
                      aria-invalid={!!errors.code}
                      aria-describedby={errors.code ? 'code-error' : undefined}
                      className="text-slate-950 border-2 border-slate-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 rounded-lg px-4 py-3"
                    />
                    {errors.code && (
                      <p id="code-error" className="text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                        {errors.code}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="font-semibold text-slate-950">
                      New Password
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="Enter your new password"
                      aria-invalid={!!errors.newPassword}
                      aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
                      className="text-slate-950 border-2 border-slate-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 rounded-lg px-4 py-3"
                    />
                    {errors.newPassword && (
                      <p id="new-password-error" className="text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                        {errors.newPassword}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="font-semibold text-slate-950">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Repeat new password"
                      aria-invalid={!!errors.confirmPassword}
                      aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                      className="text-slate-950 border-2 border-slate-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 rounded-lg px-4 py-3"
                    />
                    {errors.confirmPassword && (
                      <p id="confirm-password-error" className="text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </>
              ) : null}

              <Button
                type="submit"
                className={`w-full bg-yellow-400 text-slate-950 font-bold hover:bg-yellow-300 focus:ring-4 focus:ring-yellow-400 py-3 rounded-lg transition-all ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isSubmitting}
                aria-label={isSubmitting ? 'Resetting password, please wait' : 'Reset password'}
              >
                {isSubmitting
                  ? step === 'request'
                    ? 'Sending code...'
                    : 'Resetting password...'
                  : step === 'request'
                  ? 'Send reset code'
                  : 'Confirm code & reset'}
              </Button>
            </form>

            {step === 'confirm' ? (
              <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-600">
                <button
                  type="button"
                  onClick={handleSendAnotherCode}
                  className="underline text-slate-950 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="underline text-slate-950 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                >
                  Start over
                </button>
              </div>
            ) : null}

            <div className="mt-6 text-center text-slate-600 text-sm">
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/auth/login')}
                  className="font-semibold text-slate-950 hover:text-yellow-600 underline focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                >
                  Back to login
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
