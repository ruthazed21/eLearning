'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  Ear, 
  Play,
  ChevronRight,
  Check,
  Accessibility,
  Volume2,
  Captions,
  Keyboard,
  Shield,
  Bell
} from "lucide-react";

type AccessibilityMode = 'default' | 'blind' | 'deaf';

export default function Home() {
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
  const baseFontSize = accessibilityMode === 'blind' ? 'text-[20px]' : '';
  const visualCue = accessibilityMode === 'deaf' ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-950' : '';

  if (!mounted) return null;

  return (
    <div className={`min-h-screen ${bgColor} text-white ${baseFontSize} font-sans`}>
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
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="EduAccess Logo" 
                width={180}
                height={60}
                className={`${accessibilityMode === 'blind' ? 'h-16' : 'h-12'} w-auto ${visualCue}`}
                priority
              />
            </div>

            {/* Accessibility Mode Toggle */}
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

            {/* Auth Buttons */}
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

      <main id="main-content">
        {/* Hero Section */}
        <section className="pt-16 pb-20" aria-labelledby="hero-heading">
          <div className="container mx-auto max-w-7xl px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-4">
                  <h1 
                    id="hero-heading"
                    className={`${
                      accessibilityMode === 'blind' 
                        ? 'text-[clamp(2.5rem,7vw,4.5rem)]' 
                        : 'text-[clamp(2rem,6vw,4rem)]'
                    } font-bold leading-[1.1] tracking-tight`}
                  >
                    Education Without Boundaries
                  </h1>
                  <p className={`${
                    accessibilityMode === 'blind' 
                      ? 'text-[clamp(1.25rem,3vw,1.75rem)]' 
                      : 'text-[clamp(1.125rem,2.5vw,1.5rem)]'
                  } text-white/90 leading-relaxed max-w-2xl`}>
                    A disability-driven platform tailoring the university experience for Blind and Deaf students through automated accessibility.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 py-2" role="list" aria-label="Platform certifications">
                  <div className="flex items-center gap-2" role="listitem">
                    <Shield className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                    <span className={`text-white/80 ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}>
                      WCAG 2.1 Level AA
                    </span>
                  </div>
                  <div className="flex items-center gap-2" role="listitem">
                    <Check className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                    <span className={`text-white/80 ${accessibilityMode === 'blind' ? 'text-lg' : 'text-sm'}`}>
                      Secure Role-Based Access
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/auth/signup">
                    <Button 
                      size="lg"
                      className={`bg-yellow-400 text-slate-950 hover:bg-yellow-300 focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2 font-semibold ${
                        accessibilityMode === 'blind' ? 'text-xl px-10 py-6' : 'text-base px-8 py-6'
                      } transition-all ${visualCue}`}
                      aria-label="Sign up with your Bahir Dar University Student ID"
                    >
                      Sign Up with Student ID
                      <ChevronRight className="ml-2 h-5 w-5" aria-hidden="true" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 relative">
                <div className={`aspect-[4/3] rounded-2xl overflow-hidden border-2 ${
                  accessibilityMode === 'deaf' ? 'border-yellow-400' : 'border-white/10'
                }`}>
                  <img 
                    src="/hero-elearning.jpeg"
                    alt="Diverse university students collaborating in an accessible learning environment with modern technology and assistive devices"
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl -z-10" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-32 px-6 lg:px-12 bg-white/5" aria-labelledby="process-heading">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-20">
              <h2 
                id="process-heading"
                className={`${
                  accessibilityMode === 'blind' ? 'text-[clamp(3rem,7vw,4.5rem)]' : 'text-[clamp(2.5rem,6vw,4rem)]'
                } font-bold mb-6`}
              >
                How It Works
              </h2>
              <p className={`${accessibilityMode === 'blind' ? 'text-2xl' : 'text-xl'} text-white/70 max-w-3xl mx-auto`}>
                Three simple steps to accessible learning
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <article className={`space-y-6 text-center ${visualCue}`}>
                <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center text-slate-950 font-bold text-3xl mx-auto">
                  1
                </div>
                <h3 className={`${accessibilityMode === 'blind' ? 'text-3xl' : 'text-2xl'} font-bold`}>
                  Register
                </h3>
                <p className={`${accessibilityMode === 'blind' ? 'text-xl' : 'text-lg'} text-white/70 leading-relaxed`}>
                  Sign up using your Bahir Dar University Student ID for secure, verified access
                </p>
              </article>

              <article className={`space-y-6 text-center ${visualCue}`}>
                <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center text-slate-950 font-bold text-3xl mx-auto">
                  2
                </div>
                <h3 className={`${accessibilityMode === 'blind' ? 'text-3xl' : 'text-2xl'} font-bold`}>
                  Choose Your Mode
                </h3>
                <p className={`${accessibilityMode === 'blind' ? 'text-xl' : 'text-lg'} text-white/70 leading-relaxed`}>
                  Select "Blind" or "Deaf" to lock the interface into your specific accessibility profile
                </p>
              </article>

              <article className={`space-y-6 text-center ${visualCue}`}>
                <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center text-slate-950 font-bold text-3xl mx-auto">
                  3
                </div>
                <h3 className={`${accessibilityMode === 'blind' ? 'text-3xl' : 'text-2xl'} font-bold`}>
                  Learn
                </h3>
                <p className={`${accessibilityMode === 'blind' ? 'text-xl' : 'text-lg'} text-white/70 leading-relaxed`}>
                  Access materials automatically scanned and converted for your specific needs
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Dual-Core Features */}
        <section className="py-32 px-6 lg:px-12" aria-labelledby="features-heading">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-20">
              <h2 
                id="features-heading"
                className={`${
                  accessibilityMode === 'blind' ? 'text-[clamp(3rem,7vw,4.5rem)]' : 'text-[clamp(2.5rem,6vw,4rem)]'
                } font-bold mb-6`}
              >
                The Dual-Core Experience
              </h2>
              <p className={`${accessibilityMode === 'blind' ? 'text-2xl' : 'text-xl'} text-white/70 max-w-3xl mx-auto`}>
                Tailored features for Blind and Deaf students
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <article className={`bg-white/5 border-2 border-white/10 rounded-2xl p-10 hover:bg-white/10 hover:border-yellow-400 focus-within:ring-4 focus-within:ring-yellow-400 transition-all ${visualCue}`}>
                <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center mb-6">
                  <Volume2 className="h-8 w-8 text-slate-950" aria-hidden="true" />
                </div>
                <h3 className={`${accessibilityMode === 'blind' ? 'text-3xl' : 'text-2xl'} font-bold mb-4`}>
                  TTS Document Conversion
                </h3>
                <p className={`${accessibilityMode === 'blind' ? 'text-xl' : 'text-lg'} text-white/70 leading-relaxed`}>
                  Audio-optimized navigation with integrated Text-to-Speech for all documents and course materials
                </p>
              </article>

              <article className={`bg-white/5 border-2 border-white/10 rounded-2xl p-10 hover:bg-white/10 hover:border-yellow-400 focus-within:ring-4 focus-within:ring-yellow-400 transition-all ${visualCue}`}>
                <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center mb-6">
                  <Captions className="h-8 w-8 text-slate-950" aria-hidden="true" />
                </div>
                <h3 className={`${accessibilityMode === 'blind' ? 'text-3xl' : 'text-2xl'} font-bold mb-4`}>
                  STT Video Captioning
                </h3>
                <p className={`${accessibilityMode === 'blind' ? 'text-xl' : 'text-lg'} text-white/70 leading-relaxed`}>
                  Automated Speech-to-Text captions for every lecture video with visual-first notifications
                </p>
              </article>

              <article className={`bg-white/5 border-2 border-white/10 rounded-2xl p-10 hover:bg-white/10 hover:border-yellow-400 focus-within:ring-4 focus-within:ring-yellow-400 transition-all ${visualCue}`}>
                <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center mb-6">
                  <Keyboard className="h-8 w-8 text-slate-950" aria-hidden="true" />
                </div>
                <h3 className={`${accessibilityMode === 'blind' ? 'text-3xl' : 'text-2xl'} font-bold mb-4`}>
                  Keyboard-Only Navigation
                </h3>
                <p className={`${accessibilityMode === 'blind' ? 'text-xl' : 'text-lg'} text-white/70 leading-relaxed`}>
                  Complete platform navigation using only keyboard with visible focus indicators
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 lg:px-12" aria-labelledby="cta-heading">
          <div className="container mx-auto max-w-5xl">
            <div className={`bg-yellow-400 rounded-3xl p-16 text-center text-slate-950 ${visualCue}`}>
              <h2 
                id="cta-heading"
                className={`${
                  accessibilityMode === 'blind' ? 'text-[clamp(3rem,7vw,4.5rem)]' : 'text-[clamp(2.5rem,6vw,4rem)]'
                } font-bold mb-6`}
              >
                Start Learning Today
              </h2>
              <p className={`${accessibilityMode === 'blind' ? 'text-3xl' : 'text-2xl'} mb-10 opacity-90`}>
                Join Bahir Dar University students learning without barriers
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/auth/signup">
                  <Button 
                    size="lg"
                    className={`bg-slate-950 text-white hover:bg-slate-800 focus:ring-4 focus:ring-slate-950 focus:ring-offset-2 focus:ring-offset-yellow-400 font-semibold ${
                      accessibilityMode === 'blind' ? 'text-2xl px-12 py-8' : 'text-lg px-12 py-7'
                    } transition-all`}
                    aria-label="Create your free account with BDU Student ID"
                  >
                    Sign Up with Student ID
                    <ChevronRight className="ml-2 h-6 w-6" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-16 px-6 lg:px-12 border-t-2 border-white/10" role="contentinfo">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <Image 
                src="/logo.png" 
                alt="EduAccess Logo" 
                width={150}
                height={50}
                className={`${accessibilityMode === 'blind' ? 'h-14' : 'h-10'} w-auto`}
              />
              <p className={`text-white/60 ${accessibilityMode === 'blind' ? 'text-lg' : 'text-base'}`}>
                Education without boundaries for everyone
              </p>
            </div>

            <nav aria-label="Footer navigation - About">
              <h3 className={`font-bold ${accessibilityMode === 'blind' ? 'text-2xl' : 'text-lg'} mb-4`}>
                About
              </h3>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="#main-content" 
                    className={`text-white/60 hover:text-white focus:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors ${
                      accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
                    }`}
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a 
                    href="#process-heading" 
                    className={`text-white/60 hover:text-white focus:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors ${
                      accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
                    }`}
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <a 
                    href="#features-heading" 
                    className={`text-white/60 hover:text-white focus:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors ${
                      accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
                    }`}
                  >
                    Features
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label="Footer navigation - Get Started">
              <h3 className={`font-bold ${accessibilityMode === 'blind' ? 'text-2xl' : 'text-lg'} mb-4`}>
                Get Started
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/auth/signup" 
                    className={`text-white/60 hover:text-white focus:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors ${
                      accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
                    }`}
                  >
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/auth/login" 
                    className={`text-white/60 hover:text-white focus:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors ${
                      accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
                    }`}
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/accessibility" 
                    className={`text-white/60 hover:text-white focus:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors ${
                      accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
                    }`}
                  >
                    Accessibility Guide
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="Footer navigation - Support">
              <h3 className={`font-bold ${accessibilityMode === 'blind' ? 'text-2xl' : 'text-lg'} mb-4`}>
                Support
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/admin/feedback" 
                    className={`text-white/60 hover:text-white focus:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors ${
                      accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
                    }`}
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <a 
                    href="#cta-heading" 
                    className={`text-white/60 hover:text-white focus:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors ${
                      accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
                    }`}
                  >
                    Get Help
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className={`pt-8 border-t border-white/10 text-center text-white/60 ${
            accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
          }`}>
            <p>© 2026 EduAccess. WCAG 2.1 Level AA Compliant. Built with accessibility in mind for all learners.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
