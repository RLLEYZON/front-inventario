"use client";

import { useState } from 'react';
import { login } from '@/api';
import { Loader2, ShieldCheck, Mail, Lock } from 'lucide-react';
import Image from 'next/image';

interface LoginProps {
  onLogin: (user: any) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login({ email, password });
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const autofill = (role: string) => {
    if (role === 'ADMIN') { setEmail('admin@cooperativa.com'); setPassword('admin'); }
    if (role === 'ALMACENERO') { setEmail('almacen@cooperativa.com'); setPassword('almacen'); }
    if (role === 'SECRETARIA') { setEmail('secretaria@cooperativa.com'); setPassword('secre'); }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      
      {/* Left Column: Image / Banner */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
        <Image 
          src="/premio.jpg" 
          alt="Cooperativa Premio" 
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute bottom-0 left-0 right-0 p-12 z-20 text-white">
          <h2 className="text-4xl font-bold mb-4">Orgullo de nuestra tierra</h2>
          <p className="text-lg text-slate-200 opacity-90 max-w-lg">
            ¡Felicitaciones! Primer puesto. La calidad es nuestra pasión y el esfuerzo de cada día se refleja en nuestros logros.
          </p>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative bg-slate-50">
        <div className="max-w-md w-full relative z-10">
          
          <div className="text-center mb-10">
            <div className="relative w-48 h-48 mx-auto mb-2">
              <Image 
                src="/logo.png" 
                alt="CEPROAA Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Sistema de Inventarios</h1>
            <p className="text-slate-500 mt-1">Acceso seguro al sistema de almacén</p>
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl shadow-slate-200/50">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <ShieldCheck className="text-[#15803d]" size={24} />
              Iniciar Sesión
            </h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 mb-6 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#15803d]/20 focus:border-[#15803d] transition-all outline-none font-medium text-slate-700"
                    placeholder="usuario@cooperativa.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#15803d]/20 focus:border-[#15803d] transition-all outline-none font-medium text-slate-700"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl font-bold transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-[#15803d]/30"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Ingresar al Sistema'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 mb-4 text-center uppercase tracking-wider">Acceso Rápido (Pruebas)</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => autofill('ADMIN')} type="button" className="py-2 px-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors border border-slate-200">
                  Admin
                </button>
                <button onClick={() => autofill('ALMACENERO')} type="button" className="py-2 px-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors border border-slate-200">
                  Almacén
                </button>
                <button onClick={() => autofill('SECRETARIA')} type="button" className="py-2 px-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors border border-slate-200">
                  Secretaria
                </button>
              </div>
            </div>

          </div>
          
          <div className="text-center mt-8 text-sm font-medium text-slate-400">
            &copy; {new Date().getFullYear()} Cooperativa CEPROAA
          </div>
        </div>
      </div>
    </div>
  );
}
