import React, { useRef, useState } from 'react';
import { Search, Save, Upload, LogOut, Cloud, Menu, X, Loader2, CheckCircle2, AlertCircle, Trophy, BarChart2, Bot } from 'lucide-react';

interface HeaderProps {
  user?: string;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenAssistant: () => void;
  onLogout?: () => void;
  onOpenCloud?: () => void;
  onOpenAchievements?: () => void;
  onOpenStats?: () => void;
  syncStatus?: 'idle' | 'syncing' | 'saved' | 'error' | 'unsaved';
  autoSyncEnabled?: boolean;
  onToggleAutoSync?: (enabled: boolean) => void;
  onOpenSearch?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onExport, onImport, onOpenAssistant, onLogout, onOpenCloud, onOpenAchievements, onOpenStats, syncStatus = 'idle', autoSyncEnabled = true, onToggleAutoSync, onOpenSearch }) => {
  const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const logoUrl = "https://drive.google.com/thumbnail?id=1BkFrIklMROkiE8ekHz3UpWjw7Yoo58dW&sz=h200";

  /* --- HELPER PARA STATUS CLOUD --- */
  const renderCloudStatus = () => {
    switch (syncStatus) {
        case 'syncing':
            return <div className="flex items-center gap-1 text-xs text-blue-600 font-medium animate-pulse"><Loader2 size={12} className="animate-spin" /> <span className="hidden sm:inline">Guardando...</span></div>;
        case 'saved':
            return <div className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 size={12} /> <span className="hidden sm:inline">Guardado</span></div>;
        case 'unsaved':
            return <div className="flex items-center gap-1 text-xs text-amber-600 font-medium"><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div> <span className="hidden sm:inline">Sin guardar</span></div>;
        case 'error':
            return <div className="flex items-center gap-1 text-xs text-red-500 font-bold"><AlertCircle size={12} /> <span className="hidden sm:inline">Error</span></div>;
        default:
            return <Cloud size={16} />;
    }
  };

  /* --- DESKTOP COMPONENTS --- */

  return (
    <header className="h-[50px] px-5 bg-white border-b border-borderLight flex justify-between items-center shadow-sm z-20 shrink-0 relative">
      <div className="flex items-center gap-3 shrink-0">
        <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
        <div>
           <h1 className="text-sm font-bold text-textPrimary leading-none uppercase tracking-tight">CALIDAD y TECNOLOGÍA</h1>
           <p className="text-[10px] text-textSecondary leading-none mt-0.5">Gestión de tareas</p>
        </div>
        <span className="text-xs text-textSecondary capitalize hidden sm:block border-l border-gray-300 pl-3 ml-2">{dateStr}</span>
      </div>

      <div className="hidden md:flex items-center gap-3 h-full pl-4">
        <button onClick={onOpenSearch} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-slate-800 text-white rounded-full hover:bg-slate-900 transition-all font-medium" title="Búsqueda Global (Ctrl+K)">
          <Search size={14} /> <span className="hidden xl:inline text-[10px] text-slate-300 font-mono tracking-widest pl-1 border-l border-slate-600 ml-1">Ctrl K</span>
        </button>

        <div className="w-px h-5 bg-borderLight mx-1 shrink-0"></div>

        {/* CLOUD BUTTON WITH STATUS */}
        <button 
            onClick={onOpenCloud} 
            title="Sincronizar Nube" 
            className={`p-2 rounded-full border border-borderLight transition-all shrink-0 ${
                syncStatus === 'syncing' ? 'bg-blue-50 border-blue-200' :
                syncStatus === 'saved' ? 'bg-green-50 border-green-200' :
                syncStatus === 'error' ? 'bg-red-50 border-red-200' :
                syncStatus === 'unsaved' ? 'bg-amber-50 border-amber-200' :
                'hover:bg-blue-50 text-accentBlue'
            }`}
        >
          {renderCloudStatus()}
        </button>

        <button onClick={onOpenAchievements} title="Logros" className="p-2 rounded-full border border-borderLight hover:bg-yellow-50 text-yellow-500 hover:text-yellow-600 transition-colors shrink-0">
          <Trophy size={16} />
        </button>

        <button onClick={onOpenStats} title="Estadísticas" className="p-2 rounded-full border border-borderLight hover:bg-blue-50 text-accentBlue hover:text-blue-700 transition-colors shrink-0">
          <BarChart2 size={16} />
        </button>

        <button onClick={onExport} title="Backup Local" className="p-2 rounded-full border border-borderLight hover:bg-gray-50 text-textSecondary hover:text-textPrimary transition-colors shrink-0">
          <Save size={16} />
        </button>

        <button onClick={() => fileInputRef.current?.click()} title="Restaurar Local" className="p-2 rounded-full border border-borderLight hover:bg-gray-50 text-textSecondary hover:text-textPrimary transition-colors shrink-0">
          <Upload size={16} />
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={onImport} accept=".json" />

        {/* Auto-Sync Toggle — reemplaza el botón Reportar */}
        <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm hover:bg-gray-50 transition-colors shrink-0">
          <input type="checkbox" className="sr-only" checked={autoSyncEnabled} onChange={(e) => onToggleAutoSync?.(e.target.checked)} />
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${autoSyncEnabled ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`}></div>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
            {autoSyncEnabled ? 'Auto-Sync Activo' : 'Auto-Sync Pausado'}
          </span>
        </label>

        {onLogout && (
           <button onClick={onLogout} title="Cerrar Sesión" className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
             <LogOut size={16} />
           </button>
        )}
      </div>

      <div className="flex md:hidden items-center gap-3">
         <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-textSecondary hover:bg-gray-100 rounded-md transition-colors">
           {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
         </button>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
         <div className="absolute top-[50px] right-0 left-0 bg-[#FAFAFA] border-b border-borderLight shadow-2xl z-50 flex flex-col p-4 gap-2 md:hidden animate-in slide-in-from-top-2">
             
             {/* Mobile: Cloud Sync */}
             <button 
                onClick={() => { onOpenCloud?.(); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-borderLight rounded-lg text-textPrimary hover:bg-gray-50"
             >
                <Cloud size={18} className="text-accentBlue" /> 
                <span className="text-sm font-medium">Sincronización Nube</span>
                <div className="ml-auto">{renderCloudStatus()}</div>
             </button>

             {/* Mobile: Assistant */}
             <button 
                onClick={() => { onOpenAssistant(); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-borderLight rounded-lg text-textPrimary hover:bg-gray-50"
             >
                <Bot size={18} className="text-accentBlue" /> 
                <span className="text-sm font-medium">Asistente IA</span>
             </button>

             {/* Mobile: Backup/Restore */}
             <div className="grid grid-cols-2 gap-2">
                 <button onClick={onExport} className="flex flex-col items-center justify-center p-3 bg-white border border-borderLight rounded-lg text-textSecondary hover:bg-gray-50">
                    <Save size={16} className="mb-1" />
                    <span className="text-xs">Backup</span>
                 </button>
                 <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-3 bg-white border border-borderLight rounded-lg text-textSecondary hover:bg-gray-50">
                    <Upload size={16} className="mb-1" />
                    <span className="text-xs">Restaurar</span>
                 </button>
             </div>

             <div className="h-px bg-gray-200 my-1"></div>

             {/* Mobile: Logout */}
             <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-lg font-bold text-sm">
                  <LogOut size={18} /> Cerrar Sesión
            </button>
         </div>
      )}
    </header>
  );
};

export default Header;