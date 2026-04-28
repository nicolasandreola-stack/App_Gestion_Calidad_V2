import React, { useState, useEffect, useRef } from 'react';
import {
  ListTodo, Users, BarChart2, ChevronLeft, ChevronRight,
  Globe, Folder, FolderOpen, FileText, Table, FileSpreadsheet,
  BarChart3, Bot, ExternalLink, ChevronDown, Mail, Calendar,
  LogOut, UserCircle, Shield, Settings, Code, Key, ShieldAlert,
  Github, Server
} from 'lucide-react';

export type AppView = 'tasks' | 'team' | 'gantt';

interface AppSidebarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  isAdmin: boolean;
  currentUser: string;
  onLogout: () => void;
  onOpenAssistant: () => void;
  onShowTokenHelp?: () => void;
}

interface QuickLinkGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  links: { label: string; href: string; icon: React.ReactNode; action?: () => void }[];
}

const SIDEBAR_COLLAPSED_KEY = 'v25_sidebar_collapsed';

const NAV_ITEMS = [
  {
    id: 'tasks' as AppView,
    label: 'Gestión de Tareas',
    icon: <ListTodo size={18} />,
    adminOnly: false,
    description: 'Panel personal',
  },
  {
    id: 'team' as AppView,
    label: 'Seguimiento Equipo',
    icon: <Users size={18} />,
    adminOnly: true,
    description: 'Asignación y KPIs',
  },
  {
    id: 'gantt' as AppView,
    label: 'Gestión de Tareas Planificadas',
    icon: <BarChart2 size={18} />,
    adminOnly: true,
    description: 'Diagrama Gantt',
  },
];

