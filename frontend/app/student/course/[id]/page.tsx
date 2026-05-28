'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { RouteGuard } from '@/lib/route-guard';
import { DashboardLayout } from '@/components/dashboard-layout-new';
import { VideoPlayer } from '@/components/video-player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { getServerOrigin, coursesAPI, progressAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EnrollCourseDialog } from '@/components/dialogs/enroll-course-dialog';
import {
  Volume2,
  Download,
  ChevronRight,
  CheckCircle,
  Circle,
  Loader2,
  AlertCircle,
  BookOpen,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Helper to format audio playback time (M:SS)
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Helper to construct full video URL from backend path
const getVideoUrl = (videoPath: string | null | undefined): string | undefined => {
  if (!videoPath) return undefined;
  if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    return videoPath;
  }
  const baseUrl = getServerOrigin();
  return `${baseUrl}${videoPath}`;
};

// Helper to construct full subtitle URL from backend path
const getSubtitleUrl = (subtitlePath: string | null | undefined): string | undefined => {
  if (!subtitlePath) return undefined;
  if (subtitlePath.startsWith('http://') || subtitlePath.startsWith('https://')) {
    return subtitlePath;
  }
  const baseUrl = getServerOrigin();
  return `${baseUrl}${subtitlePath}`;
};

// Helper to construct full audio URL from backend path
const getAudioUrl = (audioPath: string | null | undefined): string | undefined => {
  if (!audioPath) return undefined;
  if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
    return audioPath;
  }
  const baseUrl = getServerOrigin();
  return `${baseUrl}${audioPath}`;
};

// Helper to construct full document URL from backend path
const getDocumentUrl = (docPath: string | null | undefined): string | undefined => {
  if (!docPath) return undefined;
  if (docPath.startsWith('http://') || docPath.startsWith('https://')) {
    return docPath;
  }
  const baseUrl = getServerOrigin();
  return `${baseUrl}${docPath}`;
};

