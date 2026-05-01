'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, AlertCircle } from 'lucide-react';
import { enrollmentsAPI } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface EnrollCourseDialogProps {
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

export function EnrollCourseDialog({ courseId, courseTitle, onSuccess }: EnrollCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState('');

  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);
      setError('');
      await enrollmentsAPI.enroll(parseInt(courseId));
      setIsEnrolling(false);
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Enrolling in course error:', err);
      setError(err.message || 'Enrollment failed. Please try again.');
      setIsEnrolling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <BookOpen className="h-5 w-5 mr-2" aria-hidden="true" />
          Enroll Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enroll in Course</DialogTitle>
          <DialogDescription>
            You are about to enroll in this course.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">{courseTitle}</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Access to all course materials</li>
              <li>• Video lessons and downloadable resources</li>
              <li>• Quizzes and assignments</li>
              <li>• Certificate upon completion</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleEnroll} disabled={isEnrolling}>
            {isEnrolling ? 'Enrolling...' : 'Confirm Enrollment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
