import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, User } from 'lucide-react';
import { EnrollCourseDialog } from '@/components/dialogs/enroll-course-dialog';

interface CourseCardProps {
  id: string;
  title: string;
  instructor: string;
  thumbnail?: string;
  progress?: number;
  duration?: string;
  lessons?: number;
  enrolled?: boolean;
  onEnrolled?: () => void;
}

export function CourseCard({
  id,
  title,
  instructor,
  thumbnail,
  progress = 0,
  duration = '4 weeks',
  lessons = 12,
  enrolled = false,
  onEnrolled,
}: CourseCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div
        className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
        role="img"
        aria-label={`${title} course thumbnail`}
      >
        <BookOpen className="h-16 w-16 text-white" aria-hidden="true" />
      </div>

      <CardHeader>
        <CardTitle className="line-clamp-2">{title}</CardTitle>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" aria-hidden="true" />
          <span>{instructor}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>{lessons} lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{duration}</span>
          </div>
        </div>

        {progress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} aria-label={`Course progress: ${progress}%`} />
          </div>
        )}
      </CardContent>

      <CardFooter>
        {enrolled ? (
          <Link href={`/student/course/${id}`} className="w-full">
            <Button className="w-full" size="lg">
              {progress > 0 ? 'Continue Learning' : 'Start Course'}
            </Button>
          </Link>
        ) : (
          <EnrollCourseDialog courseId={id} courseTitle={title} onSuccess={onEnrolled} />
        )}
      </CardFooter>
    </Card>
  );
}
