"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Login } from './Login';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('coop_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  if (loading) return null;

  if (!user) {
    return <Login onLogin={(u) => {
      localStorage.setItem('coop_user', JSON.stringify(u));
      setUser(u);
    }} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} user={user} />
      
      <div className="flex-1 flex flex-col h-screen min-w-0 relative">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} user={user} onLogout={() => {
          localStorage.removeItem('coop_user');
          setUser(null);
        }} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/60 via-slate-50 to-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
