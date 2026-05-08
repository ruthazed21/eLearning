import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcut {
  key: string;
  action: () => void;
  description: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const pressedKey = typeof e.key === 'string' ? e.key.toLowerCase() : '';

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (
          pressedKey === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          altMatch &&
          shiftMatch
        ) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Common navigation shortcuts for all pages
export function useCommonShortcuts(role: 'student' | 'teacher' | 'admin') {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'd',
      alt: true,
      action: () => router.push(`/${role}/dashboard`),
      description: 'Go to Dashboard',
    },
    {
      key: 'h',
      alt: true,
      action: () => router.push(`/${role}/dashboard`),
      description: 'Go to Home',
    },
    {
      key: '?',
      shift: true,
      action: () => {
        const helpText = getHelpText(role);
        alert(helpText);
      },
      description: 'Show keyboard shortcuts',
    },
  ];

  // Role-specific shortcuts
  if (role === 'student') {
    shortcuts.push(
      {
        key: 'c',
        alt: true,
        action: () => router.push('/student/courses'),
        description: 'Go to Courses',
      },
      {
        key: 'p',
        alt: true,
        action: () => router.push('/student/progress'),
        description: 'Go to Progress',
      },
      {
        key: 'q',
        alt: true,
        action: () => router.push('/student/quiz'),
        description: 'Go to Quiz',
      }
    );
  } else if (role === 'teacher') {
    shortcuts.push(
      {
        key: 'c',
        alt: true,
        action: () => router.push('/teacher/courses'),
        description: 'Go to Courses',
      },
      {
        key: 'u',
        alt: true,
        action: () => router.push('/teacher/upload'),
        description: 'Go to Upload',
      },
      {
        key: 'a',
        alt: true,
        action: () => router.push('/teacher/accessibility'),
        description: 'Go to Accessibility',
      }
    );
  } else if (role === 'admin') {
    shortcuts.push(
      {
        key: 'u',
        alt: true,
        action: () => router.push('/admin/users'),
        description: 'Go to Users',
      },
      {
        key: 'c',
        alt: true,
        action: () => router.push('/admin/courses'),
        description: 'Go to Courses',
      },
      {
        key: 'f',
        alt: true,
        action: () => router.push('/admin/feedback'),
        description: 'Go to Feedback',
      },
      {
        key: 's',
        alt: true,
        action: () => router.push('/admin/system'),
        description: 'Go to System',
      }
    );
  }

  useKeyboardShortcuts(shortcuts);
}

function getHelpText(role: string): string {
  const common = `Keyboard Shortcuts:
Alt+D - Dashboard
Alt+H - Home
Shift+? - Show this help
`;

  const roleSpecific: Record<string, string> = {
    student: `Alt+C - Courses
Alt+P - Progress
Alt+Q - Quiz`,
    teacher: `Alt+C - Courses
Alt+U - Upload
Alt+A - Accessibility`,
    admin: `Alt+U - Users
Alt+C - Courses
Alt+F - Feedback
Alt+S - System`
  };

  return common + '\n' + (roleSpecific[role] || '');
}
