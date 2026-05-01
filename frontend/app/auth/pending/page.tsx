'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Clock, CheckCircle, Mail } from 'lucide-react';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-yellow-100 p-4 rounded-full">
              <Clock className="h-12 w-12 text-yellow-600" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
          <CardDescription>
            Your registration has been submitted successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              Thank you for registering! Your account is currently pending admin approval. 
              You will receive an email notification once your account has been approved.
            </p>
          </div>

          {/* What Happens Next */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">What happens next?</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-blue-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-sm">Admin Review</p>
                  <p className="text-sm text-gray-600">
                    An administrator will review your registration details
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                  <Mail className="h-5 w-5 text-blue-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-sm">Email Notification</p>
                  <p className="text-sm text-gray-600">
                    You'll receive an email when your account is approved
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                  <GraduationCap className="h-5 w-5 text-blue-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-sm">Start Learning</p>
                  <p className="text-sm text-gray-600">
                    Once approved, you can login and access all courses
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-700">
              <strong>Note:</strong> Approval typically takes 1-2 business days. 
              If you don't receive a response within 3 days, please contact support.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                Return to Home
              </Button>
            </Link>
            <p className="text-center text-sm text-gray-600">
              Already approved?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
