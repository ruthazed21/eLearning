'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Clock, Mail, ShieldAlert, XCircle } from 'lucide-react';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';

type AccessibilityMode = 'default' | 'blind' | 'deaf';

/**
 * Shown after teacher email verification while approval_status is still "pending",
 * or when a rejected teacher signs in. Does not grant dashboard access.
 */
export default function PendingApprovalPage() {
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('default');
  const [isRejected, setIsRejected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('accessibilityMode') as AccessibilityMode;
    if (saved) setAccessibilityMode(saved);

    if (typeof window !== 'undefined') {
      const status = new URLSearchParams(window.location.search).get('status');
      setIsRejected(status === 'rejected');
    }

    try {
      const raw = sessionStorage.getItem('pendingTeacherUser');
      if (raw) {
        const parsed = JSON.parse(raw) as { full_name?: string };
        if (parsed?.full_name) setTeacherName(parsed.full_name);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (mounted) headingRef.current?.focus();
  }, [mounted, isRejected]);

  const bgColor = accessibilityMode === 'blind' ? 'bg-black' : 'bg-slate-950';
  const textSize = accessibilityMode === 'blind' ? 'text-xl' : 'text-base';

  const liveMessage = isRejected
    ? 'Your teacher account application was not approved. You cannot access the teacher dashboard.'
    : teacherName
      ? `${teacherName}, your email is verified. Your teacher account is waiting for administrator approval.`
      : 'Your email is verified. Your teacher account is waiting for administrator approval.';

  if (!mounted) return null;

  return (
    <div className={`min-h-screen ${bgColor} text-white flex flex-col`}>
      <PublicHeader />

      <div aria-live="assertive" className="sr-only">
        {liveMessage}
      </div>

      <main id="main-content" className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border-2 border-border overflow-hidden">
          <div className="p-8 lg:p-10">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center">
                  {isRejected ? (
                    <XCircle className="h-10 w-10 text-slate-950" aria-hidden="true" />
                  ) : (
                    <Clock className="h-10 w-10 text-slate-950" aria-hidden="true" />
                  )}
                </div>
              </div>

              <h1
                ref={headingRef}
                tabIndex={-1}
                className={`${accessibilityMode === 'blind' ? 'text-4xl' : 'text-3xl'} font-bold text-slate-950 mb-2`}
              >
                {isRejected ? 'Application Not Approved' : 'Pending Admin Approval'}
              </h1>

              <p className={`${textSize} text-slate-600`} role="status">
                {isRejected
                  ? 'An administrator reviewed your teacher registration and did not approve it.'
                  : 'Your email address is verified. An administrator must approve your teacher account before you can use the dashboard.'}
              </p>
            </div>

            <div className="space-y-5">
              {!isRejected && (
                <div className="rounded-xl border-2 border-yellow-400 bg-slate-900 p-4">
                  <p className={`${textSize} text-yellow-100 font-semibold flex items-start gap-2`}>
                    <Mail className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Email verification complete. Admin review is the next step.</span>
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <h2 className={`${textSize} font-bold text-white`}>What happens next</h2>
                <ul className={`${textSize} text-white space-y-3 list-disc pl-6`}>
                  {isRejected ? (
                    <>
                      <li>Your account cannot access teacher courses or uploads.</li>
                      <li>Contact support if you believe this was a mistake.</li>
                      <li>You may register again with a different email if permitted by your institution.</li>
                    </>
                  ) : (
                    <>
                      <li>An administrator will review your department and profile details.</li>
                      <li>You will be able to sign in to the teacher dashboard after approval.</li>
                      <li>Until then, teacher pages remain unavailable for your account.</li>
                    </>
                  )}
                </ul>
              </div>

              {isRejected && (
                <div
                  className="rounded-xl border-2 border-red-400 bg-red-50 p-4"
                  role="alert"
                >
                  <p className={`${textSize} text-red-900 flex items-start gap-2`}>
                    <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      If you need help, contact your platform administrator or support team with the
                      email you used to register.
                    </span>
                  </p>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <Link href="/" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    className={`w-full ${textSize} font-bold py-3 border-2`}
                  >
                    Return to home
                  </Button>
                </Link>
                <Link href="/auth/login" className="block">
                  <Button
                    type="button"
                    className={`w-full ${textSize} bg-yellow-400 text-slate-950 font-bold py-3 rounded-lg hover:bg-yellow-300`}
                  >
                    Go to login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
