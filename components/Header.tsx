import React, { useRef, useState, useEffect } from 'react';
import { Folder, BarChart3, Bot, Save, Upload, LogOut, UserCircle, Shield, Cloud, Menu, X, ChevronDown, ChevronUp, FileSpreadsheet, FolderOpen, FileText, Table, ExternalLink, Mail, Loader2, CheckCircle2, AlertCircle, Calendar, Trophy, BarChart2 } from 'lucide-react';

interface HeaderProps {
  user?: string;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenAssistant: () => void;
  onLogout?: () => void;
  onSwitchToAdmin?: () => void;
  onOpenCloud?: () => void;
  onOpenAchievements?: () => void;
  onOpenStats?: () => void;
  syncStatus?: 'idle' | 'syncing' | 'saved' | 'error' | 'unsaved';
  autoSyncEnabled?: boolean;
  onToggleAutoSync?: (enabled: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onExport, onImport, onOpenAssistant, onLogout, onSwitchToAdmin, onOpenCloud, onOpenAchievements, onOpenStats, syncStatus = 'idle', autoSyncEnabled = true, onToggleAutoSync }) => {
  const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const logoUrl = "https://drive.google.com/thumbnail?id=1BkFrIklMROkiE8ekHz3UpWjw7Yoo58dW&sz=h200"; 

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-trigger') && !target.closest('.dropdown-content')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(prev => prev === name ? null : name);
  };

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
  const DropdownButton: React.FC<{ id: string; label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ id, label, icon, children }) => {
    const isOpen = openDropdown === id;
    return (
      <div className="relative inline-block shrink-0">
        <button 
          onClick={() => toggleDropdown(id)}
          className={`dropdown-trigger flex items-center gap-2 px-4 py-1.5 text-[13px] border rounded-full transition-all whitespace-nowrap ${
            isOpen ? 'bg-gray-100 border-gray-400 text-textPrimary' : 'bg-white text-textPrimary border-borderLight hover:bg-gray-50 hover:border-gray-400'
          }`}
        >
          {icon}
          <span>{label}</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="dropdown-content absolute top-full left-0 mt-1 w-60 bg-white border border-borderLight shadow-lg rounded-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            {children}
          </div>
        )}
      </div>
    );
  };

  const DropdownLink: React.FC<{ href: string; label: string; icon?: React.ReactNode; onClick?: () => void }> = ({ href, label, icon, onClick }) => (
    <a 
      href={href} 
      target={href === '#' ? undefined : "_blank"} 
      rel={href === '#' ? undefined : "noopener noreferrer"}
      onClick={(e) => { 
        if(onClick) { e.preventDefault(); onClick(); }
      }}
      className="flex items-center gap-3 px-4 py-2 text-[13px] text-textPrimary hover:bg-gray-100 transition-colors"
    >
      {icon && <span className="text-textSecondary">{icon}</span>}
      <span>{label}</span>
    </a>
  );

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
        {onSwitchToAdmin && (
          <button onClick={onSwitchToAdmin} className="flex items-center gap-2 bg-gray-800 text-white px-3 py-1.5 rounded-full text-[12px] font-bold hover:bg-black transition-colors mr-2 shadow-sm animate-in fade-in" title="Ver Panel de Equipo">
            <Shield size={12} /> ADMIN
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2 mr-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            <UserCircle size={16} className="text-accentBlue" />
            <span className="text-xs font-bold text-textSecondary uppercase">{user}</span>
          </div>
        )}

        <a href="https://mail.google.com/mail/u/0/?tab=rm&ogbl#inbox" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-1.5 text-[13px] bg-white text-textPrimary border border-borderLight rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all whitespace-nowrap" title="Ir a Gmail">
          <Mail size={14} className="text-red-500" /> <span>Gmail</span>
        </a>

        <a href="https://calendar.google.com/calendar/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-1.5 text-[13px] bg-white text-textPrimary border border-borderLight rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all whitespace-nowrap" title="Ir a Google Calendar">
          <Calendar size={14} className="text-blue-500" /> <span>Calendar</span>
        </a>

        <DropdownButton id="drive" label="Drive" icon={<Folder size={14} />}>
          <DropdownLink href="https://drive.google.com" label="Mi Unidad" icon={<Folder size={14} />} />
          <DropdownLink href="https://drive.google.com/drive/u/0/folders/0AOfY-G1iWo0sUk9PVA" label="Unidad Compartida" icon={<FolderOpen size={14} />} />
          <DropdownLink href="https://drive.google.com/drive/u/0/folders/1CotTzY1cnyunmSyc_EuFx5EtbVD84Cl7" label="SGI Editable" icon={<FileText size={14} />} />
          <DropdownLink href="https://drive.google.com/drive/u/0/folders/15ak2dn13Q8sU-0mdw29QL3dHlbJEJnZU" label="Proyecto OEA" icon={<Folder size={14} />} />
        </DropdownButton>

        <DropdownButton id="planillas" label="Planillas" icon={<FileSpreadsheet size={14} />}>
          <DropdownLink href="https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=0#gid=0" label="Incidentes Operativos" icon={<Table size={14} />} />
          <DropdownLink href="https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=347181817#gid=347181817" label="Desvíos Forms" icon={<Table size={14} />} />
          <DropdownLink href="https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=265138253#gid=265138253" label="OM Forms" icon={<Table size={14} />} />
        </DropdownButton>

        <DropdownButton id="kpis" label="KPIs" icon={<BarChart3 size={14} />}>
          <DropdownLink href="https://lookerstudio.google.com/u/0/reporting/072e72ce-4622-4813-b7c2-e9d5ee2bb2bd/page/p_pct0u764zd" label="Dashboard General" icon={<BarChart3 size={14} />} />
          <DropdownLink href="https://lookerstudio.google.com/u/0/reporting/c634ad6a-c311-4989-bfea-983eb6ed8b36/page/p_m452s0ue0d" label="Panel de seguimiento" icon={<Table size={14} />} />
        </DropdownButton>

        <DropdownButton id="ia" label="IA" icon={<Bot size={14} />}>
          <DropdownLink href="#" label="Asistente Desvíos" onClick={onOpenAssistant} icon={<Bot size={14} />} />
          <div className="h-px bg-gray-100 my-1"></div>
          <DropdownLink href="https://chatgpt.com" label="ChatGPT" icon={<ExternalLink size={14} />} />
          <DropdownLink href="https://gemini.google.com" label="Gemini" icon={<ExternalLink size={14} />} />
          <DropdownLink href="https://aistudio.google.com/" label="Google AI Studio" icon={<ExternalLink size={14} />} />
          <DropdownLink href="https://notebooklm.google.com/" label="Notebook LM" icon={<ExternalLink size={14} />} />
          <DropdownLink href="https://make.com" label="Make" icon={<ExternalLink size={14} />} />
        </DropdownButton>

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