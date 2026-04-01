import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Link as LinkIcon, User, AlertCircle, FileText, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { GlobalCloudData, BackupData, Task, CATEGORY_COLORS, COMPLEXITY_LABELS } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  currentUser: string;
}

interface SearchResult {
  task: Task;
  user: string;
  type: 'Activa' | 'Completada' | 'Eliminada';
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, isAdmin, currentUser }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [globalData, setGlobalData] = useState<GlobalCloudData | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch data on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setResults([]);
      
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const res = await fetch('/api/sync/get');
          if (!res.ok) throw new Error('Error de red');
          const data: GlobalCloudData = await res.json();
          setGlobalData(data);
        } catch (error) {
          console.error("Error fetching data for search:", error);
          toast.error("No se pudo conectar con la base de datos.");
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchData();
      
      // Focus timeout to ensure the element is rendered and not blocked by transition
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Handle Keyboard Navigation inside Modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      // Vertical Nav
      if (results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          // To do: Quick action when pressing enter on a task.
          toast.info("Función de enlace rápido en desarrollo.");
          onClose(); // Optional
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results.length, onClose]);

  // Execute Search
  useEffect(() => {
    if (!globalData || !query.trim()) {
      setResults([]);
      return;
    }

    const searchTerm = query.toLowerCase();
    const foundResults: SearchResult[] = [];

    // Iterar sobre los usuarios en el JSON
    Object.entries(globalData.users).forEach(([username, dbValue]) => {
      const db = dbValue as BackupData;
      // Filtrar por privilegio: Si no es admin, solo busca en su propio usuario
      if (!isAdmin && username.toLowerCase() !== currentUser.toLowerCase()) {
        return;
      }

      const matchTask = (t: Task) => {
        return (
          t.text.toLowerCase().includes(searchTerm) ||
          (t.note && t.note.toLowerCase().includes(searchTerm)) ||
          (t.del && t.del.toLowerCase().includes(searchTerm))
        );
      };

      // Tareas Activas
      db.tks?.forEach(t => {
        if (matchTask(t)) foundResults.push({ task: t, user: username, type: 'Activa' });
      });

      // Tareas Completadas
      db.cTks?.forEach(t => {
        if (matchTask(t)) foundResults.push({ task: t, user: username, type: 'Completada' });
      });

      // Tareas Eliminadas
      db.dTks?.forEach(t => {
        if (matchTask(t)) foundResults.push({ task: t, user: username, type: 'Eliminada' });
      });
    });

    // Ordenar resultados priorizando las que sean Match exacto en el título
    foundResults.sort((a, b) => {
      const aTitle = a.task.text.toLowerCase().includes(searchTerm) ? 1 : 0;
      const bTitle = b.task.text.toLowerCase().includes(searchTerm) ? 1 : 0;
      if (aTitle !== bTitle) return bTitle - aTitle;
      return b.task.id - a.task.id;
    });

    setResults(foundResults.slice(0, 50)); // Limite generoso para UI
    setSelectedIndex(0);

  }, [query, globalData, isAdmin, currentUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] p-4 sm:p-6 md:p-12 backdrop-blur-sm bg-slate-900/50 flex align-start justify-center animate-in fade-in duration-200" onClick={onClose}>
      
      {/* Modal Container */}
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col mt-[8vh] max-h-[75vh] animate-in zoom-in-[0.98] slide-in-from-top-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header / Input Area */}
        <div className="relative flex items-center px-4 border-b border-gray-100 bg-white">
          <Search size={22} className="text-blue-500 shrink-0 mx-2" />
          <input
            ref={searchInputRef}
            type="text"
            className="w-full h-16 bg-transparent border-none outline-none px-2 text-lg text-gray-800 placeholder-gray-400 focus:ring-0 font-medium"
            placeholder={isAdmin ? "Buscar tareas en toda la base (Admin)..." : "Buscar tareas..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && <Loader2 size={18} className="text-gray-400 animate-spin shrink-0 absolute right-16" />}
          {!isLoading && query && (
             <button onClick={() => { setQuery(''); searchInputRef.current?.focus(); }} className="p-1.5 mr-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100/80 shrink-0 transition-colors">
               <X size={16} />
             </button>
          )}
          <span className="text-[10px] hidden md:inline-block uppercase font-bold text-gray-400 border border-gray-200 bg-gray-50 rounded px-1.5 py-0.5 shrink-0 select-none ml-2 mr-2">
            ESC
          </span>
        </div>

        {/* Results Area */}
        {query && results.length > 0 && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-[#F8F9FA]">
            {results.map((r, i) => {
              const isSelected = i === selectedIndex;
              return (
                <div 
                  key={`${r.user}_${r.task.id}_${r.type}`}
                  className={`flex flex-col p-3.5 rounded-xl mb-1.5 transition-all cursor-pointer border ${isSelected ? 'bg-white border-blue-400 shadow-sm ml-1' : 'border-transparent hover:bg-white hover:border-gray-200'}`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => {
                     toast.info("Enlace rápido en desarrollo.");
                     onClose();
                  }}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className={`text-[13px] font-bold truncate flex-1 pr-2 ${r.type !== 'Activa' ? 'text-gray-400 line-through opacity-80' : 'text-gray-800'}`}>
                      {r.task.text}
                    </h4>
                    
                    <div className="flex flex-col md:flex-row items-end md:items-center gap-1.5 shrink-0">
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-widest ${
                        r.type === 'Activa' ? 'bg-blue-100 text-blue-700' : 
                        r.type === 'Completada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {r.type}
                      </span>
                      {isAdmin && (
                        <span className="text-[10px] bg-slate-200/70 text-slate-700 border border-slate-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 shadow-sm">
                          <User size={10} className="opacity-70" /> {r.user}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.task.prio && (
                      <span className="text-[10px] flex items-center gap-1 text-orange-700 bg-orange-50 px-1 rounded border border-orange-100 font-bold">
                        <AlertCircle size={10} /> Crítica
                      </span>
                    )}
                    {r.task.cat && r.task.cat !== 'Otro' && (
                      <span className="text-[9px] text-gray-500 font-bold px-1.5 py-0.5 rounded border border-gray-200 bg-white">
                        {r.task.cat}
                      </span>
                    )}
                    {r.task.del && (
                        <span className="text-[10px] text-purple-700 font-medium bg-purple-50 px-1 rounded">
                            Delegada a {r.task.del}
                        </span>
                    )}
                    
                    {/* Note Preview */}
                    {r.task.note && (
                      <div className="flex items-center gap-1 text-gray-400 ml-1">
                        <FileText size={10} />
                        <span className="text-[10px] italic truncate max-w-[150px] md:max-w-[300px]" title={r.task.note}>
                          {r.task.note}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {query && results.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-70 bg-[#F8F9FA] flex-1">
            <Search size={36} className="mb-4 text-slate-300" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-slate-500">No se encontraron tareas</p>
            <p className="text-[11px] mt-1.5">Intenta con otras palabras o el nombre de un delegado.</p>
          </div>
        )}

        {/* Initial / Default State */}
        {!query && !isLoading && (
          <div className="hidden md:flex flex-col items-center justify-center py-20 text-gray-300 opacity-80 bg-[#F8F9FA] flex-1 border-t border-dashed border-gray-200">
            <div className="flex gap-2">
               <span className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center text-xs font-bold w-10 text-gray-400">Ctrl</span>
               <span className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center text-xs font-bold w-10 text-gray-400">K</span>
            </div>
            <p className="text-[12px] font-medium text-center mt-5 text-gray-400">
              Escribe el nombre de la tarea, notas<br/>o busca por miembro del equipo.
            </p>
          </div>
        )}
        
        {/* Mobile Default */}
        {!query && !isLoading && (
           <div className="md:hidden py-10 bg-[#F8F9FA] flex-1 border-t border-gray-100">
              <p className="text-xs text-center text-gray-400 italic">Escribe para iniciar la búsqueda</p>
           </div>
        )}
        
        {/* Quick Nav Footer */}
        {query && results.length > 0 && (
           <div className="hidden md:flex items-center justify-between px-4 py-2 bg-white border-t border-gray-100 shrink-0">
               <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                  <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200 font-sans">↑</kbd><kbd className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200 font-sans">↓</kbd> Navegar</span>
                  <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200 font-sans">↵</kbd> Ver detalle</span>
               </div>
               <span className="text-[10px] font-bold text-gray-300">{results.length} resultados</span>
           </div>
        )}

      </div>
    </div>
  );
};

export default GlobalSearchModal;
