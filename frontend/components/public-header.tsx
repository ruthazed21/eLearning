'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Ear, Accessibility, Bell } from "lucide-react";

type AccessibilityMode = 'default' | 'blind' | 'deaf';

export default function PublicHeader() {
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('accessibilityMode') as AccessibilityMode;
    if (saved) {
      setAccessibilityMode(saved);
    }
  }, []);

  const handleModeChange = (mode: AccessibilityMode) => {
    setAccessibilityMode(mode);
    localStorage.setItem('accessibilityMode', mode);
    
    const announcement = mode === 'blind' 
      ? 'Blind mode activated. High contrast theme enabled with enhanced screen reader support and 20 pixel base font size.'
      : mode === 'deaf'
      ? 'Deaf mode activated. Visual cues enabled with closed captions support for all videos.'
      : 'Default mode activated.';
    
    const liveRegion = document.getElementById('accessibility-announcements');
    if (liveRegion) {
      liveRegion.textContent = announcement;
    }
  };

  const bgColor = accessibilityMode === 'blind' ? 'bg-black' : 'bg-slate-950';
  const textSize = accessibilityMode === 'blind' ? 'text-xl' : 'text-base';
  const visualCue = accessibilityMode === 'deaf' ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-950' : '';

  if (!mounted) return null;

  return (
    <>
      <div id="accessibility-announcements" className="sr-only" role="status" aria-live="polite" aria-atomic="true" />

      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-yellow-400 focus:text-slate-950 focus:font-bold focus:rounded-lg focus:ring-4 focus:ring-yellow-400"
      >
        Skip to main content
      </a>

      {accessibilityMode === 'deaf' && (
        <div className="bg-yellow-400 text-slate-950 py-3 px-6 text-center font-semibold" role="alert">
          <Bell className="inline-block h-5 w-5 mr-2" aria-hidden="true" />
          Visual Mode Active: All videos include closed captions and visual notifications
        </div>
      )}

      <header className={`sticky top-0 z-40 ${bgColor}`}>
        <nav className="container mx-auto max-w-7xl px-6 lg:px-12 py-6" aria-label="Main navigation">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="EduAccess Logo" 
                width={180}
                height={60}
                className={`${accessibilityMode === 'blind' ? 'h-16' : 'h-12'} w-auto ${visualCue}`}
                priority
              />
            </Link>

            <div className="flex items-center gap-3" role="region" aria-label="Accessibility mode selector">
              <div className="flex gap-2" role="group" aria-label="Accessibility mode options">
                <Button
                  onClick={() => handleModeChange('default')}
                  className={`${
                    accessibilityMode === 'default' 
                      ? 'bg-yellow-400 text-slate-950 hover:bg-yellow-300 border-yellow-400' 
                      : 'bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:text-white hover:border-white'
                  } focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-slate-950 font-semibold transition-all rounded-lg ${
                    accessibilityMode === 'blind' ? 'text-xl px-6 py-3' : 'px-4 py-2'
                  }`}
                  aria-pressed={accessibilityMode === 'default'}
                  aria-label="Default mode - standard interface"
                >
                  Default
                </Button>
                <Button
                  onClick={() => handleModeChange('blind')}
                  className={`${
                    accessibilityMode === 'blind' 
                      ? 'bg-yellow-400 text-slate-950 hover:bg-yellow-300 border-yellow-400' 
                      : 'bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:text-white hover:border-white'
                  } focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-slate-950 font-semibold transition-all rounded-lg ${
                    accessibilityMode === 'blind' ? 'text-xl px-6 py-3' : 'px-4 py-2'
                  }`}
                  aria-pressed={accessibilityMode === 'blind'}
                  aria-label="Blind mode - high contrast with enhanced screen reader support and larger text"
                >
                  <Eye className="mr-2 h-5 w-5" aria-hidden="true" />
                  Blind Mode
                </Button>
                <Button
                  onClick={() => handleModeChange('deaf')}
                  className={`${
                    accessibilityMode === 'deaf' 
                      ? 'bg-yellow-400 text-slate-950 hover:bg-yellow-300 border-yellow-400' 
                      : 'bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:text-white hover:border-white'
                  } focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-slate-950 font-semibold transition-all rounded-lg ${
                    accessibilityMode === 'blind' ? 'text-xl px-6 py-3' : 'px-4 py-2'
                  }`}
                  aria-pressed={accessibilityMode === 'deaf'}
                  aria-label="Deaf mode - visual cues with closed captions support for all videos"
                >
                  <Ear className="mr-2 h-5 w-5" aria-hidden="true" />
                  Deaf Mode
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button 
                  size="lg"
                  className={`bg-transparent text-white hover:bg-white/10 hover:text-white focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2 transition-all rounded-lg ${textSize}`}
                  aria-label="Login to your account"
                >
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button 
                  size="lg"
                  className={`bg-yellow-400 text-slate-950 hover:bg-yellow-300 focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2 font-semibold transition-all ${textSize} ${visualCue}`}
                  aria-label="Sign up for free account with your BDU Student ID"
                >
                  Sign Up with Student ID
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
