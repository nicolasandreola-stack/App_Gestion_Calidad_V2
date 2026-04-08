import React, { useState, useMemo } from 'react';
import { ProjectTask, ProjectSubtask } from '../types';
import { Plus, Edit2, CheckCircle2, Circle, ChevronDown, ChevronRight, X, ExternalLink, Calendar, Info, CheckSquare, AlignLeft, Layers, AlertTriangle, User } from 'lucide-react';

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

const toInputDate = (dStr: string) => {
   if (!dStr) return '';
   const p = dStr.split('/');
   if(p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
   return '';
};

const fromInputDate = (dStr: string) => {
   if (!dStr) return '';
   const p = dStr.split('-');
   if(p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
   return '';
}

const dayDiff = (start: Date, end: Date) => {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const isOverdue = (endStr: string, status: string) => {
  if (status === 'CERRADO') return false;
  const endD = parseDate(endStr);
  const now = new Date();
  now.setHours(0,0,0,0);
  endD.setHours(0,0,0,0);
  return endD < now;
};

export default function AdminGantt({ projects, onUpdateProject, onAddProject, onDeleteProject }: AdminGanttProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  
  // Modals state
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [viewTask, setViewTask] = useState<ProjectTask | null>(null);

  // Grouping
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, ProjectTask[]>>();
    const pMeta = new Map<string, {prog:number, count:number, minD:Date, maxD:Date}>();
    const phMeta = new Map<string, {prog:number, count:number, minD:Date, maxD:Date}>();

    let minD = new Date();
    let maxD = new Date();

    if (projects && projects.length > 0) {
      minD.setFullYear(minD.getFullYear() + 5);
      maxD = new Date(2000, 0, 1);

      projects.forEach(p => {
        const start = parseDate(p.startDate);
        const end = parseDate(p.endDate);
        if (start < minD) minD = start;
        if (end > maxD) maxD = end;

        if (!map.has(p.project)) map.set(p.project, new Map());
        const pMap = map.get(p.project)!;
        if (!pMap.has(p.phase)) pMap.set(p.phase, []);
        pMap.get(p.phase)!.push(p);

        // Project Meta
        if (!pMeta.has(p.project)) pMeta.set(p.project, {prog: 0, count: 0, minD: start, maxD: end});
        const pm = pMeta.get(p.project)!;
        pm.count += 1;
        pm.prog += p.progress || 0;
        if (start < pm.minD) pm.minD = start;
        if (end > pm.maxD) pm.maxD = end;

        // Phase Meta
        const phKey = p.project + p.phase;
        if (!phMeta.has(phKey)) phMeta.set(phKey, {prog: 0, count: 0, minD: start, maxD: end});
        const phm = phMeta.get(phKey)!;
        phm.count += 1;
        phm.prog += p.progress || 0;
        if (start < phm.minD) phm.minD = start;
        if (end > phm.maxD) phm.maxD = end;
      });
    }

    // Add buffer
    minD.setDate(minD.getDate() - 7);
    maxD.setDate(maxD.getDate() + 14);
    
    if (dayDiff(minD, maxD) < 30) {
      maxD.setDate(minD.getDate() + 30);
    }

    let totalDays = dayDiff(minD, maxD);
    if (totalDays < 0) totalDays = 30; // Fallback if still negative
    
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

    return { map, pMeta, phMeta, minD, maxD, totalDays, daysArr, months };
  }, [projects]);

  // Autocomplete lists
  const uniqueProjects = Array.from(new Set(projects.map(p => p.project))).filter(Boolean);
  const uniquePhases = Array.from(new Set(projects.map(p => p.phase))).filter(Boolean);
  
  // Get unique assignees covering both main tasks and subtasks
  const uniqueAssignees = Array.from(new Set(projects.flatMap(p => {
    const list = [p.assignee];
    if (p.subtasks) {
      p.subtasks.forEach(s => { if (s.assignee) list.push(s.assignee); });
    }
    return list;
  }))).filter(Boolean);

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
            id: 'PROJ-' + Date.now(), project: '', phase: '', name: 'Nueva Tarea', 
            startDate: formatDate(new Date()), endDate: formatDate(new Date(new Date().setDate(new Date().getDate() + 5))),
            assignee: '', progress: 0, status: 'PENDIENTE', subtasks: [], details: '', link: ''
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
                  {expandedProjects.has(projName) && (
                    <span className="ml-auto text-[10px] font-bold bg-slate-600 text-white px-2 py-0.5 rounded-full" title="Progreso total promedio">
                      {Math.round(grouped.pMeta.get(projName)!.prog / grouped.pMeta.get(projName)!.count)}%
                    </span>
                  )}
                </div>

                {!expandedProjects.has(projName) && Array.from(phases.entries()).map(([phaseName, tasks]) => (
                  <div key={phaseName}>
                    <div 
                      className="bg-slate-100 border-y border-slate-200 px-4 py-2 pl-8 flex items-center gap-2 cursor-pointer hover:bg-slate-200 select-none"
                      onClick={() => togglePhase(projName + phaseName)}
                    >
                      {expandedPhases.has(projName + phaseName) ? <ChevronRight size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-700" />}
                      <span className="font-bold text-xs text-slate-700">{phaseName}</span>
                      
                      <div className="ml-auto flex gap-2 items-center">
                         <span className="text-[10px] text-slate-400 font-medium">{tasks.length} tareas</span>
                         {expandedPhases.has(projName + phaseName) && (
                            <span className="text-[10px] font-bold bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full" title="Progreso fase">
                              {Math.round(grouped.phMeta.get(projName + phaseName)!.prog / grouped.phMeta.get(projName + phaseName)!.count)}%
                            </span>
                         )}
                      </div>
                    </div>

                    {!expandedPhases.has(projName + phaseName) && tasks.map(t => {
                      const overdue = isOverdue(t.endDate, t.status);
                      return (
                      <div 
                        key={t.id} 
                        className="group grid grid-cols-[1fr_50px_70px] items-center px-4 py-3 border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer h-12 transition-colors relative"
                        onClick={() => setViewTask(t)}
                      >
                        <div className="pl-8 truncate flex items-center gap-2">
                          {overdue && <AlertTriangle size={12} className="text-red-500 shrink-0" title="Tarea Vencida" />}
                          <div className="flex flex-col truncate">
                            <span className={`text-xs font-medium truncate block transition-colors group-hover:text-blue-700 ${overdue ? 'text-red-600' : 'text-slate-700'}`}>{t.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {t.assignee && (
                                <span className="text-[9px] text-slate-500 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-sm"><User size={8} /> {t.assignee}</span>
                              )}
                              {t.subtasks && t.subtasks.length > 0 && (
                                <span className="text-[9px] text-slate-400">{t.subtasks.filter(s=>s.completed).length}/{t.subtasks.length} subs</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold text-center ${overdue ? 'text-red-500' : 'text-slate-600'}`}>{t.progress}%</div>
                        <div className="text-center">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${t.status === 'CERRADO' ? 'bg-emerald-100 text-emerald-700' : t.status === 'EN PROGRESO' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{t.status || 'PENDIENTE'}</span>
                        </div>
                        {overdue && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                      </div>
                    )})}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL - Timeline Grid */}
        <div className="flex-1 overflow-x-auto custom-scrollbar flex flex-col bg-slate-50 relative hide-horizontal-scrollbar">
          <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur border-b border-gray-200">
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

          <div className="relative flex-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMTAwJSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bGluZSB4MT0iMzAiIHkxPSIwIiB4Mj0iMzAiIHkyPSIxMDAlIiBzdHJva2U9IiNlMmU4ZjAiIHN0cm9rZS1kYXNoYXJyYXk9IjIgMiIgLz48L3N2Zz4=')] pb-10 w-max min-w-full">
            <div 
              className="absolute top-0 bottom-0 border-l-2 border-red-400/50 z-0 pointer-events-none" 
              style={{ left: dayDiff(grouped.minD, today) * 30 + 15, display: dayDiff(grouped.minD, today) >= 0 && dayDiff(grouped.minD, today) <= grouped.totalDays ? 'block' : 'none' }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-red-400"></div>
            </div>

            {Array.from(grouped.map.entries()).map(([projName, phases]) => {
              const pm = grouped.pMeta.get(projName)!;
              const pStartOffset = dayDiff(grouped.minD, pm.minD) * 30;
              const pDuration = Math.max(1, dayDiff(pm.minD, pm.maxD)) * 30;

              return (
              <div key={projName + '_grid'}>
                <div className="h-[44px] w-full border-b border-transparent relative">
                  {expandedProjects.has(projName) && (
                     <div className="absolute top-4 h-3 bg-slate-800 rounded shadow-sm opacity-60" style={{left: pStartOffset + 15, width: pDuration}}></div>
                  )}
                </div>

                {!expandedProjects.has(projName) && Array.from(phases.entries()).map(([phaseName, tasks]) => {
                  const phm = grouped.phMeta.get(projName + phaseName)!;
                  const phStartOffset = dayDiff(grouped.minD, phm.minD) * 30;
                  const phDuration = Math.max(1, dayDiff(phm.minD, phm.maxD)) * 30;

                  return (
                  <div key={phaseName + '_grid'}>
                    <div className="h-[37px] w-full border-b border-transparent bg-slate-50/30 line-through-pattern relative">
                       {expandedPhases.has(projName + phaseName) && (
                           <div className="absolute top-3 h-2 border-t-2 border-dashed border-slate-400" style={{left: phStartOffset + 15, width: phDuration}}>
                              <div className="absolute -left-1 -top-1.5 w-0 h-0 border-t-4 border-t-transparent border-l-[6px] border-l-slate-400 border-b-4 border-b-transparent"></div>
                              <div className="absolute -right-1 -top-1.5 w-0 h-0 border-t-4 border-t-transparent border-r-[6px] border-r-slate-400 border-b-4 border-b-transparent"></div>
                           </div>
                       )}
                    </div>

                    {!expandedPhases.has(projName + phaseName) && tasks.map(t => {
                       const sDate = parseDate(t.startDate);
                       const eDate = parseDate(t.endDate);
                       const leftOffset = dayDiff(grouped.minD, sDate) * 30;
                       const duration = Math.max(1, dayDiff(sDate, eDate)) * 30;
                       const overdue = isOverdue(t.endDate, t.status);

                       return (
                        <div key={t.id + '_grid'} className="h-12 border-b border-slate-100 flex items-center relative group/row hover:bg-blue-50/20 transition-colors">
                          <div 
                            className={`absolute h-6 rounded-md shadow-sm border overflow-hidden cursor-pointer flex items-center transition-all hover:-translate-y-0.5 hover:shadow-md ${t.status === 'CERRADO' ? 'bg-emerald-500 border-emerald-600' : overdue ? 'bg-red-500 border-red-600' : t.status === 'EN PROGRESO' ? 'bg-blue-500 border-blue-600' : 'bg-slate-400 border-slate-500'}`}
                            style={{ left: leftOffset + 15, width: duration }}
                            onClick={() => setViewTask(t)}
                            title={`${t.name} (${t.progress}%)`}
                          >
                             <div className="absolute top-0 bottom-0 left-0 bg-black/20" style={{ width: `${t.progress}%` }}></div>
                             <span className="relative z-10 text-[9px] font-bold text-white px-2 truncate leading-none pt-0.5 pointer-events-none">{t.name}</span>
                          </div>
                        </div>
                       );
                    })}
                  </div>
                  )})}
              </div>
            )})}
          </div>
        </div>
      </div>

      {/* VIEW MODAL (Read-Only) */}
      {viewTask && (
        <TaskViewModal 
           task={viewTask} 
           onClose={() => setViewTask(null)}
           onEdit={() => {
             setEditTask(viewTask);
             setViewTask(null);
           }}
        />
      )}

      {/* EDIT MODAL */}
      {editTask && (
        <TaskEditModal 
           task={editTask} 
           uniqueProjects={uniqueProjects}
           uniquePhases={uniquePhases}
           uniqueAssignees={uniqueAssignees}
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

// ------ VIEW MODAL COMPONENT ------
function TaskViewModal({ task, onClose, onEdit }: { task: ProjectTask, onClose: () => void, onEdit: () => void }) {
  const overdue = isOverdue(task.endDate, task.status);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-slate-50">
          <div>
             <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase">{task.project}</span>
               <span className="text-[10px] font-bold text-slate-500 uppercase">{task.phase}</span>
             </div>
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mt-2">
               {task.name}
               {overdue && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={12}/> VENCIDA</span>}
             </h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors flex items-center gap-1 text-sm font-bold">
              <Edit2 size={16} /> Editar
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
          
          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
               <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Estado</p>
               <p className="text-sm font-bold text-slate-700">{task.status || 'PENDIENTE'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
               <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Avance</p>
               <p className="text-sm font-bold text-slate-700">{task.progress}%</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
               <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Fechas</p>
               <p className={`text-xs font-bold ${overdue ? 'text-red-500' : 'text-slate-700'}`}>{task.startDate} al {task.endDate}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
               <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Asignado a</p>
               <p className="text-sm font-bold text-slate-700">{task.assignee || 'Sin área asignada'}</p>
            </div>
          </div>

          <div className="mb-6">
             <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><AlignLeft size={14}/> Detalle / Observaciones Principales</h3>
             <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[60px] whitespace-pre-wrap">
               {task.details || <span className="text-slate-400 italic">No hay detalles cargados para la tarea principal.</span>}
             </div>
             {task.link && (
               <a href={task.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition-colors font-medium">
                 <ExternalLink size={16} /> Abrir Documento/Link Principal
               </a>
             )}
          </div>

          {/* Subtasks Summary */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-3"><CheckSquare size={14}/> Subtareas ({task.subtasks?.filter(s=>s.completed).length || 0}/{task.subtasks?.length || 0})</h3>
            {(!task.subtasks || task.subtasks.length === 0) ? (
              <p className="text-sm text-slate-400 italic">No hay subtareas cargadas.</p>
            ) : (
              <div className="space-y-3">
                {task.subtasks.map(st => (
                  <div key={st.id} className="border border-slate-100 rounded-lg p-3 relative bg-white shadow-sm flex flex-col gap-2">
                     <div className="flex items-start gap-2">
                       <span className="mt-0.5">{st.completed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-slate-300" />}</span>
                       <span className={`text-sm font-medium ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{st.text}</span>
                     </div>
                     {(st.observation || st.link || st.assignee) && (
                       <div className="pl-6 space-y-1">
                         {st.assignee && <p className="text-[11px] font-bold text-slate-600 bg-slate-100 w-fit px-2 py-0.5 rounded flex items-center gap-1"><User size={10} /> Delegado a: {st.assignee}</p>}
                         {st.observation && <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded">{st.observation}</p>}
                         {st.link && <a href={st.link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 flex items-center gap-1 hover:underline w-fit"><ExternalLink size={10} /> Link adjunto</a>}
                       </div>
                     )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ------ EDIT MODAL COMPONENT ------
function TaskEditModal({ task, uniqueProjects, uniquePhases, uniqueAssignees, onClose, onSave, onDelete }: { task: ProjectTask, uniqueProjects: string[], uniquePhases: string[], uniqueAssignees: string[], onClose: () => void, onSave: (t: ProjectTask) => void, onDelete: (id: string) => void }) {
  const [edited, setEdited] = useState<ProjectTask>(JSON.parse(JSON.stringify(task))); // Deep copy
  const [newSubtask, setNewSubtask] = useState("");

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const st: ProjectSubtask = { id: 'ST-' + Date.now(), text: newSubtask, completed: false, link: '', observation: '', assignee: '' };
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
        
        {/* Datalists for autocompletion */}
        <datalist id="projects-list">
          {uniqueProjects.map(p => <option key={p} value={p} />)}
        </datalist>
        <datalist id="phases-list">
          {uniquePhases.map(ph => <option key={ph} value={ph} />)}
        </datalist>
        <datalist id="assignees-list">
          {uniqueAssignees.map(a => <option key={a} value={a} />)}
        </datalist>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Edit2 size={18} className="text-blue-600" /> {task.id.startsWith('PROJ') ? 'Editar' : 'Nueva'} Tarea de Proyecto
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar grid grid-cols-1 md:grid-cols-[1fr_400px] gap-8">
          
          {/* Main Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Proyecto Existente o Nuevo</label>
                <input list="projects-list" type="text" value={edited.project} onChange={e => setEdited({...edited, project: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Selecciona o escribe..." />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Fase o Etapa</label>
                <input list="phases-list" type="text" value={edited.phase} onChange={e => setEdited({...edited, phase: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Selecciona o escribe..." />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Nombre de la Tarea Principal</label>
              <input type="text" value={edited.name} onChange={e => setEdited({...edited, name: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Asignado a (Área / Pers.)</label>
                <input list="assignees-list" type="text" value={edited.assignee} onChange={e => setEdited({...edited, assignee: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 outline-none" placeholder="Ej: Finanzas" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block flex items-center gap-1"><Calendar size={12}/> Inicio</label>
                <input type="date" value={toInputDate(edited.startDate)} onChange={e => setEdited({...edited, startDate: fromInputDate(e.target.value)})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block flex items-center gap-1"><Calendar size={12}/> Fin / Vencimiento</label>
                <input type="date" value={toInputDate(edited.endDate)} onChange={e => setEdited({...edited, endDate: fromInputDate(e.target.value)})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block flex items-center gap-1"><AlignLeft size={12} /> Detalle / Observaciones Principales</label>
                <textarea value={edited.details || ''} onChange={e => setEdited({...edited, details: e.target.value})} className="w-full p-3 text-sm rounded-lg border border-gray-300 min-h-[100px] resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Instrucciones generales para la tarea principal..." />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block flex items-center gap-1"><ExternalLink size={12} /> Enlace Carpeta Principal Drive</label>
                <input type="text" value={edited.link || ''} onChange={e => setEdited({...edited, link: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Subtasks (Column J, K, L abstract) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><CheckSquare size={16} className="text-blue-600"/> Subtareas Específicas</h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {(!edited.subtasks || edited.subtasks.length === 0) && (
                 <div className="text-center py-10 text-slate-400">
                    <Info size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Usa este espacio para delegar micro-tareas o enlazar documentos específicos a personas concretas.</p>
                 </div>
              )}
              {edited.subtasks?.map(st => (
                <div key={st.id} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm relative group">
                  <button onClick={() => removeSubtask(st.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                  
                  <div className="flex items-start gap-2 mb-3 pr-4">
                    <button onClick={() => updateSubtask(st.id, { completed: !st.completed })} className="mt-0.5 shrink-0">
                      {st.completed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-gray-300" />}
                    </button>
                    <input type="text" value={st.text} onChange={e => updateSubtask(st.id, { text: e.target.value })} className={`flex-1 text-sm outline-none bg-transparent ${st.completed ? 'text-gray-400 line-through' : 'text-slate-700 font-medium'}`} placeholder="Instrucción corta..." />
                  </div>
                  
                  <div className="space-y-3 pl-6">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                           <User size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                           <input list="assignees-list" type="text" value={st.assignee || ''} onChange={e => updateSubtask(st.id, { assignee: e.target.value })} placeholder="Delegar a..." className="w-full text-xs p-2 pl-7 border border-gray-200 rounded-md outline-none focus:border-blue-400" />
                        </div>
                        <div className="relative">
                          <ExternalLink size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                          <input type="text" value={st.link || ''} onChange={e => updateSubtask(st.id, { link: e.target.value })} placeholder="Link Doc. Interno..." className="w-full text-xs p-2 pl-7 border border-gray-200 rounded-md outline-none focus:border-blue-400" />
                        </div>
                    </div>
                    <div>
                      <textarea value={st.observation || ''} onChange={e => updateSubtask(st.id, { observation: e.target.value })} placeholder="Observaciones adicionales o notas..." className="w-full text-xs p-2 border border-gray-200 rounded-md outline-none focus:border-blue-400 min-h-[40px] resize-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2 shrink-0">
              <input 
                 type="text" 
                 value={newSubtask} 
                 onChange={e => setNewSubtask(e.target.value)} 
                 onKeyDown={e => e.key === 'Enter' && addSubtask()}
                 placeholder="Cargar nueva subtarea..." 
                 className="flex-1 text-sm p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" 
              />
              <button onClick={addSubtask} className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded-lg transition-colors"><Plus size={20} /></button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-between items-center rounded-b-2xl shrink-0">
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
