import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';

interface DashboardLayoutProps {
  children: ReactNode;
  role: 'student' | 'teacher' | 'admin';
  userName?: string;
  userRole?: string;
}

export function DashboardLayout({ 
  children, 
  role, 
  userName, 
  userRole 
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col">
        <Navbar userName={userName} userRole={userRole} />
        <main className="flex-1 p-6" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
