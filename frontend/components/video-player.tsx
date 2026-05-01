'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Subtitles, Mic, Info } from 'lucide-react';

interface VideoPlayerProps {
  src?: string;
  title: string;
  subtitleSrc?: string; // Path to subtitle file (VTT format)
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function VideoPlayer({ src, title, subtitleSrc }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(true); // Default to ON for accessibility
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [manualCaption, setManualCaption] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Debug logging
  console.log('VideoPlayer props:', { src, title, subtitleSrc, showSubtitles });
  
  // Additional debugging for subtitle issues
  useEffect(() => {
    if (subtitleSrc) {
      console.log('=== SUBTITLE DEBUG INFO ===');
      console.log('Subtitle URL provided:', subtitleSrc);
      console.log('Video element:', videoRef.current);
      
      // Test if subtitle URL is accessible
      fetch(subtitleSrc)
        .then(response => {
          console.log('Subtitle file fetch response:', response.status, response.statusText);
          if (response.ok) {
            return response.text();
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        })
        .then(content => {
          console.log('Subtitle file content preview:', content.substring(0, 200) + '...');
        })
        .catch(error => {
          console.error('Failed to fetch subtitle file:', error);
        });
    } else {
      console.log('No subtitle URL provided');
    }
  }, [subtitleSrc]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            transcript += result[0].transcript;
          }
        }
        
        // Update live transcript with interim results
        setLiveTranscript(transcript);
        
        // If we have final results, clear the live transcript
        if (finalTranscript) {
          setLiveTranscript('');
          console.log('Final transcript:', finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setSpeechRecognition(recognition);
      setSpeechSupported(true);
    } else {
      console.warn('Speech Recognition not supported in this browser');
      setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100 || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleLoadedData = () => {
      // Wait a bit for tracks to be ready, then set their mode
      setTimeout(() => {
        const tracks = video.textTracks;
        console.log('Video loaded, text tracks available:', tracks.length);
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          console.log(`Track ${i}:`, {
            kind: track.kind,
            label: track.label,
            language: track.language,
            mode: track.mode
          });
          track.mode = showSubtitles ? 'showing' : 'hidden';
        }
      }, 100);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [src, showSubtitles]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (speechRecognition && isListening) {
        speechRecognition.stop();
      }
    };
  }, [speechRecognition, isListening]);

