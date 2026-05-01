'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  TrendingUp, 
  FileQuestion,
  Upload,
  Users,
  Settings,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  role: 'student' | 'teacher' | 'admin';
}

const studentLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/quiz', label: 'Quiz', icon: FileQuestion },
];

const teacherLinks = [
  { href: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/teacher/courses', label: 'My Courses', icon: BookOpen },
  { href: '/teacher/upload', label: 'Upload Lesson', icon: Upload },
];

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Manage Users', icon: Users },
  { href: '/admin/courses', label: 'Manage Courses', icon: GraduationCap },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  
  const links = role === 'student' ? studentLinks : role === 'teacher' ? teacherLinks : adminLinks;

  return (
    <aside 
      className="w-64 bg-white border-r border-gray-200 min-h-screen p-4"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="h-8 w-8" aria-hidden="true" />
          <span>EduAccess</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{role} Portal</p>
      </div>

      <nav aria-label={`${role} navigation menu`}>
        <ul className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
