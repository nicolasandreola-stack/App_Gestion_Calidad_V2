import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle, ExternalLink, Maximize2, Minimize2, RefreshCw,
  Table, FileSpreadsheet, Loader2, ChevronRight, BarChart3,
  AlertCircle, ArrowUpRight, Plus, Settings2, X, Check, Pencil
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────
interface DashboardTab {
  id: string;
  label: string;
  embedUrl: string;    // URL con /embed/ para iframe
  externalUrl: string; // URL para "abrir en nueva pestaña"
}

interface QuickLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

// ─── Configuración de Dashboards (editable desde la UI) ──────────────────
const STORAGE_KEY = 'v25_desvios_dashboards';

const DEFAULT_DASHBOARDS: DashboardTab[] = [
  {
    id: 'panel-general',
    label: 'Panel General',
    embedUrl: 'https://datastudio.google.com/embed/reporting/072e72ce-4622-4813-b7c2-e9d5ee2bb2bd/page/p_m902vjldwd',
    externalUrl: 'https://datastudio.google.com/reporting/072e72ce-4622-4813-b7c2-e9d5ee2bb2bd/page/p_m902vjldwd',
  },
];

// ─── Links rápidos a planillas ───────────────────────────────────────────
const QUICK_LINKS: QuickLink[] = [
  {
    label: 'Incidentes Operativos',
    href: 'https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=0#gid=0',
    icon: <Table size={14} />,
    color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100',
  },
  {
    label: 'Desvíos Forms',
    href: 'https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=347181817#gid=347181817',
    icon: <FileSpreadsheet size={14} />,
    color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100',
  },
  {
    label: 'OM Forms',
    href: 'https://docs.google.com/spreadsheets/d/1ZiXnwneacTfx2oomicru8Qef13-B_YpEaQgQcjbbuG8/edit?gid=265138253#gid=265138253',
    icon: <FileSpreadsheet size={14} />,
    color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
];

// ─── Componente Principal ────────────────────────────────────────────────
const DesviosDashboard: React.FC = () => {
  // Dashboards persistidos en localStorage
  const [dashboards, setDashboards] = useState<DashboardTab[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_DASHBOARDS;
  });

  const [activeTabId, setActiveTabId] = useState<string>(dashboards[0]?.id || '');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Config form
  const [editingDashboard, setEditingDashboard] = useState<DashboardTab | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formEmbedUrl, setFormEmbedUrl] = useState('');
  const [formExternalUrl, setFormExternalUrl] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTab = dashboards.find(d => d.id === activeTabId) || dashboards[0];

  // Persistir dashboards
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));
  }, [dashboards]);

  // Reset loading al cambiar de tab
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [activeTabId]);

  // Timeout para detectar error de carga
  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => {
      if (isLoading) {
        // Si después de 30s sigue "cargando", mostramos un aviso suave
        // (no error duro porque los iframes de Looker tardan)
      }
    }, 30000);
    return () => clearTimeout(timeout);
  }, [isLoading, activeTabId]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    if (iframeRef.current) {
      iframeRef.current.src = activeTab.embedUrl;
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Escuchar cambios de fullscreen (ej: Esc)
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ─── Config Handlers ────────────────────────────────────────────
  const openAddForm = () => {
    setEditingDashboard(null);
    setFormLabel('');
    setFormEmbedUrl('');
    setFormExternalUrl('');
  };

  const openEditForm = (d: DashboardTab) => {
    setEditingDashboard(d);
    setFormLabel(d.label);
    setFormEmbedUrl(d.embedUrl);
    setFormExternalUrl(d.externalUrl);
  };

  const saveForm = () => {
    if (!formLabel.trim() || !formEmbedUrl.trim()) return;

    // Asegurar que la URL usa /embed/
    let embedUrl = formEmbedUrl.trim();
    if (embedUrl.includes('/reporting/') && !embedUrl.includes('/embed/')) {
      embedUrl = embedUrl.replace('/reporting/', '/embed/reporting/');
    }

    const externalUrl = formExternalUrl.trim() || embedUrl.replace('/embed/', '/');

    if (editingDashboard) {
      // Editar existente
      setDashboards(prev => prev.map(d =>
        d.id === editingDashboard.id
          ? { ...d, label: formLabel.trim(), embedUrl, externalUrl }
          : d
      ));
    } else {
      // Nuevo
      const newTab: DashboardTab = {
        id: 'tab-' + Date.now(),
        label: formLabel.trim(),
        embedUrl,
        externalUrl,
      };
      setDashboards(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }

    setEditingDashboard(null);
    setFormLabel('');
    setFormEmbedUrl('');
    setFormExternalUrl('');
  };

  const deleteTab = (id: string) => {
    if (dashboards.length <= 1) return;
    setDashboards(prev => prev.filter(d => d.id !== id));
    if (activeTabId === id) setActiveTabId(dashboards[0]?.id || '');
  };

  // ─── Fecha actual ──────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-bgBody overflow-hidden">

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-borderLight px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-200/50">
            <AlertTriangle size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-textPrimary leading-tight">
              Desvíos y Oportunidades de Mejora
            </h1>
            <p className="text-[11px] text-textSecondary leading-tight">{capitalizedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Links */}
          {QUICK_LINKS.map((link, i) => (
            <a
              key={i}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${link.color}`}
            >
              {link.icon}
              <span>{link.label}</span>
              <ArrowUpRight size={10} className="opacity-50" />
            </a>
          ))}

          {/* Config button */}
          <button
            onClick={() => { setShowConfig(!showConfig); openAddForm(); }}
            className={`p-2 rounded-lg transition-colors ${showConfig ? 'bg-blue-50 text-accentBlue' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Configurar dashboards"
          >
            <Settings2 size={16} />
          </button>
        </div>
      </header>

      {/* ── CONFIG PANEL (collapsible) ── */}
      {showConfig && (
        <div className="bg-white border-b border-borderLight px-6 py-4 animate-in slide-in-from-top-1 duration-200">
          <div className="max-w-3xl">
            <h3 className="text-sm font-bold text-textPrimary mb-3 flex items-center gap-2">
              <Settings2 size={14} className="text-accentBlue" />
              Configurar Dashboards Embebidos
            </h3>

            {/* Lista de dashboards actuales */}
            <div className="space-y-2 mb-4">
              {dashboards.map(d => (
                <div key={d.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 group">
                  <BarChart3 size={14} className="text-gray-400 shrink-0" />
                  <span className="text-xs font-medium text-textPrimary flex-1 truncate">{d.label}</span>
                  <span className="text-[10px] text-gray-400 truncate max-w-[200px] hidden md:block">{d.embedUrl}</span>
                  <button
                    onClick={() => openEditForm(d)}
                    className="p-1 text-gray-400 hover:text-accentBlue rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Editar"
                  >
                    <Pencil size={12} />
                  </button>
                  {dashboards.length > 1 && (
                    <button
                      onClick={() => deleteTab(d.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Formulario agregar/editar */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">
                {editingDashboard ? `Editando: ${editingDashboard.label}` : 'Agregar nuevo dashboard'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  value={formLabel}
                  onChange={e => setFormLabel(e.target.value)}
                  placeholder="Nombre del dashboard"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-accentBlue"
                />
                <input
                  value={formEmbedUrl}
                  onChange={e => setFormEmbedUrl(e.target.value)}
                  placeholder="URL de embed (con /embed/ o se autocorrige)"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-accentBlue"
                />
                <div className="flex gap-2">
                  <input
                    value={formExternalUrl}
                    onChange={e => setFormExternalUrl(e.target.value)}
                    placeholder="URL externa (opcional)"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-accentBlue"
                  />
                  <button
                    onClick={saveForm}
                    disabled={!formLabel.trim() || !formEmbedUrl.trim()}
                    className="px-3 py-2 bg-accentBlue text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Check size={12} />
                    {editingDashboard ? 'Guardar' : 'Agregar'}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                💡 Pega la URL del reporte de Looker Studio. Si no tiene <code className="bg-white px-1 rounded text-blue-600">/embed/</code> en la URL, se autocorrige automáticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TABS BAR ── */}
      {dashboards.length > 1 && (
        <div className="bg-white border-b border-borderLight px-6 flex items-center gap-1 shrink-0">
          {dashboards.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`relative px-4 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-accentBlue'
                    : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accentBlue rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── IFRAME CONTAINER ── */}
      <div className="flex-1 relative min-h-0">

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <Loader2 size={24} className="text-amber-600 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-textPrimary">Cargando dashboard...</p>
              <p className="text-[11px] text-textSecondary mt-0.5">
                Conectando con Looker Studio
              </p>
            </div>
          </div>
        )}

        {/* Error fallback */}
        {hasError && !isLoading && (
          <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <div className="text-center max-w-sm">
              <p className="text-sm font-bold text-textPrimary mb-1">Error al cargar el dashboard</p>
              <p className="text-[11px] text-textSecondary leading-relaxed">
                Verificá que el reporte tenga habilitada la inserción (embed) en Looker Studio
                y que tengas acceso al mismo.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-accentBlue text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={14} /> Reintentar
              </button>
              <a
                href={activeTab.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-textPrimary rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
              >
                <ExternalLink size={14} /> Abrir en Looker Studio
              </a>
            </div>
          </div>
        )}

        {/* Floating action bar */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-1.5 py-1 shadow-sm">
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-400 hover:text-accentBlue rounded transition-colors"
            title="Recargar dashboard"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-gray-400 hover:text-accentBlue rounded transition-colors"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <a
            href={activeTab.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-accentBlue rounded transition-colors"
            title="Abrir en Looker Studio"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* The iframe */}
        {activeTab && (
          <iframe
            ref={iframeRef}
            key={activeTabId}
            src={activeTab.embedUrl}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className="w-full h-full border-0"
            style={{ minHeight: '400px' }}
            allowFullScreen
            sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
          />
        )}
      </div>

      {/* ── MOBILE QUICK LINKS (visible solo en mobile) ── */}
      <div className="lg:hidden border-t border-borderLight bg-white px-4 py-2 flex gap-2 overflow-x-auto shrink-0">
        {QUICK_LINKS.map((link, i) => (
          <a
            key={i}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border whitespace-nowrap transition-all ${link.color}`}
          >
            {link.icon}
            <span>{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default DesviosDashboard;