export default function CourseDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const router = useRouter();
  
  // Base Course and Lesson States
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [markedCompleted, setMarkedCompleted] = useState<number[]>([]);

  // Accessibility & Browser TTS States
  const [accessibilityMode, setAccessibilityMode] = useState<'default' | 'blind' | 'deaf'>('default');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Custom Audio Player States for SAPI TTS file
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Sync Accessibility Mode with Header selection
  useEffect(() => {
    const saved = localStorage.getItem('accessibilityMode') as any;
    if (saved) {
      setAccessibilityMode(saved);
    }

    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setAccessibilityMode(customEvent.detail);
      }
    };

    window.addEventListener('accessibility-mode-change', handleModeChange);
    return () => window.removeEventListener('accessibility-mode-change', handleModeChange);
  }, []);

  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const courseId = parseInt(params.id);
      const courseData = (await coursesAPI.getById(courseId)) as any;

      setCourse(courseData);
      setLessons(courseData.lessons || []);

      if (courseData.lessons && courseData.lessons.length > 0) {
        setCurrentLesson(courseData.lessons[0]);
      }

      if (courseData.is_enrolled) {
        const progressData = (await progressAPI.getByCourse(courseId)) as any;
        const completedIds = progressData.lessons
          .filter((l: any) => l.completed)
          .map((l: any) => l.lesson_id);
        setMarkedCompleted(completedIds);
      }
    } catch (err: any) {
      console.error('Failed to fetch course detail:', err);
      setError(err.message || 'Failed to load course details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  // Audio Handlers
  const togglePlayAudio = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        // Stop browser tts if speaking
        if (isSpeaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
        audioRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const restartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlayingAudio(true);
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
  };

  // Browser SpeechSynthesis fallback for descriptions
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      
      // Stop WAV player if playing
      if (isPlayingAudio && audioRef.current) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in your browser.');
    }
  };

  // Trigger SAPI audio or fallback browser synthesis when changing lessons
  useEffect(() => {
    setIsPlayingAudio(false);
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [currentLesson]);

  const handleCompleteLesson = async (lessonId: number) => {
    try {
      await progressAPI.completeLesson(lessonId);
      setMarkedCompleted(prev => [...prev, lessonId]);
    } catch (err: any) {
      console.error('Failed to mark lesson as complete:', err);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault();
            router.push('/student/dashboard');
            break;
          case 'c':
            e.preventDefault();
            router.push('/student/courses');
            break;
          case 'p':
            e.preventDefault();
            router.push('/student/progress');
            break;
          case 'q':
            e.preventDefault();
            router.push(`/student/quiz?courseId=${params.id}`);
            break;
        }
      }

      // Number shortcuts for lesson navigation (1-9)
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && /^[1-9]$/.test(e.key)) {
        const lessonIndex = parseInt(e.key) - 1;
        if (lessonIndex < lessons.length) {
          e.preventDefault();
          setCurrentLesson(lessons[lessonIndex]);
        }
      }

      // N for next lesson
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const currentIndex = lessons.findIndex(l => l.id === currentLesson?.id);
        if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
          setCurrentLesson(lessons[currentIndex + 1]);
        }
      }

      // R to read lesson aloud (uses WAV file if present, else fallback)
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (currentLesson) {
          if (currentLesson.audio_url) {
            togglePlayAudio();
          } else {
            speakText(`${currentLesson.title}. ${currentLesson.description}`);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, lessons, currentLesson, isPlayingAudio, isSpeaking]);

  const keyboardShortcuts = [
    { keys: ['Ctrl', 'H'], description: 'Go to Dashboard' },
    { keys: ['Ctrl', 'C'], description: 'Go to Courses' },
    { keys: ['Ctrl', 'P'], description: 'Go to Progress' },
    { keys: ['Ctrl', 'Q'], description: 'Go to Quiz' },
    { keys: ['1-9'], description: 'Jump to lesson' },
    { keys: ['N'], description: 'Next lesson' },
    { keys: ['R'], description: 'Toggle lesson reading narration (TTS)' },
  ];

  return (
    <RouteGuard allowedRoles={['student']}>
      <DashboardLayout role="student" userName={user?.full_name || "Student"} userRole="Student">
        <KeyboardShortcutsHelp shortcuts={keyboardShortcuts} />
        
        {/* Dynamic accessibility styling wrapper */}
        <div className={`space-y-8 ${accessibilityMode === 'blind' ? 'text-xl' : 'text-base'}`}>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Back Button */}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size={accessibilityMode === 'blind' ? 'lg' : 'default'}
                  onClick={() => router.push('/student/courses')}
                  className={`${accessibilityMode === 'blind' ? 'text-xl text-yellow-500 hover:text-yellow-600 bg-black border border-yellow-400 p-4' : 'text-gray-600 hover:text-gray-900'} -ml-2`}
                  aria-label="Back to courses"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Courses
                </Button>
              </div>

              {/* Course Header */}
              <div className="space-y-2">
                <Badge className={accessibilityMode === 'blind' ? 'bg-yellow-400 text-black border-2 border-yellow-400 text-lg py-1 px-3 font-bold' : 'bg-blue-100 text-blue-700 border-0'}>
                  {course?.is_enrolled ? 'In Progress' : 'Not Enrolled'}
                </Badge>
                <h1 className={`font-bold tracking-tight ${accessibilityMode === 'blind' ? 'text-5xl text-yellow-500 font-mono' : 'text-4xl text-gray-900'}`}>{course?.title}</h1>
                <p className={`text-lg ${accessibilityMode === 'blind' ? 'text-gray-300 font-mono' : 'text-gray-500'}`}>Instructor: {course?.teacher_name}</p>
              </div>

              {!course?.is_enrolled ? (
                <div className={`py-12 text-center rounded-xl border border-dashed ${accessibilityMode === 'blind' ? 'bg-black border-yellow-400 text-yellow-500' : 'bg-gray-50 border-gray-300 text-gray-600'}`}>
                  <BookOpen className="h-12 w-12 mx-auto mb-4" />
                  <p className="font-medium text-lg">You are not enrolled in this course.</p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <EnrollCourseDialog
                      courseId={String(course?.id)}
                      courseTitle={course?.title || ''}
                      onSuccess={fetchCourseData}
                    />
                    <Button
                      variant="outline"
                      onClick={() => router.push('/student/courses')}
                    >
                      Go Back to Courses
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Video Player (Deaf Mode Captions align automatically) */}
                    {currentLesson?.video_url && (
                      <div className={accessibilityMode === 'deaf' ? 'border-4 border-yellow-400 rounded-xl overflow-hidden shadow-lg' : ''}>
                        <VideoPlayer 
                          key={currentLesson.id} 
                          title={currentLesson.title} 
                          src={getVideoUrl(currentLesson.video_url)} 
                          subtitleSrc={getSubtitleUrl(currentLesson.subtitle_url)}
                        />
                        {/* Show a non-intrusive notice when subtitles are still being generated */}
                        {!currentLesson.subtitle_url && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-400 text-xs rounded-b-lg">
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                            <span>Generating subtitles from video audio… Refresh the page in a few minutes to load them.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TTS WAV Audio Narration Player Card (Visible when audio_url is generated by backend SAPI) */}
                    {currentLesson?.audio_url && (
                      <Card className={`border-2 shadow-md overflow-hidden ${accessibilityMode === 'blind' ? 'border-yellow-400 bg-black text-white' : 'border-blue-100 bg-white'}`}>
                        <CardHeader className={`pb-3 border-b ${accessibilityMode === 'blind' ? 'bg-yellow-950/20 border-yellow-900' : 'bg-blue-50/50'}`}>
                          <div className="flex items-center justify-between">
                            <CardTitle className={`text-xl flex items-center gap-2 ${accessibilityMode === 'blind' ? 'text-yellow-400 font-mono' : 'text-blue-800'}`}>
                              <Volume2 className={`h-6 w-6 ${accessibilityMode === 'blind' ? 'text-yellow-400' : 'text-blue-600'} animate-pulse`} />
                              Lesson Audio Narration (TTS MP3/WAV)
                            </CardTitle>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${accessibilityMode === 'blind' ? 'bg-yellow-950 text-yellow-400 border border-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                              Accessibility Mode Active
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                          {/* Hidden HTML audio element */}
                          <audio
                            ref={audioRef}
                            src={getAudioUrl(currentLesson.audio_url)}
                            onTimeUpdate={handleAudioTimeUpdate}
                            onLoadedMetadata={handleAudioLoadedMetadata}
                            onEnded={handleAudioEnded}
                          />

                          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
                              <Button
                                size="lg"
                                className={`h-14 w-14 rounded-full shadow-md focus:ring-4 ${
                                  accessibilityMode === 'blind' 
                                    ? 'bg-yellow-400 text-black hover:bg-yellow-300 focus:ring-yellow-300' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300'
                                }`}
                                onClick={togglePlayAudio}
                                aria-label={isPlayingAudio ? 'Pause audio narration' : 'Play audio narration'}
                              >
                                {isPlayingAudio ? (
                                  <Pause className="h-6 w-6 fill-current" />
                                ) : (
                                  <Play className="h-6 w-6 fill-current ml-0.5" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className={`h-10 w-10 rounded-full border focus:ring-2 ${
                                  accessibilityMode === 'blind'
                                    ? 'border-yellow-400 text-yellow-400 hover:bg-yellow-950 hover:text-yellow-300 focus:ring-yellow-400 bg-black'
                                    : 'border-blue-200 text-blue-700 hover:bg-blue-50 focus:ring-blue-500 bg-white'
                                }`}
                                onClick={restartAudio}
                                aria-label="Restart audio narration from beginning"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Progress bar and time indicators */}
                            <div className="flex-1 w-full space-y-1">
                              <div className={`flex justify-between text-xs font-semibold ${accessibilityMode === 'blind' ? 'text-yellow-400 font-mono' : 'text-gray-500'}`}>
                                <span>{formatTime(audioTime)}</span>
                                <span>{formatTime(audioDuration)}</span>
                              </div>
                              <div
                                className={`h-3 w-full rounded-full cursor-pointer relative ${accessibilityMode === 'blind' ? 'bg-yellow-950' : 'bg-gray-100'}`}
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const clickX = e.clientX - rect.left;
                                  const width = rect.width;
                                  if (audioRef.current && audioDuration) {
                                    audioRef.current.currentTime = (clickX / width) * audioDuration;
                                  }
                                }}
                                role="slider"
                                aria-valuemin={0}
                                aria-valuemax={audioDuration || 100}
                                aria-valuenow={audioTime}
                                aria-label="Audio progress slider"
                              >
                                <div
                                  className={`h-full rounded-full transition-all duration-75 ${accessibilityMode === 'blind' ? 'bg-yellow-400' : 'bg-blue-600'}`}
                                  style={{ width: `${(audioTime / (audioDuration || 1)) * 100}%` }}
                                />
                              </div>
                            </div>

                            {/* Download Button */}
                            <div className="w-full sm:w-auto text-center sm:text-right">
                              <a
                                href={getAudioUrl(currentLesson.audio_url)}
                                download={`lesson-${currentLesson.id}-audio.wav`}
                                className={`inline-flex items-center justify-center gap-2 px-5 py-3 border-2 rounded-xl text-sm font-semibold transition-all shadow-sm w-full sm:w-auto ${
                                  accessibilityMode === 'blind'
                                    ? 'border-yellow-400 text-yellow-400 hover:bg-yellow-950 focus:ring-4 focus:ring-yellow-900 bg-black font-mono'
                                    : 'border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-4 focus:ring-blue-200 bg-white'
                                }`}
                                aria-label="Download audio narration file"
                              >
                                <Download className="h-4 w-4" />
                                Download Audio
                              </a>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Lesson Description Card */}
                    <Card className={`border-0 shadow-sm ${accessibilityMode === 'blind' ? 'bg-black text-white border-2 border-yellow-400' : 'bg-white'}`}>
                      <CardHeader className="pb-4">
                        <CardTitle className={`text-2xl ${accessibilityMode === 'blind' ? 'text-yellow-400 font-mono' : 'text-gray-900'}`}>{currentLesson?.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className={`leading-relaxed whitespace-pre-wrap ${accessibilityMode === 'blind' ? 'text-yellow-100 font-mono' : 'text-gray-700'}`}>
                          {currentLesson?.description}
                        </div>

                        <div className="flex flex-wrap gap-3 mt-6">
                          <Button
                            className={`gap-2 ${
                              accessibilityMode === 'blind' 
                                ? 'bg-black border border-yellow-400 text-yellow-400 hover:bg-yellow-950 hover:text-yellow-300 font-mono text-lg p-6'
                                : 'bg-white border text-gray-700 hover:bg-gray-50'
                            }`}
                            variant="outline"
                            onClick={() => {
                              if (currentLesson?.audio_url) {
                                togglePlayAudio();
                              } else {
                                speakText(`${currentLesson?.title}. ${currentLesson?.description}`);
                              }
                            }}
                          >
                            <Volume2 className="h-5 w-5" aria-hidden="true" />
                            {currentLesson?.audio_url
                              ? (isPlayingAudio ? 'Pause Narration' : 'Play Narration (TTS)')
                              : (isSpeaking ? 'Stop Reading' : 'Read Lesson (TTS)')
                            }
                          </Button>

                          {!markedCompleted.includes(currentLesson?.id) && (
                            <Button
                              className={`gap-2 font-semibold ${
                                accessibilityMode === 'blind'
                                  ? 'bg-yellow-400 hover:bg-yellow-300 text-black text-lg p-6 font-mono'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                              onClick={() => handleCompleteLesson(currentLesson.id)}
                            >
                              <CheckCircle className="h-5 w-5" aria-hidden="true" />
                              Mark as Complete
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Extracted Document Text Card (For Blind / Screen-Reader users) */}
                    {currentLesson?.extracted_text && (
                      <Card className={`border-2 shadow-sm ${accessibilityMode === 'blind' ? 'border-yellow-400 bg-black text-white' : 'border-gray-200 bg-gray-50'}`}>
                        <CardHeader className={`border-b ${accessibilityMode === 'blind' ? 'border-yellow-900 bg-yellow-950/20' : 'bg-gray-100/50'}`}>
                          <CardTitle className={`text-xl font-bold flex items-center gap-2 ${accessibilityMode === 'blind' ? 'text-yellow-400 font-mono' : 'text-gray-800'}`}>
                            <BookOpen className="h-5 w-5" />
                            Extracted Material Text (Screen Reader Friendly)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div
                            className={`whitespace-pre-wrap leading-relaxed ${
                              accessibilityMode === 'blind'
                                ? 'text-yellow-100 font-mono text-xl'
                                : 'text-gray-700 max-h-[500px] overflow-y-auto bg-white p-5 rounded-lg border'
                            }`}
                            id="extracted-document-content"
                          >
                            {currentLesson.extracted_text}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Video Transcript Card (For Deaf Mode) */}
                    {currentLesson?.transcript && (
                      <Card className={`border-2 shadow-sm ${accessibilityMode === 'deaf' ? 'border-yellow-400 bg-yellow-50/10' : 'border-gray-200 bg-gray-50'}`}>
                        <CardHeader className={`border-b ${accessibilityMode === 'deaf' ? 'border-yellow-400 bg-yellow-400/10' : 'bg-gray-100/50'}`}>
                          <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-800">
                            <Volume2 className="h-5 w-5 text-gray-500" />
                            Lesson Speech Transcript (Auto-generated)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto bg-white p-5 rounded-lg border font-medium">
                            {currentLesson.transcript}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Lessons List */}
                    <Card className={`border-0 shadow-sm ${accessibilityMode === 'blind' ? 'bg-black text-white border-2 border-yellow-400' : 'bg-white'}`}>
                      <CardHeader className="pb-4">
                        <CardTitle className={accessibilityMode === 'blind' ? 'text-yellow-400 font-mono text-2xl' : ''}>Course Content</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2" role="list">
                          {lessons.map((lesson, idx) => {
                            const isCompleted = markedCompleted.includes(lesson.id);
                            const isActive = currentLesson?.id === lesson.id;
                            return (
                              <li key={lesson.id}>
                                <button
                                  onClick={() => setCurrentLesson(lesson)}
                                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 text-left ${
                                    isActive 
                                      ? (accessibilityMode === 'blind' ? 'bg-yellow-950 border border-yellow-400' : 'bg-blue-50 border border-blue-100') 
                                      : (accessibilityMode === 'blind' ? 'hover:bg-yellow-950/40 border border-transparent' : 'hover:bg-gray-50')
                                  }`}
                                  aria-label={`${lesson.title}${isCompleted ? ', completed' : ''}`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle className={`h-5 w-5 flex-shrink-0 ${accessibilityMode === 'blind' ? 'text-yellow-400' : 'text-green-600'}`} aria-hidden="true" />
                                  ) : (
                                    <Circle className={`h-5 w-5 flex-shrink-0 ${accessibilityMode === 'blind' ? 'text-yellow-950 border border-yellow-400 rounded-full' : 'text-gray-300'}`} aria-hidden="true" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-medium text-sm truncate ${
                                      isActive 
                                        ? (accessibilityMode === 'blind' ? 'text-yellow-400 font-mono font-bold' : 'text-blue-700') 
                                        : (accessibilityMode === 'blind' ? 'text-white font-mono' : 'text-gray-900')
                                    }`}>
                                      {lesson.title}
                                    </p>
                                    <p className={`text-xs ${accessibilityMode === 'blind' ? 'text-yellow-500/80 font-mono' : 'text-gray-500'}`}>{lesson.duration || 'Flexible'}</p>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Download Materials */}
                    {(currentLesson?.content_url || currentLesson?.document_url) && (
                      <Card className={`border-0 shadow-sm ${accessibilityMode === 'blind' ? 'bg-black text-white border-2 border-yellow-400' : 'bg-white'}`}>
                        <CardHeader className="pb-4">
                          <CardTitle className={accessibilityMode === 'blind' ? 'text-yellow-400 font-mono text-2xl' : ''}>Lesson Materials</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2" role="list">
                            <li>
                              <a
                                href={getDocumentUrl(currentLesson.document_url || currentLesson.content_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors border ${
                                  accessibilityMode === 'blind'
                                    ? 'border-yellow-400 hover:bg-yellow-950 bg-black text-yellow-400 font-mono'
                                    : 'border-transparent hover:bg-gray-50 text-gray-900 bg-transparent'
                                }`}
                              >
                                <Download className={`h-5 w-5 flex-shrink-0 ${accessibilityMode === 'blind' ? 'text-yellow-400' : 'text-blue-600'}`} aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">Course Material Document</p>
                                  <p className={`text-xs ${accessibilityMode === 'blind' ? 'text-yellow-500/85' : 'text-gray-500'}`}>View/Download PDF or slides</p>
                                </div>
                              </a>
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Next Lesson / Finish Course Button */}
                    {(() => {
                      const currentIndex = lessons.findIndex(l => l.id === currentLesson?.id);
                      const isLastLesson = currentIndex === lessons.length - 1;
                      const allCompleted = lessons.length > 0 && lessons.every(l => markedCompleted.includes(l.id));

                      if (currentIndex !== -1 && !isLastLesson) {
                        return (
                          <Button
                            className={`w-full gap-2 ${
                              accessibilityMode === 'blind'
                                ? 'bg-yellow-400 hover:bg-yellow-300 text-black font-mono text-lg p-6'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                            size="lg"
                            onClick={() => setCurrentLesson(lessons[currentIndex + 1])}
                          >
                            Next Lesson
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                          </Button>
                        );
                      }

                      if (isLastLesson) {
                        return (
                          <div className="space-y-2">
                            <Button
                              className={`w-full gap-2 transition-all ${
                                allCompleted
                                  ? (accessibilityMode === 'blind' ? 'bg-yellow-400 hover:bg-yellow-300 text-black font-mono text-lg p-6 font-bold border-2 border-black' : 'bg-green-600 hover:bg-green-700 text-white')
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed border'
                              }`}
                              size="lg"
                              disabled={!allCompleted}
                              onClick={() => allCompleted && router.push('/student/progress')}
                              aria-label={allCompleted ? 'Finish Course' : 'Complete all lessons to finish'}
                            >
                              <CheckCircle className="h-5 w-5" aria-hidden="true" />
                              Finish Course
                            </Button>
                            {!allCompleted && (
                              <p className={`text-xs text-center ${accessibilityMode === 'blind' ? 'text-yellow-500 font-mono font-semibold' : 'text-gray-500'}`}>
                                Complete all lessons to finish ({markedCompleted.length}/{lessons.length} done)
                              </p>
                            )}
                          </div>
                        );
                      }

                      return null;
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
