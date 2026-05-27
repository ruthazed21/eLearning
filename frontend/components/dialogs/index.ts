/**
 * Lazy-loaded dialog components using Next.js dynamic imports.
 * This enables code splitting so dialog code is only loaded when needed.
 */
import dynamic from 'next/dynamic';

const loadingFallback = null; // dialogs are hidden until opened, no spinner needed

export const AddCourseDialog = dynamic(
  () => import('./add-course-dialog').then(m => ({ default: m.AddCourseDialog })),
  { ssr: false, loading: () => loadingFallback }
);

export const EditCourseDialog = dynamic(
  () => import('./edit-course-dialog').then(m => ({ default: m.EditCourseDialog })),
  { ssr: false, loading: () => loadingFallback }
);

export const AddLessonDialog = dynamic(
  () => import('./add-lesson-dialog').then(m => ({ default: m.AddLessonDialog })),
  { ssr: false, loading: () => loadingFallback }
);

export const EditLessonDialog = dynamic(
  () => import('./edit-lesson-dialog').then(m => ({ default: m.EditLessonDialog })),
  { ssr: false, loading: () => loadingFallback }
);

export const AddUserDialog = dynamic(
  () => import('./add-user-dialog').then(m => ({ default: m.AddUserDialog })),
  { ssr: false, loading: () => loadingFallback }
);

export const TeacherStatusDialog = dynamic(
  () => import('./teacher-status-dialog').then(m => ({ default: m.TeacherStatusDialog })),
  { ssr: false, loading: () => loadingFallback }
);

export const DeleteConfirmDialog = dynamic(
  () => import('./delete-confirm-dialog').then(m => ({ default: m.DeleteConfirmDialog })),
  { ssr: false, loading: () => loadingFallback }
);

export const EnrollCourseDialog = dynamic(
  () => import('./enroll-course-dialog').then(m => ({ default: m.EnrollCourseDialog })),
  { ssr: false, loading: () => loadingFallback }
);