  // Separate effect to handle subtitle visibility changes for uploaded subtitles
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !subtitleSrc) return;

    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = showSubtitles ? 'showing' : 'hidden';
    }
  }, [showSubtitles, subtitleSrc]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        // Stop speech recognition when video pauses
        if (isListening && speechRecognition) {
          speechRecognition.stop();
        }
      } else {
        videoRef.current.play();
        // Note: Speech recognition listens to microphone, not video audio
        // This is for users who want to provide live commentary/captions
      }
    }
  };

  const startSpeechRecognition = () => {
    if (speechRecognition && !isListening) {
      try {
        speechRecognition.start();
        setIsListening(true);
        setLiveTranscript('');
        console.log('Started microphone-based speech recognition for live captions');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        // If already listening, stop and restart
        if (error instanceof Error && error.message.includes('already started')) {
          speechRecognition.stop();
          setTimeout(() => {
            try {
              speechRecognition.start();
              setIsListening(true);
            } catch (retryError) {
              console.error('Failed to restart speech recognition:', retryError);
            }
          }, 100);
        }
      }
    }
  };

  const stopSpeechRecognition = () => {
    if (speechRecognition && isListening) {
      speechRecognition.stop();
      setIsListening(false);
      setLiveTranscript('');
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSubtitles = () => {
    const video = videoRef.current;
    const newShowSubtitles = !showSubtitles;
    setShowSubtitles(newShowSubtitles);

    if (subtitleSrc && video) {
      // Handle uploaded subtitle files
      const tracks = video.textTracks;
      console.log('Toggling subtitles to:', newShowSubtitles, 'Available tracks:', tracks.length);
      
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        track.mode = newShowSubtitles ? 'showing' : 'hidden';
        console.log(`Track ${i} mode set to:`, track.mode);
      }

      // If no tracks are available, log a warning
      if (tracks.length === 0) {
        console.warn('No text tracks available. Subtitle file may not have loaded properly.');
        console.warn('Subtitle URL:', subtitleSrc);
      }
    } else if (!subtitleSrc) {
      // Handle manual captions when no subtitle file exists
      if (newShowSubtitles) {
        setShowCaptionInput(true);
      } else {
        setShowCaptionInput(false);
        setManualCaption('');
        if (isListening) {
          stopSpeechRecognition();
        }
      }
    }
  };

  const handleManualCaptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Manual caption is already set in state, just close input
    setShowCaptionInput(false);
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="bg-black rounded-lg overflow-hidden">
      <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
        {src ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full"
              aria-label={title}
              crossOrigin="anonymous"
            >
              <source src={src} type="video/mp4" />
              {subtitleSrc && (
                <track 
                  kind="subtitles" 
                  label="English subtitles" 
                  src={subtitleSrc}
                  srcLang="en"
                  default
                  onLoad={() => {
                    console.log('Subtitle track loaded successfully from:', subtitleSrc);
                    const video = videoRef.current;
                    if (video) {
                      const tracks = video.textTracks;
                      console.log('Available tracks after load:', tracks.length);
                      for (let i = 0; i < tracks.length; i++) {
                        const track = tracks[i];
                        console.log(`Track ${i} after load:`, {
                          kind: track.kind,
                          label: track.label,
                          mode: track.mode
                        });
                        track.mode = showSubtitles ? 'showing' : 'hidden';
                      }
                    }
                  }}
                  onError={(e) => {
                    console.error('Subtitle track failed to load:', e);
                    console.error('Subtitle URL that failed:', subtitleSrc);
                  }}
                />
              )}
              Your browser does not support the video tag.
            </video>
            
            {/* Live Speech Recognition Subtitles Overlay */}
            {!subtitleSrc && showSubtitles && (liveTranscript || manualCaption) && (
              <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-center">
                <p className="text-sm leading-relaxed">
                  {manualCaption || liveTranscript}
                </p>
                {isListening && (
                  <div className="flex items-center justify-center mt-2 gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-300">Listening to Microphone</span>
                  </div>
                )}
              </div>
            )}

            {/* Manual Caption Input Overlay */}
            {!subtitleSrc && showSubtitles && showCaptionInput && (
              <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg">
                <form onSubmit={handleManualCaptionSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Add Caption for Current Scene:
                    </label>
                    <input
                      type="text"
                      value={manualCaption}
                      onChange={(e) => setManualCaption(e.target.value)}
                      placeholder="Type what's being said in the video..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                    >
                      Set Caption
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCaptionInput(false)}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
                    >
                      Cancel
                    </button>
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCaptionInput(false);
                          startSpeechRecognition();
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs flex items-center gap-1"
                      >
                        <Mic className="w-3 h-3" />
                        Use Microphone
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="text-white text-center p-8">
            <Play className="h-16 w-16 mx-auto mb-4 opacity-50" aria-hidden="true" />
            <p className="text-lg">Video will be displayed here</p>
          </div>
        )}
      </div>

      {/* Video Controls */}
      <div 
        className="bg-gray-800 p-4 flex items-center gap-4"
        role="toolbar"
        aria-label="Video controls"
      >
        {/* Subtitle Status Indicator */}
        {subtitleSrc && (
          <div className="text-xs text-green-400 mr-2">
            CC Available
          </div>
        )}
        {!subtitleSrc && (showSubtitles || speechSupported) && (
          <div className="text-xs text-blue-400 mr-2 flex items-center gap-1">
            <Mic className="w-3 h-3" />
            {isListening && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>}
            {isListening ? 'Mic Active' : manualCaption ? 'Manual CC' : 'CC Available'}
            <div className="group relative">
              <Info className="w-3 h-3 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Click CC to add manual captions or use microphone
              </div>
            </div>
          </div>
        )}
        {!subtitleSrc && !speechSupported && (
          <div className="text-xs text-gray-500 mr-2">
            Manual CC Only
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          className="text-white hover:bg-gray-700"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          disabled={!src}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Play className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="text-white hover:bg-gray-700"
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          disabled={!src}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Volume2 className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>

        <div 
          className="flex-1 bg-gray-700 h-1 rounded-full cursor-pointer"
          onClick={handleProgressClick}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Video progress: ${Math.round(progress)}%`}
        >
          <div 
            className="bg-blue-500 h-1 rounded-full transition-all" 
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-white text-sm min-w-[80px] text-right" aria-live="polite">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSubtitles}
          className={`text-white hover:bg-gray-700 ${
            showSubtitles && (subtitleSrc || manualCaption || isListening) ? 'bg-gray-600' : ''
          } ${!subtitleSrc && !speechSupported && !manualCaption ? 'opacity-50' : ''}`}
          aria-label={
            subtitleSrc 
              ? (showSubtitles ? 'Hide subtitles' : 'Show subtitles')
              : (showSubtitles ? 'Hide captions' : 'Show captions')
          }
          disabled={!src}
        >
          <Subtitles className="h-5 w-5" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-gray-700"
          aria-label="Settings"
          disabled
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleFullscreen}
          className="text-white hover:bg-gray-700"
          aria-label="Fullscreen"
          disabled={!src}
        >
          <Maximize className="h-5 w-5" aria-hidden="true" />
        </Button>

        {/* Debug button - remove in production */}
        {subtitleSrc && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('=== SUBTITLE DEBUG TEST ===');
              const video = videoRef.current;
              if (video) {
                console.log('Video element:', video);
                console.log('Text tracks:', video.textTracks.length);
                for (let i = 0; i < video.textTracks.length; i++) {
                  const track = video.textTracks[i];
                  console.log(`Track ${i}:`, {
                    kind: track.kind,
                    label: track.label,
                    language: track.language,
                    mode: track.mode,
                    readyState: (track as any).readyState,
                    cues: track.cues?.length || 0
                  });
                }
              }
              console.log('Subtitle URL:', subtitleSrc);
            }}
            className="text-white hover:bg-gray-700 text-xs px-2"
          >
            Debug CC
          </Button>
        )}
      </div>
    </div>
  );
}
