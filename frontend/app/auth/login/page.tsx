'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';

type AccessibilityMode = 'default' | 'blind' | 'deaf';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('accessibilityMode') as AccessibilityMode;
    if (saved) {
      setAccessibilityMode(saved);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoginError('');

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authAPI.login(formData.email, formData.password);

      // Store auth data
      login(response.token, response.user);

      // Role-based redirection
      const { role } = response.user;
      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Invalid email or password. Please try again.';
      console.error('Login error:', message);

      if (message.includes('pending approval')) {
        router.push('/auth/pending');
      } else if (message.includes('rejected')) {
        setLoginError('Your account has been rejected. Please contact support.');
      } else {
        setLoginError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const bgColor = accessibilityMode === 'blind' ? 'bg-black' : 'bg-slate-950';
  const textSize = accessibilityMode === 'blind' ? 'text-xl' : 'text-base';

  if (!mounted) return null;

  return (
    <div className={`min-h-screen ${bgColor} text-white flex flex-col`}>
      <PublicHeader />
      
      <main id="main-content" className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-white/20 overflow-hidden">
          <div className="p-8 lg:p-10">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-10 w-10 text-slate-950" aria-hidden="true" />
                </div>
              </div>
              <h1 className={`${accessibilityMode === 'blind' ? 'text-4xl' : 'text-3xl'} font-bold text-slate-950 mb-2`}>
                Welcome Back
              </h1>
              <p className={`${textSize} text-slate-600`}>
                Login to access your learning dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Login Error */}
              {loginError && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4" role="alert">
                  <p className={`${textSize} text-red-800 flex items-start gap-2`}>
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span>{loginError}</span>
                  </p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className={`${textSize} font-semibold text-slate-950`}>
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={`${textSize} text-slate-950 border-2 border-slate-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 rounded-lg px-4 py-3`}
                />
                {errors.email && (
                  <p id="email-error" className={`${textSize} text-red-600 flex items-center gap-2`}>
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className={`${textSize} font-semibold text-slate-950`}>
                    Password
                  </Label>
                  <Link 
                    href="/auth/forgot-password" 
                    className={`${textSize} text-slate-600 hover:text-yellow-600 underline focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded`}
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={`${textSize} text-slate-950 border-2 border-slate-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 rounded-lg px-4 py-3`}
                />
                {errors.password && (
                  <p id="password-error" className={`${textSize} text-red-600 flex items-center gap-2`}>
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className={`w-full ${textSize} bg-yellow-400 text-slate-950 hover:bg-yellow-300 focus:ring-4 focus:ring-yellow-400 font-bold py-3 rounded-lg transition-all ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isSubmitting}
                aria-label={isSubmitting ? 'Logging in, please wait' : 'Login to your account'}
              >
                {isSubmitting ? 'Logging in...' : 'Login'}
              </Button>

              {/* Signup Link */}
              <p className={`text-center ${textSize} text-slate-600 pt-2`}>
                Don't have an account?{' '}
                <Link 
                  href="/auth/signup" 
                  className="text-slate-950 font-semibold hover:text-yellow-600 underline focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                >
                  Sign up here
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
