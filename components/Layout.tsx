
import React from 'react';
import { User, UserRole } from '../types';
import { GobondIcon } from './gobondIcon';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, activeTab, setActiveTab, onLogout, theme, onToggleTheme }) => {
  if (!user) return <>{children}</>;

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-0 md:pl-64 transition-colors">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-border-subtle bg-surface p-6 z-40 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-primary to-green-600 rounded-lg p-2 text-background flex items-center justify-center shadow-lg shadow-primary/20">
            <GobondIcon className="w-10 h-10" />          </div>
          <div>
            <h1 className="text-4xl text-primary font-bold tracking-tight normal-case">
              <span className="text-[var(--primary)]">Go</span>
              <span className="text-[var(--text)]">Bond</span>
              <span className="text-[var(--primary)]">!</span>
            </h1>
            <p className="text-text text-[11px] font-bold uppercase tracking-widest leading-none">Interurbanos</p>
          </div>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'home' ? 'bg-primary text-background shadow-lg' : 'text-slate-500 hover:bg-primary/10 hover:text-primary'}`}
          >
            <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'home' ? 1 : 0}` }}>home</span>
            <span className="font-bold text-sm">Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'search' ? 'bg-primary text-background shadow-lg' : 'text-slate-500 hover:bg-primary/10 hover:text-primary'}`}
          >
            <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'search' ? 1 : 0}` }}>search</span>
            <span className="font-bold text-sm">Buscar</span>
          </button>

          <button
            onClick={() => setActiveTab('tips')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'tips' ? 'bg-primary text-background shadow-lg' : 'text-slate-500 hover:bg-primary/10 hover:text-primary'}`}
          >
            <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'tips' ? 1 : 0}` }}>volunteer_activism</span>
            <span className="font-bold text-sm">Colaborar</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-primary text-background shadow-lg' : 'text-slate-500 hover:bg-primary/10 hover:text-primary'}`}
          >
            <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'profile' ? 1 : 0}` }}>person</span>
            <span className="font-bold text-sm">Mi Perfil</span>
          </button>

          {user.role === UserRole.ADMIN && (
            <>
              <button
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-primary text-background shadow-lg' : 'text-slate-500 hover:bg-primary/10 hover:text-primary'}`}
              >
                <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'admin' ? 1 : 0}` }}>settings</span>
                <span className="font-bold text-sm">Administración</span>
              </button>
              <button
                onClick={() => setActiveTab('metrics')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'metrics' ? 'bg-primary text-background shadow-lg' : 'text-slate-500 hover:bg-primary/10 hover:text-primary'}`}
              >
                <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'metrics' ? 1 : 0}` }}>monitoring</span>
                <span className="font-bold text-sm">Métricas</span>
              </button>
            </>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-border-subtle space-y-4">
          <button onClick={onToggleTheme} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text/50 hover:bg-surface-variant transition-all font-bold text-sm">
            <span className="material-symbols-rounded">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
            <span>{theme === 'light' ? 'Oscuro' : 'Claro'}</span>
          </button>

          <div className="flex items-center gap-3 px-2">
            <img src={user.avatar_url} className="w-10 h-10 rounded-full border-2 border-primary/20" alt="Avatar" />
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate">{user.name || user.email}</p>
              <p className="text-slate-500 text-[9px] uppercase font-bold">{user.role}</p>
            </div>
          </div>

          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all font-bold text-sm">
            <span className="material-symbols-rounded">logout</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border-subtle flex justify-around py-3 px-6 z-40 shadow-lg transition-colors">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-primary' : 'text-text/30'}`}>
          <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'home' ? 1 : 0}` }}>home</span>
          <span className="text-[9px] font-bold">Inicio</span>
        </button>
        <button onClick={() => setActiveTab('search')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'search' ? 'text-primary' : 'text-text/30'}`}>
          <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'search' ? 1 : 0}` }}>search</span>
          <span className="text-[9px] font-bold">Buscar</span>
        </button>
        <button onClick={() => setActiveTab('tips')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'tips' ? 'text-primary' : 'text-text/30'}`}>
          <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'tips' ? 1 : 0}` }}>volunteer_activism</span>
          <span className="text-[9px] font-bold">Tips</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-primary' : 'text-text/30'}`}>
          <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'profile' ? 1 : 0}` }}>person</span>
          <span className="text-[9px] font-bold">Perfil</span>
        </button>
        {user.role === UserRole.ADMIN && (
          <>
            <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'admin' ? 'text-primary' : 'text-text/30'}`}>
              <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'admin' ? 1 : 0}` }}>settings</span>
              <span className="text-[9px] font-bold">Admin</span>
            </button>
            <button onClick={() => setActiveTab('metrics')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'metrics' ? 'text-primary' : 'text-text/30'}`}>
              <span className="material-symbols-rounded" style={{ fontVariationSettings: `'FILL' ${activeTab === 'metrics' ? 1 : 0}` }}>monitoring</span>
              <span className="text-[9px] font-bold">Métricas</span>
            </button>
          </>
        )}
      </nav>

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full transition-colors">
        {children}
      </main>

      <footer className="w-full py-6 px-6 border-t border-border-subtle bg-surface/50 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-text/40 text-[10px] font-bold uppercase tracking-widest">
          <p>© {new Date().getFullYear()} GoBond! Interurbanos. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <span className="hover:text-primary transition-colors cursor-pointer">Términos y condiciones</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Privacidad</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
