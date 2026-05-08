'use client';

import { useState, useEffect } from 'react';
import { lessonsAPI } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, X, Video } from 'lucide-react';

interface Lesson {
  id: number;
  title: string;
  duration: string;
  order: number;
  description?: string;
  video_url?: string;
  subtitle_url?: string;
  document_url?: string;
}

interface EditLessonDialogProps {
  lesson: Lesson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lesson: Lesson) => void;
}

export function EditLessonDialog({ lesson, open, onOpenChange, onSave }: EditLessonDialogProps) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [order, setOrder] = useState(1);
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setDuration(lesson.duration.toString());
      setOrder(lesson.order);
      setDescription(lesson.description || '');
      setVideoFile(null);
      setSubtitleFile(null);
      setDocumentFile(null);
      setError('');
    }
  }, [lesson]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setVideoFile(file);
  };

  const handleSubtitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSubtitleFile(file);
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setDocumentFile(file);
  };

  const clearVideo = () => {
    setVideoFile(null);
    const input = document.getElementById('edit-video') as HTMLInputElement;
    if (input) input.value = '';
  };

  const clearSubtitle = () => {
    setSubtitleFile(null);
    const input = document.getElementById('edit-subtitle') as HTMLInputElement;
    if (input) input.value = '';
  };

  const clearDocument = () => {
    setDocumentFile(null);
    const input = document.getElementById('edit-document') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;

    if (!videoFile && !documentFile && !lesson.video_url && !lesson.document_url) {
      setError('Please include either a video or a document for this lesson.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const data = await lessonsAPI.update(lesson.id, {
        title,
        description,
        orderIndex: order,
        durationMinutes: parseInt(duration) || 0,
        videoFile: videoFile ?? null,
        subtitleFile: subtitleFile ?? null,
        documentFile: documentFile ?? null,
      });

      onSave({
        id: data.id,
        title: data.title,
        duration: data.duration_minutes?.toString() || '0',
        order: data.order_index,
        description: data.description || '',
        video_url: data.video_url || '',
        subtitle_url: data.subtitle_url || '',
        document_url: data.document_url || '',
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to update lesson:', err);
      setError(err.message || 'Failed to update lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lesson) return null;

  // Extract filename from existing video_url for display
  const existingVideoName = lesson.video_url
    ? lesson.video_url.split('/').pop()
    : null;

  // Extract filename from existing subtitle_url for display
  const existingSubtitleName = lesson.subtitle_url
    ? lesson.subtitle_url.split('/').pop()
    : null;

  // Extract filename from existing document_url for display
  const existingDocumentName = lesson.document_url
    ? lesson.document_url.split('/').pop()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>
              Update the lesson details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Lesson Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to React Hooks"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-duration">Duration (minutes) *</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 30"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-order">Order *</Label>
                <Input
                  id="edit-order"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value))}
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the lesson content..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-video">Lesson Video</Label>
              {/* Show existing video if present and no new file selected */}
              {existingVideoName && !videoFile && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mb-1">
                  <Video className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
                  <span className="text-sm text-blue-700 truncate flex-1">Current: {existingVideoName}</span>
                </div>
              )}
              {videoFile ? (
                <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded-md">
                  <Upload className="h-4 w-4 text-gray-500 shrink-0" aria-hidden="true" />
                  <span className="text-sm text-gray-700 truncate flex-1">{videoFile.name}</span>
                  <button
                    type="button"
                    onClick={clearVideo}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Remove selected video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="edit-video"
                  className="flex items-center gap-2 p-2 border border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Upload className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <span className="text-sm text-gray-500">
                    {existingVideoName ? 'Click to replace video' : 'Click to upload a video file'}
                  </span>
                  <Input
                    id="edit-video"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoChange}
                  />
                </label>
              )}
              <p className="text-xs text-gray-400">Accepted formats: MP4, WebM, MOV, AVI (max 500 MB)</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-subtitle">Subtitles/Captions</Label>
              {/* Show existing subtitle if present and no new file selected */}
              {existingSubtitleName && !subtitleFile && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mb-1">
                  <Video className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
                  <span className="text-sm text-blue-700 truncate flex-1">Current: {existingSubtitleName}</span>
                </div>
              )}
              {subtitleFile ? (
                <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded-md">
                  <Upload className="h-4 w-4 text-gray-500 shrink-0" aria-hidden="true" />
                  <span className="text-sm text-gray-700 truncate flex-1">{subtitleFile.name}</span>
                  <button
                    type="button"
                    onClick={clearSubtitle}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Remove selected subtitle file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="edit-subtitle"
                  className="flex items-center gap-2 p-2 border border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Upload className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <span className="text-sm text-gray-500">
                    {existingSubtitleName ? 'Click to replace subtitle file' : 'Click to upload a subtitle file'}
                  </span>
                  <Input
                    id="edit-subtitle"
                    type="file"
                    accept=".vtt"
                    className="hidden"
                    onChange={handleSubtitleChange}
                  />
                </label>
              )}
              <p className="text-xs text-gray-400">Accepted format: VTT (WebVTT) files for accessibility</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-document">Lesson Document</Label>
              {existingDocumentName && !documentFile && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mb-1">
                  <Upload className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
                  <span className="text-sm text-blue-700 truncate flex-1">Current: {existingDocumentName}</span>
                </div>
              )}
              {documentFile ? (
                <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded-md">
                  <Upload className="h-4 w-4 text-gray-500 shrink-0" aria-hidden="true" />
                  <span className="text-sm text-gray-700 truncate flex-1">{documentFile.name}</span>
                  <button
                    type="button"
                    onClick={clearDocument}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Remove selected document file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="edit-document"
                  className="flex items-center gap-2 p-2 border border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Upload className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <span className="text-sm text-gray-500">
                    {existingDocumentName ? 'Click to replace document' : 'Click to upload a document'}
                  </span>
                  <Input
                    id="edit-document"
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    className="hidden"
                    onChange={handleDocumentChange}
                  />
                </label>
              )}
              <p className="text-xs text-gray-400">Accepted formats: PDF, PPT, PPTX</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
