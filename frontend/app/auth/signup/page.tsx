 'use client';

import { useState, useEffect } from 'react';
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
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('accessibilityMode') as AccessibilityMode;
    if (saved) {
      setAccessibilityMode(saved);
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
      if (!formData.email.toLowerCase().startsWith('edu')) {
        newErrors.email = 'Teacher email must start with "edu"';
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
      login(response.token, response.user as User);

      if (formData.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setErrors({ server: error.message || 'Failed to create account. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- THIS IS THE PART THAT HELPS THE READER ---
  const activeError = Object.values(errors)[0];
  const bgColor = accessibilityMode === 'blind' ? 'bg-black' : 'bg-slate-950';
  const textSize = accessibilityMode === 'blind' ? 'text-xl' : 'text-base';

  if (!mounted) return null;

  return (
    <div className={'min-h-screen ' + bgColor + ' text-white flex flex-col'}>
      <PublicHeader />
      
      {/* 1. THE INVISIBLE VOICE READER */}
      <div aria-live="assertive" className="sr-only">
        {isSubmitting 
          ? "Creating your account, please wait." 
          : activeError 
            ? `Error: ${activeError}` 
            : "Signup Page Loaded. Please fill out the form to create your account."}
      </div>

      <main id="main-content" className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-white/20 overflow-hidden">
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