const AppSidebar: React.FC<AppSidebarProps> = ({
  activeView,
  onNavigate,
  isAdmin,
  currentUser,
  onLogout,
  onOpenAssistant,
  onShowTokenHelp,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Cerrar grupos al colapsar
  useEffect(() => {
    if (isCollapsed) setOpenGroup(null);
  }, [isCollapsed]);

  // Cerrar settings al hacer click fuera
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [isSettingsOpen]);

  const quickLinkGroups: QuickLinkGroup[] = [
    {
      id: 'google',
      label: 'Google',
      icon: <Globe size={14} />,
      color: 'text-blue-500',
      links: [
        { label: 'Gmail', href: 'https://mail.google.com/mail/u/0/?tab=rm&ogbl#inbox', icon: <Mail size={13} className="text-red-500" /> },
        { label: 'Calendar', href: 'https://calendar.google.com/calendar/', icon: <Calendar size={13} className="text-blue-500" /> },
      ],
    },
    {
      id: 'drive',
      label: 'Drive',
      icon: <Folder size={14} />,
      color: 'text-yellow-500',
      links: [
        { label: 'Mi Unidad', href: 'https://drive.google.com', icon: <Folder size={13} /> },
        { label: 'Unidad Compartida', href: 'https://drive.google.com/drive/u/0/folders/0AOfY-G1iWo0sUk9PVA', icon: <FolderOpen size={13} /> },
        { label: 'SGI Editable', href: 'https://drive.google.com/drive/u/0/folders/1CotTzY1cnyunmSyc_EuFx5EtbVD84Cl7', icon: <FileText size={13} /> },
        { label: 'Proyecto OEA', href: 'https://drive.google.com/drive/u/0/folders/15ak2dn13Q8sU-0mdw29QL3dHlbJEJnZU', icon: <Folder size={13} /> },
      ],
    },
    {
      id: 'planillas',
      label: 'Planillas',
      icon: <FileSpreadsheet size={14} />,
      color: 'text-emerald-500',
      links: [
        { label: 'Incidentes Operativos', href: 'https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=0#gid=0', icon: <Table size={13} /> },
        { label: 'Desvíos Forms', href: 'https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=347181817#gid=347181817', icon: <Table size={13} /> },
        { label: 'OM Forms', href: 'https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=265138253#gid=265138253', icon: <Table size={13} /> },
      ],
    },
    {
      id: 'kpis',
      label: 'KPIs',
      icon: <BarChart3 size={14} />,
      color: 'text-violet-500',
      links: [
        { label: 'Dashboard General', href: 'https://lookerstudio.google.com/u/0/reporting/072e72ce-4622-4813-b7c2-e9d5ee2bb2bd/page/p_pct0u764zd', icon: <BarChart3 size={13} /> },
        { label: 'Panel de seguimiento', href: 'https://lookerstudio.google.com/u/0/reporting/c634ad6a-c311-4989-bfea-983eb6ed8b36/page/p_m452s0ue0d', icon: <Table size={13} /> },
      ],
    },
    {
      id: 'ia',
      label: 'Herramientas IA',
      icon: <Bot size={14} />,
      color: 'text-sky-500',
      links: [
        { label: 'Asistente Desvíos', href: '#', icon: <Bot size={13} />, action: onOpenAssistant },
        { label: 'ChatGPT', href: 'https://chatgpt.com', icon: <ExternalLink size={13} /> },
        { label: 'Gemini', href: 'https://gemini.google.com', icon: <ExternalLink size={13} /> },
        { label: 'Google AI Studio', href: 'https://aistudio.google.com/', icon: <ExternalLink size={13} /> },
        { label: 'Notebook LM', href: 'https://notebooklm.google.com/', icon: <ExternalLink size={13} /> },
        { label: 'Make', href: 'https://make.com', icon: <ExternalLink size={13} /> },
      ],
    },
  ];

  const visibleNavItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside
      className={`flex flex-col h-full bg-slate-900 text-white transition-all duration-300 ease-in-out shrink-0 relative z-30 ${
        isCollapsed ? 'w-[60px]' : 'w-[240px]'
      }`}
    >
      {/* ── Header del sidebar ── */}
      <div className={`flex items-center shrink-0 border-b border-slate-700/60 ${isCollapsed ? 'justify-center py-4' : 'gap-2.5 px-4 py-3.5'}`}>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Centro de</p>
            <p className="text-sm font-black text-white leading-tight tracking-tight">COMANDO</p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(prev => !prev)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all shrink-0"
          title={isCollapsed ? 'Expandir' : 'Colapsar'}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* ── Usuario activo ── */}
      {!isCollapsed && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-700/60 bg-slate-800/40 shrink-0">
          <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
            {isAdmin
              ? <Shield size={12} className="text-blue-400" />
              : <UserCircle size={12} className="text-blue-400" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white leading-tight truncate uppercase">{currentUser}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{isAdmin ? 'Administrador' : 'Usuario'}</p>
          </div>
        </div>
      )}

      {isCollapsed && (
        <div className="flex justify-center py-2 border-b border-slate-700/60 shrink-0">
          <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            {isAdmin ? <Shield size={12} className="text-blue-400" /> : <UserCircle size={12} className="text-blue-400" />}
          </div>
        </div>
      )}

      {/* ── Sección VISTAS ── */}
      <div className="px-2 pt-3 pb-2 shrink-0">
        {!isCollapsed && (
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-1.5">Vistas</p>
        )}
        <nav className="flex flex-col gap-0.5">
          {visibleNavItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center rounded-lg transition-all duration-150 ${
                  isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span className={`shrink-0 transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className={`text-[13px] font-semibold leading-tight truncate ${isActive ? 'text-white' : ''}`}>
                      {item.label}
                    </p>
                    <p className={`text-[10px] leading-tight ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                      {item.description}
                    </p>
                  </div>
                )}
                {isActive && !isCollapsed && (
                  <span className="w-1 h-1 rounded-full bg-white/70 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Separador ── */}
      <div className="mx-3 h-px bg-slate-700/60 shrink-0" />

      {/* ── Sección ACCESOS RÁPIDOS ── */}
      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-2 min-h-0">
        {!isCollapsed && (
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-1.5">Accesos Rápidos</p>
        )}

        {isCollapsed ? (
          /* Modo colapsado: solo íconos de grupos como botones directos al primer link */
          <div className="flex flex-col gap-1 items-center">
            {quickLinkGroups.map(group => (
              <a
                key={group.id}
                href={group.links[0]?.href || '#'}
                target={group.links[0]?.href === '#' ? undefined : '_blank'}
                rel="noopener noreferrer"
                title={group.label}
                className={`p-2.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors ${group.color}`}
              >
                {group.icon}
              </a>
            ))}
          </div>
        ) : (
          /* Modo expandido: acordeón */
          <div className="flex flex-col gap-0.5">
            {quickLinkGroups.map(group => {
              const isOpen = openGroup === group.id;
              return (
                <div key={group.id}>
                  <button
                    onClick={() => setOpenGroup(isOpen ? null : group.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/40 transition-colors group"
                  >
                    <span className={`shrink-0 ${group.color}`}>{group.icon}</span>
                    <span className="flex-1 text-[12px] font-semibold text-left">{group.label}</span>
                    <ChevronDown
                      size={11}
                      className={`text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      isOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="pl-3 pr-1 pb-1 flex flex-col gap-0.5">
                      {group.links.map((link, i) => (
                        <a
                          key={i}
                          href={link.href}
                          target={link.href === '#' ? undefined : '_blank'}
                          rel={link.href === '#' ? undefined : 'noopener noreferrer'}
                          onClick={(e) => {
                            if (link.action) {
                              e.preventDefault();
                              link.action();
                            }
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11.5px] text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors group/link"
                        >
                          <span className="text-slate-600 group-hover/link:text-slate-300 shrink-0 transition-colors">
                            {link.icon}
                          </span>
                          <span className="flex-1 leading-tight truncate">{link.label}</span>
                          <ExternalLink size={9} className="text-slate-700 group-hover/link:text-slate-500 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer: Config (admin) + Logout ── */}
      <div className={`border-t border-slate-700/60 shrink-0 ${isCollapsed ? 'flex flex-col items-center gap-1 p-2' : 'px-3 py-2 flex flex-col gap-1'}`}>
        {/* Botón Configuración — solo admins */}
        {isAdmin && (
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setIsSettingsOpen(prev => !prev)}
              title="Configuración App"
              className={`flex items-center gap-2.5 rounded-lg transition-colors ${
                isSettingsOpen ? 'text-white bg-slate-700/60' : 'text-slate-500 hover:text-white hover:bg-slate-700/50'
              } ${isCollapsed ? 'p-2.5' : 'px-3 py-2 w-full'}`}
            >
              <Settings size={15} className="shrink-0" />
              {!isCollapsed && <span className="text-[12px] font-medium">Configuración</span>}
            </button>

            {/* Popover de links */}
            {isSettingsOpen && (
              <div className={`absolute bottom-full mb-2 z-50 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 ${
                isCollapsed ? 'left-full ml-2 bottom-0 mb-0' : 'left-0'
              }`}>
                <div className="px-3 py-2 border-b border-slate-700">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Configuración App</p>
                </div>
                <div className="py-1">
                  {[
                    { href: 'https://aistudio.google.com/apps/drive/1o2S1UoYnTzYmAiU1RuMNs5iyiIPLaOxa?showAssistant=true&showPreview=true', icon: <Code size={13} />, label: 'Google AI Studio (Proyecto)' },
                    { href: 'https://aistudio.google.com/app/api-keys?projectFilter=gen-lang-client-0508130572', icon: <Key size={13} />, label: 'Google AI Studio (API Key)' },
                    { href: 'https://console.cloud.google.com/auth/clients/270210570235-64gpfb89fi5s39514h6l88osv72hijrp.apps.googleusercontent.com?project=gen-lang-client-0377615287', icon: <ShieldAlert size={13} />, label: 'Google Cloud (Orígenes)' },
                    { href: '#', icon: <ShieldAlert size={13} className="text-red-400" />, label: 'Generar Token Drive', warning: '⚠️ LEER AVISO', action: onShowTokenHelp },
                  ].map((item, i) => (
                    <a key={i}
                      href={item.href}
                      target={item.href === '#' ? undefined : '_blank'}
                      rel={item.href === '#' ? undefined : 'noopener noreferrer'}
                      onClick={(e) => { if (item.action) { e.preventDefault(); setIsSettingsOpen(false); item.action(); } }}
                      className="flex items-center gap-2.5 px-3 py-2 text-[11.5px] text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                    >
                      <span className="text-slate-500 shrink-0">{item.icon}</span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.warning && <span className="text-[9px] text-red-400 font-bold shrink-0">{item.warning}</span>}
                    </a>
                  ))}
                  <div className="h-px bg-slate-700 mx-3 my-1" />
                  {[
                    { href: 'https://github.com/nicolasandreola-stack/app-gestion-proyectos/tree/main', icon: <Github size={13} />, label: 'GitHub Repo' },
                    { href: 'https://vercel.com/nicolas-projects-21bdaad2/app-gestion-proyectos/ANTBf1mPoxYf7rFindzf7h7M1aZY', icon: <Server size={13} />, label: 'Vercel Project' },
                    { href: 'https://docs.google.com/document/d/1lnlpmdTaTUIAWvMMGN_KX-PI4KvyOwz2xzkKJ2HR0MQ/edit?tab=t.0', icon: <FileText size={13} />, label: 'Bitácora Proyecto' },
                  ].map((item, i) => (
                    <a key={i}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 text-[11.5px] text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                    >
                      <span className="text-slate-500 shrink-0">{item.icon}</span>
                      <span className="flex-1 truncate">{item.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          title="Cerrar Sesión"
          className={`flex items-center gap-2.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors ${
            isCollapsed ? 'p-2.5' : 'px-3 py-2 w-full'
          }`}
        >
          <LogOut size={15} className="shrink-0" />
          {!isCollapsed && <span className="text-[12px] font-medium">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
