'use client';

import { useState } from 'react';
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
import { Loader2, Upload, X } from 'lucide-react';

interface AddLessonDialogProps {
  courseId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (lesson: any) => void;
  nextOrder: number;
}

export function AddLessonDialog({ courseId, open, onOpenChange, onAdd, nextOrder }: AddLessonDialogProps) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [order, setOrder] = useState(nextOrder);
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setVideoFile(file);
  };

  const handleSubtitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSubtitleFile(file);
  };

  const clearVideo = () => {
    setVideoFile(null);
    // Reset the file input
    const input = document.getElementById('add-video') as HTMLInputElement;
    if (input) input.value = '';
  };

  const clearSubtitle = () => {
    setSubtitleFile(null);
    // Reset the file input
    const input = document.getElementById('add-subtitle') as HTMLInputElement;
    if (input) input.value = '';
  };

  const resetForm = () => {
    setTitle('');
    setDuration('');
    setOrder(nextOrder + 1);
    setDescription('');
    setVideoFile(null);
    setSubtitleFile(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const data = await lessonsAPI.create({
        courseId,
        title,
        description,
        orderIndex: order,
        durationMinutes: parseInt(duration) || 0,
        videoFile: videoFile ?? null,
        subtitleFile: subtitleFile ?? null,
      });

      onAdd(data);
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to add lesson:', err);
      setError(err.message || 'Failed to add lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetForm(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Lesson</DialogTitle>
            <DialogDescription>
              Add a new lesson to this course. Fill in the lesson details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="add-title">Lesson Title *</Label>
              <Input
                id="add-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to React Hooks"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-duration">Duration (minutes) *</Label>
                <Input
                  id="add-duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 30"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-order">Order *</Label>
                <Input
                  id="add-order"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value))}
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-description">Description (Optional)</Label>
              <Textarea
                id="add-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the lesson content..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-video">Lesson Video (Optional)</Label>
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
                  htmlFor="add-video"
                  className="flex items-center gap-2 p-2 border border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Upload className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <span className="text-sm text-gray-500">Click to upload a video file</span>
                  <Input
                    id="add-video"
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
              <Label htmlFor="add-subtitle">Subtitles/Captions (Optional)</Label>
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
                  htmlFor="add-subtitle"
                  className="flex items-center gap-2 p-2 border border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Upload className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <span className="text-sm text-gray-500">Click to upload a subtitle file</span>
                  <Input
                    id="add-subtitle"
                    type="file"
                    accept=".vtt"
                    className="hidden"
                    onChange={handleSubtitleChange}
                  />
                </label>
              )}
              <p className="text-xs text-gray-400">Accepted format: VTT (WebVTT) files for accessibility</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Adding...' : 'Add Lesson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
