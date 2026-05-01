'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <PublicHeader />
      <main id="main-content" className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-white/20 overflow-hidden">
          <div className="p-8 lg:p-10 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-10 w-10 text-slate-950" aria-hidden="true" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950 mb-2">Forgot password</h1>
              <p className="text-base text-slate-600">
                Password reset is not available in the app yet. Please contact your administrator or
                use the support channel your institution provided.
              </p>
            </div>
            <Button
              asChild
              className="w-full bg-yellow-400 text-slate-950 font-bold hover:bg-yellow-300"
            >
              <Link href="/auth/login">Back to login</Link>
            </Button>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
