/**
 * Tests for Teacher Upload Page - Task 9.7
 * Validates: Requirements US-2.3 (Course Creation)
 * Properties: P2.3.1, P2.3.2, P2.3.3, P2.3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// jsdom doesn't implement scrollIntoView - needed by Radix UI Select
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/teacher/upload',
}));

// Mock auth context — teacher user
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 42, role: 'teacher', full_name: 'Jane Teacher' },
    loading: false,
  }),
}));

// Mock DashboardLayout to render children directly
vi.mock('@/components/dashboard-layout-new', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock KeyboardShortcutsHelp
vi.mock('@/components/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsHelp: () => null,
}));

// Mock API
vi.mock('@/lib/api', () => ({
  coursesAPI: {
    getTeacherCourses: vi.fn(),
    create: vi.fn(),
  },
  lessonsAPI: {
    getByCourse: vi.fn(),
    create: vi.fn(),
  },
}));

import { coursesAPI, lessonsAPI } from '@/lib/api';
import UploadPage from './page';

const mockCourses = [
  { id: 1, title: 'Python Basics', status: 'active' },
  { id: 2, title: 'Web Dev 101', status: 'draft' },
];

// Helper: switch to Add Lesson tab
const switchToAddLesson = () => {
  fireEvent.click(screen.getByTestId('tab-add-lesson'));
};

// Helper: switch to Create Course tab
const switchToCreateCourse = () => {
  fireEvent.click(screen.getByTestId('tab-create-course'));
};

beforeEach(() => {
  vi.clearAllMocks();
  (coursesAPI.getTeacherCourses as any).mockResolvedValue(mockCourses);
  (coursesAPI.create as any).mockResolvedValue({ id: 99, title: 'New Course' });
  (lessonsAPI.getByCourse as any).mockResolvedValue([]);
  (lessonsAPI.create as any).mockResolvedValue({ id: 10, title: 'Lesson 1' });
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('Teacher Upload Page - Rendering', () => {
  it('renders the page with tab switcher', async () => {
    render(<UploadPage />);
    expect(screen.getByText('Course & Lesson Upload')).toBeInTheDocument();
    expect(screen.getByTestId('tab-create-course')).toBeInTheDocument();
    expect(screen.getByTestId('tab-add-lesson')).toBeInTheDocument();
  });

  it('shows Create Course form by default', () => {
    render(<UploadPage />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('switches to Add Lesson tab when clicked', async () => {
    render(<UploadPage />);
    switchToAddLesson();
    expect(await screen.findByLabelText(/lesson title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/video file/i)).toBeInTheDocument();
  });
});

// ─── 9.1 Course creation ─────────────────────────────────────────────────────

describe('Teacher Upload Page - Course Creation (9.1)', () => {
  it('calls coursesAPI.create with correct data including teacher_id (P2.3.1)', async () => {
    render(<UploadPage />);

    await userEvent.type(screen.getByLabelText(/title/i), 'My New Course');
    await userEvent.type(screen.getByLabelText(/description/i), 'A great course');

    // Select category via Radix Select — open then click option
    fireEvent.click(screen.getByRole('combobox', { name: /category/i }));
    await screen.findByRole('option', { name: 'Technology' });
    fireEvent.click(screen.getByRole('option', { name: 'Technology' }));

    fireEvent.submit(screen.getByRole('button', { name: /create course/i }).closest('form')!);

    await waitFor(() => expect(coursesAPI.create).toHaveBeenCalledTimes(1));

    const callArg = (coursesAPI.create as any).mock.calls[0][0];
    expect(callArg.title).toBe('My New Course');
    expect(callArg.description).toBe('A great course');
    expect(callArg.category).toBe('Technology');
    // P2.3.1: teacher_id must equal current user's id
    expect(callArg.teacherId).toBe(42);
  });

  it('shows success message after course creation (9.6)', async () => {
    render(<UploadPage />);

    await userEvent.type(screen.getByLabelText(/title/i), 'My Course');
    await userEvent.type(screen.getByLabelText(/description/i), 'Description here');

    fireEvent.click(screen.getByRole('combobox', { name: /category/i }));
    await screen.findByRole('option', { name: 'Science' });
    fireEvent.click(screen.getByRole('option', { name: 'Science' }));

    fireEvent.submit(screen.getByRole('button', { name: /create course/i }).closest('form')!);

    expect(await screen.findByText(/course created successfully/i)).toBeInTheDocument();
  });

  it('resets form after successful course creation', async () => {
    render(<UploadPage />);

    const titleInput = screen.getByLabelText(/title/i);
    await userEvent.type(titleInput, 'Temp Course');
    await userEvent.type(screen.getByLabelText(/description/i), 'Temp desc');

    fireEvent.click(screen.getByRole('combobox', { name: /category/i }));
    await screen.findByRole('option', { name: 'Mathematics' });
    fireEvent.click(screen.getByRole('option', { name: 'Mathematics' }));

    fireEvent.submit(screen.getByRole('button', { name: /create course/i }).closest('form')!);

    await waitFor(() => expect(coursesAPI.create).toHaveBeenCalled());
    await waitFor(() => expect((titleInput as HTMLInputElement).value).toBe(''));
  });

  it('refreshes courses list after creation (P2.3.4)', async () => {
    render(<UploadPage />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Fresh Course');
    await userEvent.type(screen.getByLabelText(/description/i), 'Fresh desc');

    fireEvent.click(screen.getByRole('combobox', { name: /category/i }));
    await screen.findByRole('option', { name: 'Arts' });
    fireEvent.click(screen.getByRole('option', { name: 'Arts' }));

    fireEvent.submit(screen.getByRole('button', { name: /create course/i }).closest('form')!);

    await waitFor(() =>
      expect(coursesAPI.getTeacherCourses).toHaveBeenCalledTimes(2)
    );
  });
});

// ─── 9.2 Form validation ─────────────────────────────────────────────────────

describe('Teacher Upload Page - Form Validation (9.2)', () => {
  it('shows error when course title is empty (P2.3.2)', async () => {
    render(<UploadPage />);

    await userEvent.type(screen.getByLabelText(/description/i), 'Some description');
    fireEvent.click(screen.getByRole('combobox', { name: /category/i }));
    await screen.findByRole('option', { name: 'Technology' });
    fireEvent.click(screen.getByRole('option', { name: 'Technology' }));

    fireEvent.submit(screen.getByRole('button', { name: /create course/i }).closest('form')!);

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(coursesAPI.create).not.toHaveBeenCalled();
  });

  it('shows error when course description is empty (P2.3.2)', async () => {
    render(<UploadPage />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Some Title');
    fireEvent.click(screen.getByRole('combobox', { name: /category/i }));
    await screen.findByRole('option', { name: 'Technology' });
    fireEvent.click(screen.getByRole('option', { name: 'Technology' }));

    fireEvent.submit(screen.getByRole('button', { name: /create course/i }).closest('form')!);

    expect(await screen.findByText(/description is required/i)).toBeInTheDocument();
    expect(coursesAPI.create).not.toHaveBeenCalled();
  });

  it('shows error when category is not selected (P2.3.2)', async () => {
    render(<UploadPage />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Some Title');
    await userEvent.type(screen.getByLabelText(/description/i), 'Some desc');

    fireEvent.submit(screen.getByRole('button', { name: /create course/i }).closest('form')!);

    expect(await screen.findByText(/select a category/i)).toBeInTheDocument();
    expect(coursesAPI.create).not.toHaveBeenCalled();
  });

  it('shows error when lesson course is not selected', async () => {
    render(<UploadPage />);
    switchToAddLesson();

    await userEvent.type(await screen.findByLabelText(/lesson title/i), 'Lesson 1');

    // Attach a fake video file
    const videoInput = screen.getByLabelText(/video file/i);
    const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
    await userEvent.upload(videoInput, file);

    fireEvent.submit(screen.getByRole('button', { name: /add lesson/i }).closest('form')!);

    expect(await screen.findByText(/select a course for this lesson/i)).toBeInTheDocument();
    expect(lessonsAPI.create).not.toHaveBeenCalled();
  });

  it('shows error when lesson title is empty', async () => {
    render(<UploadPage />);
    switchToAddLesson();

    await waitFor(() => expect(coursesAPI.getTeacherCourses).toHaveBeenCalled());

    // Select a course
    fireEvent.click(await screen.findByRole('combobox', { name: /course/i }));
    await screen.findByRole('option', { name: 'Python Basics' });
    fireEvent.click(screen.getByRole('option', { name: 'Python Basics' }));

    const videoInput = screen.getByLabelText(/video file/i);
    const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
    await userEvent.upload(videoInput, file);

    fireEvent.submit(screen.getByRole('button', { name: /add lesson/i }).closest('form')!);

    expect(await screen.findByText(/lesson title is required/i)).toBeInTheDocument();
    expect(lessonsAPI.create).not.toHaveBeenCalled();
  });

  it('shows error when no video file is selected', async () => {
    render(<UploadPage />);
    switchToAddLesson();

    await waitFor(() => expect(coursesAPI.getTeacherCourses).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('combobox', { name: /course/i }));
    await screen.findByRole('option', { name: 'Python Basics' });
    fireEvent.click(screen.getByRole('option', { name: 'Python Basics' }));

    await userEvent.type(await screen.findByLabelText(/lesson title/i), 'My Lesson');

    fireEvent.submit(screen.getByRole('button', { name: /add lesson/i }).closest('form')!);

    expect(await screen.findByText(/select a video file/i)).toBeInTheDocument();
    expect(lessonsAPI.create).not.toHaveBeenCalled();
  });
});

// ─── 9.3 Lesson creation ─────────────────────────────────────────────────────

describe('Teacher Upload Page - Lesson Creation (9.3)', () => {
  it('calls lessonsAPI.create with videoFile (File object, not URL)', async () => {
    render(<UploadPage />);
    switchToAddLesson();

    await waitFor(() => expect(coursesAPI.getTeacherCourses).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('combobox', { name: /course/i }));
    await screen.findByRole('option', { name: 'Python Basics' });
    fireEvent.click(screen.getByRole('option', { name: 'Python Basics' }));

    await userEvent.type(await screen.findByLabelText(/lesson title/i), 'Intro Lesson');

    const videoInput = screen.getByLabelText(/video file/i);
    const file = new File(['video content'], 'intro.mp4', { type: 'video/mp4' });
    await userEvent.upload(videoInput, file);

    fireEvent.submit(screen.getByRole('button', { name: /add lesson/i }).closest('form')!);

    await waitFor(() => expect(lessonsAPI.create).toHaveBeenCalledTimes(1));

    const callArg = (lessonsAPI.create as any).mock.calls[0][0];
    expect(callArg.courseId).toBe(1);
    expect(callArg.title).toBe('Intro Lesson');
    // videoFile must be a File object, not a string URL
    expect(callArg.videoFile).toBeInstanceOf(File);
    expect(callArg.videoFile.name).toBe('intro.mp4');
  });

  it('shows success message after lesson creation (9.6)', async () => {
    render(<UploadPage />);
    switchToAddLesson();

    await waitFor(() => expect(coursesAPI.getTeacherCourses).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('combobox', { name: /course/i }));
    await screen.findByRole('option', { name: 'Python Basics' });
    fireEvent.click(screen.getByRole('option', { name: 'Python Basics' }));

    await userEvent.type(await screen.findByLabelText(/lesson title/i), 'Lesson A');

    const videoInput = screen.getByLabelText(/video file/i);
    await userEvent.upload(videoInput, new File(['v'], 'v.mp4', { type: 'video/mp4' }));

    fireEvent.submit(screen.getByRole('button', { name: /add lesson/i }).closest('form')!);

    expect(await screen.findByText(/lesson added successfully/i)).toBeInTheDocument();
  });

  it('resets lesson form after successful creation', async () => {
    render(<UploadPage />);
    switchToAddLesson();

    await waitFor(() => expect(coursesAPI.getTeacherCourses).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('combobox', { name: /course/i }));
    await screen.findByRole('option', { name: 'Python Basics' });
    fireEvent.click(screen.getByRole('option', { name: 'Python Basics' }));

    const titleInput = await screen.findByLabelText(/lesson title/i);
    await userEvent.type(titleInput, 'Temp Lesson');

    const videoInput = screen.getByLabelText(/video file/i);
    await userEvent.upload(videoInput, new File(['v'], 'v.mp4', { type: 'video/mp4' }));

    fireEvent.submit(screen.getByRole('button', { name: /add lesson/i }).closest('form')!);

    await waitFor(() => expect(lessonsAPI.create).toHaveBeenCalled());
    await waitFor(() => expect((titleInput as HTMLInputElement).value).toBe(''));
  });
});

// ─── 9.4 Multiple lesson additions ───────────────────────────────────────────

describe('Teacher Upload Page - Multiple Lessons (9.4)', () => {
  it('calculates correct orderIndex for second lesson', async () => {
    // First lesson already exists
    (lessonsAPI.getByCourse as any).mockResolvedValue([{ id: 5, order_index: 1 }]);

    render(<UploadPage />);
    switchToAddLesson();

    await waitFor(() => expect(coursesAPI.getTeacherCourses).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('combobox', { name: /course/i }));
    await screen.findByRole('option', { name: 'Python Basics' });
    fireEvent.click(screen.getByRole('option', { name: 'Python Basics' }));

    await userEvent.type(await screen.findByLabelText(/lesson title/i), 'Second Lesson');

    const videoInput = screen.getByLabelText(/video file/i);
    await userEvent.upload(videoInput, new File(['v'], 'v.mp4', { type: 'video/mp4' }));

    fireEvent.submit(screen.getByRole('button', { name: /add lesson/i }).closest('form')!);

    await waitFor(() => expect(lessonsAPI.create).toHaveBeenCalled());
    const callArg = (lessonsAPI.create as any).mock.calls[0][0];
    expect(callArg.orderIndex).toBe(2);
  });
});

// ─── 9.5 Teacher ID ──────────────────────────────────────────────────────────

describe('Teacher Upload Page - Teacher ID (9.5, P2.3.1)', () => {
  it('sets teacherId to current user id when creating course', async () => {
    render(<UploadPage />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Course X');
    await userEvent.type(screen.getByLabelText(/description/i), 'Desc X');

    fireEvent.click(screen.getByRole('combobox', { name: /category/i }));
    await screen.findByRole('option', { name: 'Other' });
    fireEvent.click(screen.getByRole('option', { name: 'Other' }));

    fireEvent.submit(screen.getByRole('button', { name: /create course/i }).closest('form')!);

    await waitFor(() => expect(coursesAPI.create).toHaveBeenCalled());
    expect((coursesAPI.create as any).mock.calls[0][0].teacherId).toBe(42);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('Teacher Upload Page - Error Handling', () => {
  it('shows error message when course creation fails', async () => {
    (coursesAPI.create as any).mockRejectedValue(new Error('Server error'));

    render(<UploadPage />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Bad Course');
    await userEvent.type(screen.getByLabelText(/description/i), 'Desc');

    fireEvent.click(screen.getByRole('combobox', { name: /category/i }));
    await screen.findByRole('option', { name: 'Technology' });
    fireEvent.click(screen.getByRole('option', { name: 'Technology' }));

    fireEvent.submit(screen.getByRole('button', { name: /create course/i }).closest('form')!);

    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
  });

  it('shows error message when lesson creation fails', async () => {
    (lessonsAPI.create as any).mockRejectedValue(new Error('Upload failed'));

    render(<UploadPage />);
    switchToAddLesson();

    await waitFor(() => expect(coursesAPI.getTeacherCourses).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('combobox', { name: /course/i }));
    await screen.findByRole('option', { name: 'Python Basics' });
    fireEvent.click(screen.getByRole('option', { name: 'Python Basics' }));

    await userEvent.type(await screen.findByLabelText(/lesson title/i), 'Fail Lesson');

    const videoInput = screen.getByLabelText(/video file/i);
    await userEvent.upload(videoInput, new File(['v'], 'v.mp4', { type: 'video/mp4' }));

    fireEvent.submit(screen.getByRole('button', { name: /add lesson/i }).closest('form')!);

    expect(await screen.findByText(/upload failed/i)).toBeInTheDocument();
  });
});
