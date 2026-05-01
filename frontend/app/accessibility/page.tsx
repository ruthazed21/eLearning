'use client';

import PublicHeader from "@/components/public-header";
import PublicFooter from "@/components/public-footer";
import { Eye, Ear, Keyboard, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccessibilityGuide() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PublicHeader />

      <main id="main-content" className="container mx-auto max-w-7xl px-6 lg:px-12 py-16">
        <div className="max-w-4xl">
          <h1 className="text-5xl font-bold mb-6">Accessibility Guide</h1>
          <p className="text-xl text-white/80 mb-12">
            Learn how to use EduAccess features designed specifically for Blind and Deaf students
          </p>

          {/* Blind Mode Section */}
          <section className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center">
                <Eye className="h-8 w-8 text-slate-950" aria-hidden="true" />
              </div>
              <h2 className="text-3xl font-bold">Blind Mode</h2>
            </div>
            
            <div className="space-y-6 text-lg text-white/80">
              <p>
                Blind Mode is designed for students who are blind or have low vision. When activated, the platform automatically adjusts to provide the best experience for screen reader users.
              </p>
              
              <h3 className="text-2xl font-bold text-white mt-8 mb-4">Features:</h3>
              <ul className="space-y-4 list-disc list-inside">
                <li>High contrast theme with pure black background</li>
                <li>20px base font size for better readability</li>
                <li>Enhanced ARIA labels for all interactive elements</li>
                <li>Keyboard-only navigation support</li>
                <li>Text-to-Speech (TTS) for all documents and course materials</li>
              </ul>

              <h3 className="text-2xl font-bold text-white mt-8 mb-4">How to Activate:</h3>
              <ol className="space-y-4 list-decimal list-inside">
                <li>Navigate to the accessibility mode selector at the top of any page</li>
                <li>Click or press Enter on the "Blind Mode" button</li>
                <li>The interface will immediately switch to high contrast mode</li>
                <li>Your preference is saved automatically</li>
              </ol>
            </div>
          </section>

          {/* Deaf Mode Section */}
          <section className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center">
                <Ear className="h-8 w-8 text-slate-950" aria-hidden="true" />
              </div>
              <h2 className="text-3xl font-bold">Deaf Mode</h2>
            </div>
            
            <div className="space-y-6 text-lg text-white/80">
              <p>
                Deaf Mode is designed for students who are deaf or hard of hearing. This mode emphasizes visual cues and ensures all audio content has text alternatives.
              </p>
              
              <h3 className="text-2xl font-bold text-white mt-8 mb-4">Features:</h3>
              <ul className="space-y-4 list-disc list-inside">
                <li>Visual cue system with yellow ring indicators</li>
                <li>Prominent banner showing mode is active</li>
                <li>Closed captions (CC) icons on all video content</li>
                <li>Speech-to-Text (STT) captions for lecture videos</li>
                <li>Visual notifications for all alerts</li>
              </ul>

              <h3 className="text-2xl font-bold text-white mt-8 mb-4">How to Activate:</h3>
              <ol className="space-y-4 list-decimal list-inside">
                <li>Navigate to the accessibility mode selector at the top of any page</li>
                <li>Click or press Enter on the "Deaf Mode" button</li>
                <li>Visual cues will appear around important elements</li>
                <li>A yellow banner confirms the mode is active</li>
              </ol>
            </div>
          </section>

          {/* Keyboard Navigation Section */}
          <section className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center">
                <Keyboard className="h-8 w-8 text-slate-950" aria-hidden="true" />
              </div>
              <h2 className="text-3xl font-bold">Keyboard Navigation</h2>
            </div>
            
            <div className="space-y-6 text-lg text-white/80">
              <p>
                EduAccess is fully navigable using only a keyboard. All interactive elements have visible focus indicators.
              </p>
              
              <h3 className="text-2xl font-bold text-white mt-8 mb-4">Keyboard Shortcuts:</h3>
              <ul className="space-y-4 list-disc list-inside">
                <li><strong>Tab:</strong> Move to next interactive element</li>
                <li><strong>Shift + Tab:</strong> Move to previous interactive element</li>
                <li><strong>Enter or Space:</strong> Activate buttons and links</li>
                <li><strong>Arrow Keys:</strong> Navigate within menus and lists</li>
                <li><strong>Escape:</strong> Close dialogs and menus</li>
              </ul>
            </div>
          </section>

          {/* WCAG Compliance Section */}
          <section className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center">
                <Shield className="h-8 w-8 text-slate-950" aria-hidden="true" />
              </div>
              <h2 className="text-3xl font-bold">WCAG 2.1 Level AA Compliance</h2>
            </div>
            
            <div className="space-y-6 text-lg text-white/80">
              <p>
                EduAccess meets WCAG 2.1 Level AA standards, ensuring accessibility for all users.
              </p>
              
              <h3 className="text-2xl font-bold text-white mt-8 mb-4">Our Commitments:</h3>
              <ul className="space-y-4 list-disc list-inside">
                <li>Minimum 7:1 contrast ratio for all text</li>
                <li>Semantic HTML5 structure throughout</li>
                <li>Comprehensive ARIA labels and roles</li>
                <li>4px focus rings on all interactive elements</li>
                <li>Descriptive alt text for all images</li>
                <li>Skip to main content link on every page</li>
              </ul>
            </div>
          </section>

          {/* Getting Help Section */}
          <section className="bg-white/5 border-2 border-white/10 rounded-2xl p-10">
            <h2 className="text-3xl font-bold mb-6">Need Help?</h2>
            <p className="text-lg text-white/80 mb-6">
              If you encounter any accessibility issues or have suggestions for improvement, please contact our support team.
            </p>
            <Link href="/admin/feedback">
              <Button 
                size="lg"
                className="bg-yellow-400 text-slate-950 hover:bg-yellow-300 focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2 font-semibold transition-all"
              >
                Contact Support
              </Button>
            </Link>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
