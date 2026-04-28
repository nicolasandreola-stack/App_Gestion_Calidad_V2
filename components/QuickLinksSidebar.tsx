import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Calendar, Folder, FolderOpen, FileText, Table, FileSpreadsheet,
  BarChart3, Bot, ExternalLink, X, ChevronLeft, ChevronRight,
  LayoutGrid, Globe
} from 'lucide-react';

interface QuickLinksSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAssistant: () => void;
}

interface LinkGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  links: { label: string; href: string; icon: React.ReactNode; action?: () => void }[];
}

const QuickLinksSidebar: React.FC<QuickLinksSidebarProps> = ({ isOpen, onClose, onOpenAssistant }) => {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Click fuera cierra
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // pequeño delay para no dispararse en el mismo click que abre
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [isOpen, onClose]);

  const groups: LinkGroup[] = [
    {
      id: 'google',
      label: 'Google',
      icon: <Globe size={15} />,
      color: 'text-blue-500',
      links: [
        { label: 'Gmail', href: 'https://mail.google.com/mail/u/0/?tab=rm&ogbl#inbox', icon: <Mail size={14} className="text-red-500" /> },
        { label: 'Calendar', href: 'https://calendar.google.com/calendar/', icon: <Calendar size={14} className="text-blue-500" /> },
      ],
    },
    {
      id: 'drive',
      label: 'Drive',
      icon: <Folder size={15} />,
      color: 'text-yellow-500',
      links: [
        { label: 'Mi Unidad', href: 'https://drive.google.com', icon: <Folder size={14} /> },
        { label: 'Unidad Compartida', href: 'https://drive.google.com/drive/u/0/folders/0AOfY-G1iWo0sUk9PVA', icon: <FolderOpen size={14} /> },
        { label: 'SGI Editable', href: 'https://drive.google.com/drive/u/0/folders/1CotTzY1cnyunmSyc_EuFx5EtbVD84Cl7', icon: <FileText size={14} /> },
        { label: 'Proyecto OEA', href: 'https://drive.google.com/drive/u/0/folders/15ak2dn13Q8sU-0mdw29QL3dHlbJEJnZU', icon: <Folder size={14} /> },
      ],
    },
    {
      id: 'planillas',
      label: 'Planillas',
      icon: <FileSpreadsheet size={15} />,
      color: 'text-emerald-500',
      links: [
        { label: 'Incidentes Operativos', href: 'https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=0#gid=0', icon: <Table size={14} /> },
        { label: 'Desvíos Forms', href: 'https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=347181817#gid=347181817', icon: <Table size={14} /> },
        { label: 'OM Forms', href: 'https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=265138253#gid=265138253', icon: <Table size={14} /> },
      ],
    },
    {
      id: 'kpis',
      label: 'KPIs',
      icon: <BarChart3 size={15} />,
      color: 'text-violet-500',
      links: [
        { label: 'Dashboard General', href: 'https://lookerstudio.google.com/u/0/reporting/072e72ce-4622-4813-b7c2-e9d5ee2bb2bd/page/p_pct0u764zd', icon: <BarChart3 size={14} /> },
        { label: 'Panel de seguimiento', href: 'https://lookerstudio.google.com/u/0/reporting/c634ad6a-c311-4989-bfea-983eb6ed8b36/page/p_m452s0ue0d', icon: <Table size={14} /> },
      ],
    },
    {
      id: 'ia',
      label: 'Herramientas IA',
      icon: <Bot size={15} />,
      color: 'text-sky-500',
      links: [
        { label: 'Asistente Desvíos', href: '#', icon: <Bot size={14} />, action: onOpenAssistant },
        { label: 'ChatGPT', href: 'https://chatgpt.com', icon: <ExternalLink size={14} /> },
        { label: 'Gemini', href: 'https://gemini.google.com', icon: <ExternalLink size={14} /> },
        { label: 'Google AI Studio', href: 'https://aistudio.google.com/', icon: <ExternalLink size={14} /> },
        { label: 'Notebook LM', href: 'https://notebooklm.google.com/', icon: <ExternalLink size={14} /> },
        { label: 'Make', href: 'https://make.com', icon: <ExternalLink size={14} /> },
      ],
    },
  ];

  return (
    <>
      {/* Overlay semitransparente */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar panel */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full z-50 w-72 bg-white border-r border-gray-200 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header del sidebar */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-slate-800 text-white shrink-0">
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-slate-300" />
            <span className="text-sm font-bold tracking-wide">Accesos Rápidos</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Cerrar panel"
          >
            <X size={15} />
          </button>
        </div>

        {/* Grupos de links */}
        <div className="flex-1 overflow-y-auto py-2">
          {groups.map((group) => {
            const isExpanded = openGroup === group.id;
            return (
              <div key={group.id} className="mb-0.5">
                {/* Grupo header */}
                <button
                  onClick={() => setOpenGroup(isExpanded ? null : group.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors group"
                >
                  <span className={`shrink-0 ${group.color}`}>{group.icon}</span>
                  <span className="flex-1 text-[13px] font-semibold text-slate-700 group-hover:text-slate-900">
                    {group.label}
                  </span>
                  <ChevronRight
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                {/* Links del grupo */}
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    isExpanded ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="pl-4 pr-2 pb-1">
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
                            onClose();
                          }
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-[12.5px] text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors group/link"
                      >
                        <span className="text-slate-400 group-hover/link:text-slate-600 transition-colors shrink-0">
                          {link.icon}
                        </span>
                        <span className="flex-1 leading-tight">{link.label}</span>
                        <ExternalLink size={10} className="text-slate-300 group-hover/link:text-slate-500 transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Separador */}
                <div className="h-px bg-slate-100 mx-4" />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-slate-50 shrink-0">
          <p className="text-[10px] text-slate-400 text-center">Presioná ESC para cerrar</p>
        </div>
      </div>
    </>
  );
};

export default QuickLinksSidebar;
