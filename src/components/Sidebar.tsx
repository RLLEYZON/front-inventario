"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  Home,
  Package,
  ArrowLeftRight,
  Settings2,
  ClipboardCheck,
  BarChart3,
  Users,
  X,
  Layers
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export function Sidebar({ isOpen, onClose, user }: SidebarProps) {
  const pathname = usePathname();

  const role = user?.role || 'USER';

  // Role Permissions Logic
  // ADMIN: All
  // ALMACENERO: Inicio, Inventario, Movimientos, Conteo
  // SECRETARIA: Inicio, Inventario, Reportes, Movimientos (view)

  const menuItems = [
    { name: 'Inicio', path: '/', icon: Home, roles: ['ADMIN', 'ALMACENERO', 'SECRETARIA'] },
    { name: 'Inventario', path: '/inventario', icon: Package, roles: ['ADMIN', 'ALMACENERO', 'SECRETARIA'] },
    { name: 'Movimientos', path: '/movimientos', icon: ArrowLeftRight, roles: ['ADMIN', 'ALMACENERO', 'SECRETARIA'] },
    { name: 'Ajustes', path: '/ajustes', icon: Settings2, roles: ['ADMIN'] },
    { name: 'Conteo Físico', path: '/conteo', icon: ClipboardCheck, roles: ['ADMIN', 'ALMACENERO'] },
    { name: 'Kardex y Reportes', path: '/reportes', icon: BarChart3, roles: ['ADMIN', 'SECRETARIA'] },
    { name: 'Administración', path: '/admin', icon: Users, roles: ['ADMIN'] },
  ];

  const allowedMenus = menuItems.filter(item => item.roles.includes(role));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between h-20 px-6 bg-slate-900 border-b border-white/5">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 shadow-lg shadow-blue-500/20 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-blue-500/40 overflow-hidden p-1 border border-white/10">
                <Image
                  src="/logo.png"
                  alt="CEPROAA Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300 tracking-tight leading-tight transition-all duration-300 group-hover:from-blue-400 group-hover:to-indigo-300">
                  CEPROAA
                </span>
                <span className="text-[0.65rem] font-semibold text-blue-400 tracking-widest uppercase">
                  Inventario
                </span>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {allowedMenus.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                    ? 'bg-blue-600/15 text-blue-400 font-medium shadow-sm ring-1 ring-blue-500/20'
                    : 'hover:bg-slate-800/80 hover:text-white'
                    }`}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/5 bg-slate-950/30">
            <div className="text-xs text-slate-500 text-center font-medium">
              Sistema de Control de Inventarios<br />v1.0
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
