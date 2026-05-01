'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  TrendingUp, 
  FileQuestion,
  Upload,
  Users,
  GraduationCap,
  UserCircle,
  Accessibility,
  MessageSquare,
  Activity,
  LogOut
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';

interface AppSidebarProps {
  role: 'student' | 'teacher' | 'admin';
}

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const studentLinks: NavLink[] = [
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/courses', label: 'My Courses', icon: BookOpen },
  { href: '/student/progress', label: 'Progress', icon: TrendingUp },
  { href: '/student/quiz', label: 'Take Quiz', icon: FileQuestion },
  { href: '/student/accessibility', label: 'Accessibility', icon: Accessibility },
  { href: '/student/profile', label: 'Profile', icon: UserCircle },
];

const teacherLinks: NavLink[] = [
  { href: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/teacher/courses', label: 'My Courses', icon: BookOpen },
  { href: '/teacher/upload', label: 'Upload Lesson', icon: Upload },
  { href: '/teacher/accessibility', label: 'Accessibility', icon: Accessibility },
  { href: '/teacher/profile', label: 'Profile', icon: UserCircle },
];

const adminLinks: NavLink[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/courses', label: 'Courses', icon: GraduationCap },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/admin/system', label: 'System Logs', icon: Activity },
];

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  
  const links = role === 'student' ? studentLinks : role === 'teacher' ? teacherLinks : adminLinks;
  const roleColors = {
    student: { primary: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600' },
    teacher: { primary: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-600' },
    admin: { primary: 'bg-slate-800', light: 'bg-slate-50', text: 'text-slate-800' },
  }[role];

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-gray-200">
      {/* Header */}
      <SidebarHeader className="border-b border-gray-200 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-gray-50">
              <Link href="/">
                <div className={`flex aspect-square size-10 items-center justify-center rounded-xl ${roleColors.primary} shadow-sm`}>
                  <GraduationCap className="size-5 text-white" />
                </div>
                <div className="flex flex-col gap-1 leading-none">
                  <span className="font-bold text-base text-gray-900">EduAccess</span>
                  <span className={`text-xs font-medium capitalize ${roleColors.text}`}>
                    {role} Portal
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                
                return (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={link.label}
                      className={`
                        h-11 px-3 rounded-lg transition-all duration-200
                        ${isActive 
                          ? `${roleColors.light} ${roleColors.text} font-semibold shadow-sm` 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Link href={link.href} className="flex items-center gap-3 w-full">
                        <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? roleColors.text : 'text-gray-500'}`} />
                        <span className="text-sm">{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-gray-200 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild
              tooltip="Logout"
              className="h-11 px-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            >
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 w-full"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
