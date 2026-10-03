"use client";

import { Menu, Bell, Search, UserCircle } from 'lucide-react';

interface TopbarProps {
  onMenuClick: () => void;
  user?: any;
  onLogout?: () => void;
}

export function Topbar({ onMenuClick, user, onLogout }: TopbarProps) {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Menu size={24} />
        </button>
        
        <div className="hidden sm:flex items-center relative max-w-md w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-3" />
          <input 
            type="text"
            placeholder="Buscar en el sistema..."
            className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 hover:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <button className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-full relative transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        
        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
        
        <div className="flex items-center gap-2.5 hover:bg-slate-50 p-1.5 rounded-lg transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 text-left relative group cursor-pointer">
          <UserCircle size={32} strokeWidth={1.5} className="text-slate-400" />
          <div className="hidden md:block">
            <div className="text-sm font-semibold text-slate-700 leading-none mb-1">{user?.fullName || 'Usuario'}</div>
            <div className="text-xs text-slate-500 leading-none">{user?.role === 'ALMACENERO' ? 'Almacén' : user?.role || 'Invitado'}</div>
          </div>
          
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="p-2">
              <button 
                onClick={onLogout}
                className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
