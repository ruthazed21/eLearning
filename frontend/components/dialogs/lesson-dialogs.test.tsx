/**
 * Tests for Lesson Management Dialogs - Task 4.8
 * Validates: Requirements US-1.4 (Lesson Management)
 * Covers: AddLessonDialog and EditLessonDialog with video file upload
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lessonsAPI
vi.mock('@/lib/api', () => ({
  lessonsAPI: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { lessonsAPI } from '@/lib/api';
import { AddLessonDialog } from './add-lesson-dialog';
import { EditLessonDialog } from './edit-lesson-dialog';

// ─── AddLessonDialog ──────────────────────────────────────────────────────────

describe('AddLessonDialog', () => {
  const defaultProps = {
    courseId: 1,
    open: true,
    onOpenChange: vi.fn(),
    onAdd: vi.fn(),
    nextOrder: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dialog with all required fields', () => {
    render(<AddLessonDialog {...defaultProps} />);
    expect(screen.getByLabelText(/lesson title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/order/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lesson video/i)).toBeInTheDocument();
  });

  it('pre-fills order with nextOrder value', () => {
    render(<AddLessonDialog {...defaultProps} />);
    const orderInput = screen.getByLabelText(/order/i) as HTMLInputElement;
    expect(orderInput.value).toBe('3');
  });

  it('shows a file input that accepts video files', () => {
    render(<AddLessonDialog {...defaultProps} />);
    const fileInput = document.getElementById('add-video') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toBe('video/*');
    expect(fileInput.type).toBe('file');
  });

  it('shows selected video filename after file selection', async () => {
    render(<AddLessonDialog {...defaultProps} />);
    const fileInput = document.getElementById('add-video') as HTMLInputElement;
    const file = new File(['video content'], 'lecture.mp4', { type: 'video/mp4' });

    await userEvent.upload(fileInput, file);

    expect(screen.getByText('lecture.mp4')).toBeInTheDocument();
  });

  it('shows remove button after file selection and clears on click', async () => {
    render(<AddLessonDialog {...defaultProps} />);
    const fileInput = document.getElementById('add-video') as HTMLInputElement;
    const file = new File(['video content'], 'lecture.mp4', { type: 'video/mp4' });

    await userEvent.upload(fileInput, file);
    expect(screen.getByText('lecture.mp4')).toBeInTheDocument();

    const removeBtn = screen.getByRole('button', { name: /remove selected video/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByText('lecture.mp4')).not.toBeInTheDocument();
    expect(screen.getByText(/click to upload a video file/i)).toBeInTheDocument();
  });

  it('calls lessonsAPI.create with correct data on submit (no video)', async () => {
    const mockLesson = {
      id: 10,
      title: 'New Lesson',
      duration_minutes: 45,
      order_index: 3,
      description: 'Test desc',
      video_url: null,
    };
    (lessonsAPI.create as any).mockResolvedValue(mockLesson);

    render(<AddLessonDialog {...defaultProps} />);

    await userEvent.type(screen.getByLabelText(/lesson title/i), 'New Lesson');
    await userEvent.clear(screen.getByLabelText(/duration/i));
    await userEvent.type(screen.getByLabelText(/duration/i), '45');
    await userEvent.type(screen.getByLabelText(/description/i), 'Test desc');

    fireEvent.click(screen.getByRole('button', { name: /add lesson/i }));

    await waitFor(() => expect(lessonsAPI.create).toHaveBeenCalledTimes(1));
    expect(lessonsAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 1,
        title: 'New Lesson',
        durationMinutes: 45,
        orderIndex: 3,
        description: 'Test desc',
        videoFile: null,
      })
    );
    expect(defaultProps.onAdd).toHaveBeenCalledWith(mockLesson);
  });

  it('calls lessonsAPI.create with video file when one is selected', async () => {
    const mockLesson = {
      id: 11,
      title: 'Video Lesson',
      duration_minutes: 30,
      order_index: 3,
      description: '',
      video_url: '/uploads/videos/video-123.mp4',
    };
    (lessonsAPI.create as any).mockResolvedValue(mockLesson);

    render(<AddLessonDialog {...defaultProps} />);

    await userEvent.type(screen.getByLabelText(/lesson title/i), 'Video Lesson');
    await userEvent.clear(screen.getByLabelText(/duration/i));
    await userEvent.type(screen.getByLabelText(/duration/i), '30');

    const fileInput = document.getElementById('add-video') as HTMLInputElement;
    const file = new File(['video content'], 'lecture.mp4', { type: 'video/mp4' });
    await userEvent.upload(fileInput, file);

    fireEvent.click(screen.getByRole('button', { name: /add lesson/i }));

    await waitFor(() => expect(lessonsAPI.create).toHaveBeenCalledTimes(1));
    const callArg = (lessonsAPI.create as any).mock.calls[0][0];
    expect(callArg.videoFile).toBeInstanceOf(File);
    expect(callArg.videoFile.name).toBe('lecture.mp4');
  });

  it('shows error message when create fails', async () => {
    (lessonsAPI.create as any).mockRejectedValue(new Error('Server error'));

    render(<AddLessonDialog {...defaultProps} />);

    await userEvent.type(screen.getByLabelText(/lesson title/i), 'Fail Lesson');
    await userEvent.clear(screen.getByLabelText(/duration/i));
    await userEvent.type(screen.getByLabelText(/duration/i), '10');

    fireEvent.click(screen.getByRole('button', { name: /add lesson/i }));

    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
    expect(defaultProps.onAdd).not.toHaveBeenCalled();
  });

  it('shows loading state while submitting', async () => {
    (lessonsAPI.create as any).mockReturnValue(new Promise(() => {}));

    render(<AddLessonDialog {...defaultProps} />);

    await userEvent.type(screen.getByLabelText(/lesson title/i), 'Loading Lesson');
    await userEvent.clear(screen.getByLabelText(/duration/i));
    await userEvent.type(screen.getByLabelText(/duration/i), '20');

    fireEvent.click(screen.getByRole('button', { name: /add lesson/i }));

    expect(await screen.findByText(/adding\.\.\./i)).toBeInTheDocument();
  });
});

// ─── EditLessonDialog ─────────────────────────────────────────────────────────

describe('EditLessonDialog', () => {
  const mockLesson = {
    id: 5,
    title: 'Existing Lesson',
    duration: '30',
    order: 2,
    description: 'Original description',
    video_url: '/uploads/videos/existing-video.mp4',
  };

  const defaultProps = {
    lesson: mockLesson,
    open: true,
    onOpenChange: vi.fn(),
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders null when lesson is null', () => {
    const { container } = render(
      <EditLessonDialog lesson={null} open={true} onOpenChange={vi.fn()} onSave={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('pre-fills form fields with existing lesson data', () => {
    render(<EditLessonDialog {...defaultProps} />);
    expect((screen.getByLabelText(/lesson title/i) as HTMLInputElement).value).toBe('Existing Lesson');
    expect((screen.getByLabelText(/duration/i) as HTMLInputElement).value).toBe('30');
    expect((screen.getByLabelText(/order/i) as HTMLInputElement).value).toBe('2');
    expect((screen.getByLabelText(/description/i) as HTMLTextAreaElement).value).toBe('Original description');
  });

  it('shows current video filename when video_url exists', () => {
    render(<EditLessonDialog {...defaultProps} />);
    expect(screen.getByText(/current: existing-video\.mp4/i)).toBeInTheDocument();
  });

  it('shows "click to replace video" label when existing video present', () => {
    render(<EditLessonDialog {...defaultProps} />);
    expect(screen.getByText(/click to replace video/i)).toBeInTheDocument();
  });

  it('shows "click to upload a video file" when no existing video', () => {
    const lessonNoVideo = { ...mockLesson, video_url: '' };
    render(<EditLessonDialog {...defaultProps} lesson={lessonNoVideo} />);
    expect(screen.getByText(/click to upload a video file/i)).toBeInTheDocument();
  });

  it('shows selected video filename after new file selection', async () => {
    render(<EditLessonDialog {...defaultProps} />);
    const fileInput = document.getElementById('edit-video') as HTMLInputElement;
    const file = new File(['video content'], 'new-lecture.mp4', { type: 'video/mp4' });

    await userEvent.upload(fileInput, file);

    expect(screen.getByText('new-lecture.mp4')).toBeInTheDocument();
    // Current video label should be hidden once new file selected
    expect(screen.queryByText(/current: existing-video\.mp4/i)).not.toBeInTheDocument();
  });

  it('calls lessonsAPI.update with correct data on submit (no new video)', async () => {
    const updatedData = {
      id: 5,
      title: 'Updated Lesson',
      duration_minutes: 45,
      order_index: 2,
      description: 'Updated description',
      video_url: '/uploads/videos/existing-video.mp4',
    };
    (lessonsAPI.update as any).mockResolvedValue(updatedData);

    render(<EditLessonDialog {...defaultProps} />);

    const titleInput = screen.getByLabelText(/lesson title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Updated Lesson');

    const durationInput = screen.getByLabelText(/duration/i);
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, '45');

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(lessonsAPI.update).toHaveBeenCalledTimes(1));
    expect(lessonsAPI.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        title: 'Updated Lesson',
        durationMinutes: 45,
        orderIndex: 2,
        videoFile: null,
      })
    );
    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, title: 'Updated Lesson' })
    );
  });

  it('calls lessonsAPI.update with video file when new file selected', async () => {
    const updatedData = {
      id: 5,
      title: 'Existing Lesson',
      duration_minutes: 30,
      order_index: 2,
      description: 'Original description',
      video_url: '/uploads/videos/new-video.mp4',
    };
    (lessonsAPI.update as any).mockResolvedValue(updatedData);

    render(<EditLessonDialog {...defaultProps} />);

    const fileInput = document.getElementById('edit-video') as HTMLInputElement;
    const file = new File(['video content'], 'new-video.mp4', { type: 'video/mp4' });
    await userEvent.upload(fileInput, file);

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(lessonsAPI.update).toHaveBeenCalledTimes(1));
    const callArg = (lessonsAPI.update as any).mock.calls[0][1];
    expect(callArg.videoFile).toBeInstanceOf(File);
    expect(callArg.videoFile.name).toBe('new-video.mp4');
  });

  it('shows error message when update fails', async () => {
    (lessonsAPI.update as any).mockRejectedValue(new Error('Update failed'));

    render(<EditLessonDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/update failed/i)).toBeInTheDocument();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('shows loading state while submitting', async () => {
    (lessonsAPI.update as any).mockReturnValue(new Promise(() => {}));

    render(<EditLessonDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/saving\.\.\./i)).toBeInTheDocument();
  });

  it('resets video selection when lesson prop changes', async () => {
    const { rerender } = render(<EditLessonDialog {...defaultProps} />);

    const fileInput = document.getElementById('edit-video') as HTMLInputElement;
    const file = new File(['video content'], 'temp.mp4', { type: 'video/mp4' });
    await userEvent.upload(fileInput, file);
    expect(screen.getByText('temp.mp4')).toBeInTheDocument();

    // Change lesson prop
    const newLesson = { ...mockLesson, id: 6, title: 'Another Lesson', video_url: '' };
    rerender(<EditLessonDialog {...defaultProps} lesson={newLesson} />);

    // Video selection should be cleared
    expect(screen.queryByText('temp.mp4')).not.toBeInTheDocument();
  });
});
