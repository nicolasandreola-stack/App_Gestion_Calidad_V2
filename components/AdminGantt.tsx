import React, { useState, useMemo } from 'react';
import { ProjectTask, ProjectSubtask } from '../types';
import { Plus, Edit2, CheckCircle2, Circle, ChevronDown, ChevronRight, X, ExternalLink, Calendar, Info, Clock, CheckSquare, AlignLeft, Layers } from 'lucide-react';

interface AdminGanttProps {
  projects: ProjectTask[];
  onUpdateProject: (p: ProjectTask) => void;
  onAddProject: (p: ProjectTask) => void;
  onDeleteProject: (id: string) => void;
}

// Helpers for dates (DD/MM/YYYY)
const parseDate = (dStr: string) => {
  if (!dStr) return new Date();
  const parts = dStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return new Date();
};

const formatDate = (d: Date) => {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const dayDiff = (start: Date, end: Date) => {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

export default function AdminGantt({ projects, onUpdateProject, onAddProject, onDeleteProject }: AdminGanttProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  
  // Modal for editing task
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);

  // Grouping
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, ProjectTask[]>>();
    let minD = new Date(); minD.setFullYear(minD.getFullYear() + 5);
    let maxD = new Date(2000, 0, 1);

    projects.forEach(p => {
      const start = parseDate(p.startDate);
      const end = parseDate(p.endDate);
      if (start < minD) minD = start;
      if (end > maxD) maxD = end;

      if (!map.has(p.project)) map.set(p.project, new Map());
      const pMap = map.get(p.project)!;
      if (!pMap.has(p.phase)) pMap.set(p.phase, []);
      pMap.get(p.phase)!.push(p);
    });

    // Add buffer
    minD.setDate(minD.getDate() - 7);
    maxD.setDate(maxD.getDate() + 14);
    
    if (dayDiff(minD, maxD) < 30) {
      maxD.setDate(minD.getDate() + 30);
    }

    const totalDays = dayDiff(minD, maxD);
    const daysArr = Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(minD);
      d.setDate(minD.getDate() + i);
      return d;
    });

    // Months mapping
    const months = [];
    let currentMonth = daysArr[0].getMonth();
    let currentCount = 0;
    for (let i = 0; i < daysArr.length; i++) {
      if (daysArr[i].getMonth() !== currentMonth) {
        months.push({ month: currentMonth, year: daysArr[i-1].getFullYear(), count: currentCount });
        currentMonth = daysArr[i].getMonth();
        currentCount = 1;
      } else {
        currentCount++;
      }
    }
    months.push({ month: currentMonth, year: daysArr[daysArr.length - 1].getFullYear(), count: currentCount });

    return { map, minD, maxD, totalDays, daysArr, months };
  }, [projects]);

  const toggleProject = (p: string) => {
    const next = new Set(expandedProjects);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setExpandedProjects(next);
  };

  const togglePhase = (ph: string) => {
    const next = new Set(expandedPhases);
    if (next.has(ph)) next.delete(ph);
    else next.add(ph);
    setExpandedPhases(next);
  };

  const today = new Date();

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header Info */}
      <div className="p-5 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers className="text-blue-600" /> Diagrama de Gantt Global
          </h2>
          <p className="text-xs text-slate-500 mt-1">Gestión avanzada de Proyectos, Fases y Líneas de Tiempo.</p>
        </div>
        <button 
          onClick={() => setEditTask({
            id: 'PROJ-' + Date.now(), project: 'Nuevo Proyecto', phase: 'FASE A', name: 'Nueva Tarea', 
            startDate: formatDate(new Date()), endDate: formatDate(new Date(new Date().setDate(new Date().getDate() + 5))),
            assignee: 'Admin', progress: 0, status: 'PENDIENTE', subtasks: [], details: ''
          })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={16} /> Nueva Tarea de Proyecto
        </button>
      </div>

      {/* GANTT CONTAINER */}
      <div className="flex-1 overflow-auto flex relative bg-white m-4 rounded-xl shadow-sm border border-gray-200">
        
        {/* LEFT PANEL - Data List */}
        <div className="w-[380px] shrink-0 border-r border-gray-200 bg-white z-10 sticky left-0 flex flex-col">
          <div className="h-16 border-b border-gray-200 bg-slate-50/80 backdrop-blur shrink-0 grid grid-cols-[1fr_50px_70px] items-end pb-2 px-4 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)]">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estructura / Tarea</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase text-center">%</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase text-center">Estado</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
            {Array.from(grouped.map.entries()).map(([projName, phases]) => (
              <div key={projName} className="mb-0">
                <div 
                  className="bg-slate-800 text-white px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-slate-700 select-none sticky top-0 z-20 group"
                  onClick={() => toggleProject(projName)}
                >
                  {expandedProjects.has(projName) ? <ChevronRight size={14} className="text-slate-400 group-hover:text-white" /> : <ChevronDown size={14} className="text-white" />}
                  <span className="font-bold text-xs uppercase tracking-wider">{projName}</span>
                </div>

                {!expandedProjects.has(projName) && Array.from(phases.entries()).map(([phaseName, tasks]) => (
                  <div key={phaseName}>
                    <div 
                      className="bg-slate-100 border-y border-slate-200 px-4 py-2 pl-8 flex items-center gap-2 cursor-pointer hover:bg-slate-200 select-none"
                      onClick={() => togglePhase(projName + phaseName)}
                    >
                      {expandedPhases.has(projName + phaseName) ? <ChevronRight size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-700" />}
                      <span className="font-bold text-xs text-slate-700">{phaseName}</span>
                      <span className="text-[10px] text-slate-400 font-medium ml-auto">{tasks.length} tareas</span>
                    </div>

                    {!expandedPhases.has(projName + phaseName) && tasks.map(t => (
                      <div 
                        key={t.id} 
                        className="group grid grid-cols-[1fr_50px_70px] items-center px-4 py-3 border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer h-12 transition-colors"
                        onClick={() => setEditTask(t)}
                      >
                        <div className="pl-8 truncate">
                          <span className="text-xs text-slate-700 font-medium truncate block group-hover:text-blue-700 transition-colors">{t.name}</span>
                          {t.subtasks && t.subtasks.length > 0 && (
                            <span className="text-[9px] text-slate-400">{t.subtasks.filter(s=>s.completed).length}/{t.subtasks.length} subs</span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-slate-600 text-center">{t.progress}%</div>
                        <div className="text-center">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${t.status === 'CERRADO' ? 'bg-emerald-100 text-emerald-700' : t.status === 'EN PROGRESO' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{t.status || 'PENDIENTE'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL - Timeline Grid */}
        <div className="flex-1 overflow-x-auto custom-scrollbar flex flex-col bg-slate-50 relative hide-horizontal-scrollbar">
          {/* Header Months/Days */}
          <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur border-b border-gray-200">
            {/* Months */}
            <div className="flex border-b border-gray-200 h-8">
              {grouped.months.map((m, i) => {
                const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                return (
                  <div key={i} className="shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600 border-r border-gray-200 uppercase tracking-widest bg-slate-100/50" style={{ width: m.count * 30 }}>
                    {monthNames[m.month]} {m.year}
                  </div>
                )
              })}
            </div>
            {/* Days */}
            <div className="flex h-8">
              {grouped.daysArr.map((d, i) => {
                const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div key={i} className={`shrink-0 w-[30px] border-r border-gray-200 flex flex-col items-center justify-center ${isToday ? 'bg-blue-100 text-blue-700 font-bold' : isWeekend ? 'bg-slate-100/50 text-slate-400' : 'text-slate-500'}`}>
                    <span className="text-[10px] leading-tight mt-0.5">{d.getDate()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Content */}
          <div className="relative flex-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMTAwJSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bGluZSB4MT0iMzAiIHkxPSIwIiB4Mj0iMzAiIHkyPSIxMDAlIiBzdHJva2U9IiNlMmU4ZjAiIHN0cm9rZS1kYXNoYXJyYXk9IjIgMiIgLz48L3N2Zz4=')] pb-10">
            {/* Today Line */}
            <div 
              className="absolute top-0 bottom-0 border-l-2 border-red-400/50 z-0 pointer-events-none" 
              style={{ left: dayDiff(grouped.minD, today) * 30 + 15, display: dayDiff(grouped.minD, today) >= 0 && dayDiff(grouped.minD, today) <= grouped.totalDays ? 'block' : 'none' }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-red-400"></div>
            </div>

            {Array.from(grouped.map.entries()).map(([projName, phases]) => (
              <div key={projName + '_grid'}>
                {/* Project Header Row (Empty in timeline) */}
                <div className="h-[44px] w-full border-b border-transparent"></div>

                {!expandedProjects.has(projName) && Array.from(phases.entries()).map(([phaseName, tasks]) => (
                  <div key={phaseName + '_grid'}>
                     {/* Phase Header Row */}
                    <div className="h-[37px] w-full border-b border-transparent bg-slate-50/30 line-through-pattern"></div>

                    {!expandedPhases.has(projName + phaseName) && tasks.map(t => {
                       const sDate = parseDate(t.startDate);
                       const eDate = parseDate(t.endDate);
                       const leftOffset = dayDiff(grouped.minD, sDate) * 30;
                       const duration = Math.max(1, dayDiff(sDate, eDate)) * 30;

                       return (
                        <div key={t.id + '_grid'} className="h-12 border-b border-slate-100 flex items-center relative group/row hover:bg-blue-50/20 transition-colors">
                          <div 
                            className={`absolute h-6 rounded-md shadow-sm border overflow-hidden cursor-pointer flex items-center transition-all hover:-translate-y-0.5 hover:shadow-md ${t.status === 'CERRADO' ? 'bg-emerald-500 border-emerald-600' : t.status === 'EN PROGRESO' ? 'bg-blue-500 border-blue-600' : 'bg-slate-400 border-slate-500'}`}
                            style={{ left: leftOffset, width: duration }}
                            onClick={() => setEditTask(t)}
                            title={`${t.name} (${t.progress}%)`}
                          >
                             {/* Progress Fill */}
                             <div className="absolute top-0 bottom-0 left-0 bg-black/20" style={{ width: `${t.progress}%` }}></div>
                             <span className="relative z-10 text-[9px] font-bold text-white px-2 truncate leading-none pt-0.5 pointer-events-none">{t.name}</span>
                          </div>
                        </div>
                       );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editTask && (
        <TaskEditModal 
           task={editTask} 
           onClose={() => setEditTask(null)} 
           onSave={(updated) => {
             const existing = projects.find(p => p.id === updated.id);
             if (existing) onUpdateProject(updated);
             else onAddProject(updated);
             setEditTask(null);
           }}
           onDelete={(id) => {
             onDeleteProject(id);
             setEditTask(null);
           }}
        />
      )}
    </div>
  );
}

// ------ MODAL COMPONENT (Internal) ------
function TaskEditModal({ task, onClose, onSave, onDelete }: { task: ProjectTask, onClose: () => void, onSave: (t: ProjectTask) => void, onDelete: (id: string) => void }) {
  const [edited, setEdited] = useState<ProjectTask>(JSON.parse(JSON.stringify(task))); // Deep copy
  const [newSubtask, setNewSubtask] = useState("");

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const st: ProjectSubtask = { id: 'ST-' + Date.now(), text: newSubtask, completed: false, link: '', observation: '' };
    setEdited({ ...edited, subtasks: [...(edited.subtasks || []), st] });
    setNewSubtask("");
  };

  const updateSubtask = (stId: string, updates: Partial<ProjectSubtask>) => {
    setEdited({
      ...edited,
      subtasks: edited.subtasks?.map(s => s.id === stId ? { ...s, ...updates } : s)
    });
  };

  const removeSubtask = (stId: string) => {
    setEdited({
      ...edited,
      subtasks: edited.subtasks?.filter(s => s.id !== stId)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Edit2 size={18} className="text-blue-600" /> Editar Tarea de Proyecto
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar grid grid-cols-1 md:grid-cols-[1fr_400px] gap-8">
          
          {/* Main Info */}
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Proyecto</label>
                <input type="text" value={edited.project} onChange={e => setEdited({...edited, project: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Ej: Certificación OEA" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Fase / Etapa</label>
                <input type="text" value={edited.phase} onChange={e => setEdited({...edited, phase: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Ej: FASE A" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Nombre de la Tarea</label>
              <input type="text" value={edited.name} onChange={e => setEdited({...edited, name: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block flex items-center gap-1"><Calendar size={12}/> Fecha Inicio</label>
                <input type="text" value={edited.startDate} onChange={e => setEdited({...edited, startDate: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="DD/MM/YYYY" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block flex items-center gap-1"><Calendar size={12}/> Fecha Fin</label>
                <input type="text" value={edited.endDate} onChange={e => setEdited({...edited, endDate: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="DD/MM/YYYY" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Estado</label>
                <select value={edited.status} onChange={e => setEdited({...edited, status: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 outline-none">
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN PROGRESO">En Progreso</option>
                  <option value="CERRADO">Cerrado</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">% Avance</label>
                <input type="number" min="0" max="100" value={edited.progress} onChange={e => setEdited({...edited, progress: parseInt(e.target.value) || 0})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 font-bold text-center outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Asignado a</label>
                <input type="text" value={edited.assignee} onChange={e => setEdited({...edited, assignee: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block flex items-center gap-1"><AlignLeft size={12} /> Detalle / Observaciones de Tarea</label>
              <textarea value={edited.details || ''} onChange={e => setEdited({...edited, details: e.target.value})} className="w-full p-3 text-sm rounded-lg border border-gray-300 min-h-[100px] resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Observaciones generales o instrucciones para la tarea principal..." />
            </div>
          </div>

          {/* Subtasks (Column J, K, L abstract) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><CheckSquare size={16} className="text-blue-600"/> Subtareas y Documentos</h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {(!edited.subtasks || edited.subtasks.length === 0) && (
                 <div className="text-center py-10 text-slate-400">
                    <Info size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No hay subtareas. Añade una para gestionar avances y links a Drive.</p>
                 </div>
              )}
              {edited.subtasks?.map(st => (
                <div key={st.id} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm relative group">
                  <button onClick={() => removeSubtask(st.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                  
                  <div className="flex items-start gap-2 mb-2 pr-4">
                    <button onClick={() => updateSubtask(st.id, { completed: !st.completed })} className="mt-0.5 shrink-0">
                      {st.completed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-gray-300" />}
                    </button>
                    <input type="text" value={st.text} onChange={e => updateSubtask(st.id, { text: e.target.value })} className={`flex-1 text-sm outline-none bg-transparent ${st.completed ? 'text-gray-400 line-through' : 'text-slate-700 font-medium'}`} placeholder="Nombre sub-tarea..." />
                  </div>
                  
                  <div className="space-y-2 pl-6">
                    <div className="relative">
                      <ExternalLink size={12} className="absolute left-2 top-2.5 text-gray-400" />
                      <input type="text" value={st.link || ''} onChange={e => updateSubtask(st.id, { link: e.target.value })} placeholder="Link Drive / Documento (Opcional)..." className="w-full text-[11px] p-2 pl-6 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-400" />
                    </div>
                    <textarea value={st.observation || ''} onChange={e => updateSubtask(st.id, { observation: e.target.value })} placeholder="Observaciones e instrucciones de la subtarea..." className="w-full text-[11px] p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-400 min-h-[50px] resize-none" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2">
              <input 
                 type="text" 
                 value={newSubtask} 
                 onChange={e => setNewSubtask(e.target.value)} 
                 onKeyDown={e => e.key === 'Enter' && addSubtask()}
                 placeholder="Nueva subtarea..." 
                 className="flex-1 text-sm p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" 
              />
              <button onClick={addSubtask} className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded-lg transition-colors"><Plus size={20} /></button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-between items-center rounded-b-2xl">
          <button onClick={() => { if(confirm("¿Eliminar tarea de proyecto por completo?")) onDelete(edited.id); }} className="text-red-500 text-xs font-bold hover:underline">Eliminar Tarea</button>
          <div className="flex gap-3">
             <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
             <button onClick={() => onSave(edited)} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors flex items-center gap-2">
               <CheckCircle2 size={16} /> Guardar Cambios
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
