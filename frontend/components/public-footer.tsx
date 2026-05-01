'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Accessibility } from "lucide-react";

type AccessibilityMode = 'default' | 'blind' | 'deaf';

export default function PublicFooter() {
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('accessibilityMode') as AccessibilityMode;
    if (saved) {
      setAccessibilityMode(saved);
    }
  }, []);

  if (!mounted) return null;

  return (
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
            <h3 className={`font-bold ${accessibilityMode === 'blind' ? 'text-2xl' : 'text-lg'} mb-4 text-white`}>
              About
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/" 
                  className={`text-white/60 hover:text-white focus:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors ${
                    accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
                  }`}
                >
                  Home
                </Link>
              </li>
              <li>
                <a 
                  href="/#process-heading" 
                  className={`text-white/60 hover:text-white focus:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors ${
                    accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
                  }`}
                >
                  How It Works
                </a>
              </li>
              <li>
                <a 
                  href="/#features-heading" 
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
            <h3 className={`font-bold ${accessibilityMode === 'blind' ? 'text-2xl' : 'text-lg'} mb-4 text-white`}>
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
            <h3 className={`font-bold ${accessibilityMode === 'blind' ? 'text-2xl' : 'text-lg'} mb-4 text-white`}>
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
                  href="/#cta-heading" 
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
  );
}
