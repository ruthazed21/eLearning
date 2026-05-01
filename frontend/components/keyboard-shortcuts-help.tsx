'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Keyboard, X } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
}

interface KeyboardShortcutsHelpProps {
  shortcuts: Shortcut[];
  position?: 'top-right' | 'bottom-right';
}

export function KeyboardShortcutsHelp({ 
  shortcuts, 
  position = 'bottom-right' 
}: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed ${positionClasses[position]} z-50 shadow-lg`}
        aria-label="Toggle keyboard shortcuts help"
        title="Keyboard shortcuts (Shift+?)"
      >
        <Keyboard className="h-4 w-4" />
      </Button>

      {/* Help Panel */}
      {isOpen && (
        <div className={`fixed ${positionClasses[position]} z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg text-gray-900">Keyboard Shortcuts</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label="Close help"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-700">{shortcut.description}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {key}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
