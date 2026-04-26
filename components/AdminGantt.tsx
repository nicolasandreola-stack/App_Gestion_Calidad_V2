import React, { useState, useMemo } from 'react';
import { ProjectTask, ProjectSubtask } from '../types';
import ProjectReportView from './ProjectReportView';
import ImportProjectModal from './ImportProjectModal';
import { Bot, Plus, Edit2, CheckCircle2, Circle, ChevronDown, ChevronUp, ChevronRight, X, ExternalLink, Calendar, Info, CheckSquare, AlignLeft, Layers, AlertTriangle, User, FolderKanban, TrendingUp, Clock, Activity, PieChart, BarChart, MessageSquare, FileText, Star, BookOpen, Link2, Eye, EyeOff } from 'lucide-react';

interface AdminGanttProps {
  projects: ProjectTask[];
  onUpdateProject: (p: ProjectTask) => void;
  onAddProject: (p: ProjectTask) => void;
  onDeleteProject: (id: string) => void;
  onBulkDeleteProjects?: (ids: string[]) => void;
  onBulkAddProjects?: (projects: ProjectTask[]) => void;
  onBulkUpdateProjects?: (projects: ProjectTask[]) => void;
}

// Helpers for dates (DD/MM/YYYY)
const parseDate = (dStr: string) => {
  if (!dStr) return new Date();
  const parts = dStr.split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const y = parseInt(parts[2]);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(y, m, d);
    }
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

const SubtaskRowLink = ({ link, closingNote, onSave }: { link: string, closingNote: string, onSave: (link: string, closingNote: string) => void }) => {
  const [localLink, setLocalLink] = useState(link);
  const [localObs, setLocalObs] = useState(closingNote);
  const [showObs, setShowObs] = useState(false);

  return (
    <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 focus-within:opacity-100 transition-opacity">
      <div className="relative flex items-center">
        {!showObs && !localObs ? (
          <button onClick={(e) => { e.stopPropagation(); setShowObs(true); }} className="text-slate-400 hover:text-blue-500 p-1 rounded transition-colors" title="Añadir nota de cierre">
            <MessageSquare size={12} />
          </button>
        ) : (
          <div className="flex items-center w-[120px]">
            <input 
               type="text"
               title={localObs}
               placeholder="Nota de cierre..."
               className="w-full text-[10px] bg-slate-50 border border-slate-200 text-slate-700 rounded px-1.5 py-1 focus:border-blue-400 focus:outline-none placeholder:text-slate-400"
               value={localObs}
               onChange={e => setLocalObs(e.target.value)}
               onBlur={() => { if (localObs !== closingNote || localLink !== link) onSave(localLink, localObs); if (!localObs) setShowObs(false); }}
               onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
               onClick={e => e.stopPropagation()}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 w-[120px]">
        <input 
          type="text" 
          title={localLink}
          placeholder="Añadir link..." 
          className="w-full text-[10px] bg-white border border-slate-200 rounded px-1.5 py-1 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={localLink}
          onChange={(e) => setLocalLink(e.target.value)}
          onBlur={() => { if (localLink !== link || localObs !== closingNote) onSave(localLink, localObs); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
          onClick={(e) => e.stopPropagation()}
        />
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-500 hover:bg-blue-100 rounded shrink-0 bg-white border border-slate-200" onClick={e => e.stopPropagation()} title="Abrir link">
            <ExternalLink size={12} />
          </a>
        ) : (
          <div className="w-[22px]" />
        )}
      </div>
    </div>
  );
};

export default function AdminGantt({ projects, onUpdateProject, onAddProject, onDeleteProject, onBulkDeleteProjects, onBulkAddProjects, onBulkUpdateProjects }: AdminGanttProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // Modals state
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [viewTask, setViewTask] = useState<ProjectTask | null>(null);
  const [activeKpiModal, setActiveKpiModal] = useState<'proyectos' | 'completadas' | 'atrasadas' | null>(null);
  const [activeProjectDashboard, setActiveProjectDashboard] = useState<string | null>(null);
  
  // States for reporting
  const [showReportSelector, setShowReportSelector] = useState(false);
  const [reportProjectName, setReportProjectName] = useState<string | null>(null);

  // Stats for import modal
  const [showImportModal, setShowImportModal] = useState(false);

  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('v25_hidden_projects');
      if (stored) return new Set(JSON.parse(stored));
    } catch (e) {}
    return new Set();
  });

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
        if (hiddenProjects.has(p.project)) return;
        const start = parseDate(p.startDate);
        const end = parseDate(p.endDate);
        if (start < minD) minD = new Date(start);
        if (end > maxD) maxD = new Date(end);

        if (!map.has(p.project)) map.set(p.project, new Map());
        const pMap = map.get(p.project)!;
        if (!pMap.has(p.phase)) pMap.set(p.phase, []);
        pMap.get(p.phase)!.push(p);

        // Project Meta
        if (!pMeta.has(p.project)) pMeta.set(p.project, {prog: 0, count: 0, minD: new Date(start), maxD: new Date(end)});
        const pm = pMeta.get(p.project)!;
        pm.count += 1;
        pm.prog += p.progress || 0;
        if (start < pm.minD) pm.minD = new Date(start);
        if (end > pm.maxD) pm.maxD = new Date(end);

        // Phase Meta
        const phKey = p.project + p.phase;
        if (!phMeta.has(phKey)) phMeta.set(phKey, {prog: 0, count: 0, minD: new Date(start), maxD: new Date(end)});
        const phm = phMeta.get(phKey)!;
        phm.count += 1;
        phm.prog += p.progress || 0;
        if (start < phm.minD) phm.minD = new Date(start);
        if (end > phm.maxD) phm.maxD = new Date(end);
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
    
    const rawDays = Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(minD);
      d.setDate(minD.getDate() + i);
      return d;
    });
    const daysArr = rawDays.filter(d => d.getDay() !== 0 && d.getDay() !== 6);

    const getDateIndex = (d: Date) => {
      const time = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const idx = daysArr.findIndex(x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() === time);
      if (idx !== -1) return idx;
      
      if (time < daysArr[0].getTime()) return 0;
      if (time > daysArr[daysArr.length - 1].getTime()) return daysArr.length - 1;

      for (let i = 0; i < daysArr.length; i++) {
        if (daysArr[i].getTime() > time) return i;
      }
      return daysArr.length - 1;
    };

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

    // ── Sort phases within each project by their earliest start date ──
    map.forEach((pMap, projName) => {
      const sortedPhases = Array.from(pMap.entries()).sort(([nameA], [nameB]) => {
        const metaA = phMeta.get(projName + nameA);
        const metaB = phMeta.get(projName + nameB);
        if (!metaA || !metaB) return 0;
        return metaA.minD.getTime() - metaB.minD.getTime();
      });
      pMap.clear();
      sortedPhases.forEach(([name, tasks]) => pMap.set(name, tasks));
    });

    const taskCodes = new Map<string, string>();
    Array.from(map.entries()).forEach(([projName, pMap]) => {
      let phaseIdx = 0;
      Array.from(pMap.entries()).forEach(([phaseName, phaseTasks]) => {
        const phaseLetter = String.fromCharCode(65 + phaseIdx);
        phaseTasks.forEach((t, taskIdx) => {
          taskCodes.set(t.id, `${phaseLetter}${taskIdx + 1}`);
        });
        phaseIdx++;
      });
    });

    return { map, pMeta, phMeta, minD, maxD, totalDays, daysArr, months, taskCodes, getDateIndex };
  }, [projects, hiddenProjects]);

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

  const toggleTask = (taskId: string) => {
    const next = new Set(expandedTasks);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setExpandedTasks(next);
  };

  const toggleAllSubtasksInPhase = (tasksInPhase: ProjectTask[]) => {
    const taskIds = tasksInPhase.filter(t => t.subtasks && t.subtasks.length > 0).map(t => t.id);
    if (taskIds.length === 0) return;

    const areAllExpanded = taskIds.every(id => expandedTasks.has(id));
    const next = new Set(expandedTasks);
    
    if (areAllExpanded) taskIds.forEach(id => next.delete(id));
    else taskIds.forEach(id => next.add(id));
    
    setExpandedTasks(next);
  };

  const handleToggleSubtask = (task: ProjectTask, subtaskId: string) => {
    if (!task.subtasks) return;
    const newSubtasks = task.subtasks.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
    const completed = newSubtasks.filter(s => s.completed).length;
    const newProgress = Math.round((completed / newSubtasks.length) * 100);
    let newStatus = task.status;
    if (newProgress === 100) newStatus = 'CERRADO';
    else if (newProgress > 0) newStatus = 'EN PROGRESO';
    else newStatus = 'PENDIENTE';
    onUpdateProject({ ...task, subtasks: newSubtasks, progress: newProgress, status: newStatus });
  };

  const handleUpdateSubtaskMeta = (task: ProjectTask, subtaskId: string, link: string, closingNote: string) => {
    if (!task.subtasks) return;
    const newSubtasks = task.subtasks.map(st => st.id === subtaskId ? { ...st, link, closingNote } : st);
    onUpdateProject({ ...task, subtasks: newSubtasks });
  };

  const toggleProjectPriority = (projName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onBulkUpdateProjects) return;
    const projTasks = projects.filter(p => p.project === projName);
    if (projTasks.length === 0) return;
    const currentPriority = projTasks[0].priorityProject || false;
    const updated = projTasks.map(p => ({ ...p, priorityProject: !currentPriority }));
    onBulkUpdateProjects(updated);
  };

  // ── Notebook Link ──
  const [notebookModal, setNotebookModal] = useState<{ projName: string; url: string } | null>(null);

  const openNotebookModal = (projName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentLink = projects.find(p => p.project === projName)?.notebookLink || '';
    setNotebookModal({ projName, url: currentLink });
  };

  const handleNotebookLinkClick = (projName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = projects.find(p => p.project === projName)?.notebookLink;
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      openNotebookModal(projName, e);
    }
  };

  const saveNotebookLink = () => {
    if (!notebookModal || !onBulkUpdateProjects) return;
    const { projName, url } = notebookModal;
    const projTasks = projects.filter(p => p.project === projName);
    const updated = projTasks.map(p => ({ ...p, notebookLink: url.trim() || undefined }));
    onBulkUpdateProjects(updated);
    setNotebookModal(null);
  };

  const today = new Date();

  // --- KPI Calculations ---
  const visibleTasks = projects.filter(p => !hiddenProjects.has(p.project));
  const totalProjects = grouped.map.size;
  const totalTasks = visibleTasks.length;
  const closedTasks = visibleTasks.filter(p => p.status === 'CERRADO').length;
  const overdueTasks = visibleTasks.filter(p => isOverdue(p.endDate, p.status)).length;
  const avgProgress = totalTasks > 0 ? Math.round(visibleTasks.reduce((acc, p) => acc + (p.progress || 0), 0) / totalTasks) : 0;
  
  const totalSubtasks = visibleTasks.reduce((acc, p) => acc + (p.subtasks?.length || 0), 0);
  const closedSubtasks = visibleTasks.reduce((acc, p) => acc + (p.subtasks?.filter(s => s.completed).length || 0), 0);

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
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (uniqueProjects.length === 1) {
                setReportProjectName(uniqueProjects[0]);
              } else if (uniqueProjects.length > 1) {
                setShowReportSelector(true);
              } else {
                alert("No hay proyectos activos para reportar.");
              }
            }}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-slate-300"
            title="Generar Reporte de Alta Dirección..."
          >
            <FileText size={16} /> Generar Reporte
          </button>
          
          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-violet-100 hover:bg-violet-200 text-violet-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border border-violet-200"
            title="Importar Proyecto desde IA (NotebookLM)"
          >
            <Bot size={16} /> Importar AI
          </button>

          <button 
            onClick={() => setEditTask({
              id: 'PROJ-' + Date.now(), project: '', phase: '', name: 'Nueva Tarea', 
              startDate: formatDate(new Date()), endDate: formatDate(new Date(new Date().setDate(new Date().getDate() + 5))),
              assignee: '', progress: 0, status: 'PENDIENTE', subtasks: [], details: '', link: ''
            })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={16} /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* Project Selector Modal for Reports */}
      {showReportSelector && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[990] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px]">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
              <FileText size={20} className="text-blue-500" /> Seleccionar Proyecto a Reportar
            </h3>
            <p className="text-sm text-slate-500 mb-4">Elige un proyecto para generar el documento de estatus.</p>
            <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto">
              {uniqueProjects.map(pName => (
                <button
                  key={pName}
                  onClick={() => { setReportProjectName(pName); setShowReportSelector(false); }}
                  className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors font-medium text-slate-700 hover:text-blue-700 flex items-center justify-between"
                >
                  {pName} <ChevronRight size={16} />
                </button>
              ))}
            </div>
            <button onClick={() => setShowReportSelector(false)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {/* The Report Document Overlay */}
      {reportProjectName && (
        <ProjectReportView 
          projectName={reportProjectName} 
          projects={projects} 
          onClose={() => setReportProjectName(null)} 
        />
      )}

      {/* Import Project from AI Modal */}
      {showImportModal && (
        <ImportProjectModal
          onClose={() => setShowImportModal(false)}
          onImport={async (newProj) => {
            if (onBulkAddProjects) await onBulkAddProjects(newProj);
          }}
        />
      )}

      {/* KPI DASHBOARD RIBBON */}
      <div className="grid grid-cols-5 gap-4 px-4 pt-4 shrink-0">
        <div onClick={() => setActiveKpiModal('proyectos')} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3 cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all group">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><FolderKanban size={24} /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Proyectos Activos</p>
            <p className="text-xl font-black text-slate-800">{totalProjects}</p>
          </div>
        </div>
        
        <div onClick={() => setActiveKpiModal('completadas')} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3 cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all group">
          <div className="bg-emerald-100 text-emerald-600 p-3 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors"><CheckCircle2 size={24} /></div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Tareas Lógicas</p>
            <div className="flex justify-between items-end gap-1">
              <p className="text-xl font-black text-slate-800">{closedTasks}<span className="text-xs font-medium text-slate-400">/{totalTasks}</span></p>
              <p className="text-[9px] font-bold text-emerald-600 pb-0.5">Terminadas</p>
            </div>
          </div>
        </div>

        <div onClick={() => setActiveKpiModal('subtareas')} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3 cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all group">
          <div className="bg-teal-100 text-teal-600 p-3 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-colors"><CheckSquare size={24} /></div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Subtareas Físicas</p>
            <div className="flex justify-between items-end gap-1">
              <p className="text-xl font-black text-slate-800">{closedSubtasks}<span className="text-xs font-medium text-slate-400">/{totalSubtasks}</span></p>
              <p className="text-[9px] font-bold text-teal-600 pb-0.5">Completadas</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3 relative group/info">
          <div className="bg-indigo-100 text-indigo-600 p-3 rounded-lg"><TrendingUp size={24} /></div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Progreso Global</p>
              <div className="relative">
                <button className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center text-[8px] font-black transition-colors" title="¿Cómo se calcula?">?</button>
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 text-white text-[10px] rounded-lg p-3 shadow-xl opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                  <p className="font-bold text-indigo-300 mb-1 text-[11px]">📊 ¿Cómo se calcula el %?</p>
                  <p>Se promedia el <span className="text-emerald-300 font-bold">% de avance individual</span> de cada tarea del proyecto.</p>
                  <p className="mt-1.5">El avance de cada tarea se actualiza en base a las <span className="text-yellow-300 font-bold">subtareas físicas completadas</span> (check ✓).</p>
                  <p className="mt-1.5 text-slate-400 italic">Fórmula: Suma(avance de cada tarea) ÷ total de tareas</p>
                  <div className="absolute bottom-full left-4 border-4 border-transparent border-b-slate-800"></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xl font-black text-slate-800">{avgProgress}%</p>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all" style={{width: `${avgProgress}%`}}></div>
              </div>
            </div>
          </div>
        </div>
        
        <div onClick={() => setActiveKpiModal('atrasadas')} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3 cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all group">
          <div className={`p-3 rounded-lg transition-colors ${overdueTasks > 0 ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
            {overdueTasks > 0 ? <AlertTriangle size={24} /> : <Clock size={24} />}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Atrasos Críticos</p>
            <p className={`text-xl font-black ${overdueTasks > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {overdueTasks} <span className="text-[10px] font-medium text-slate-400">tareas</span>
            </p>
          </div>
        </div>
      </div>

      {/* GANTT CONTAINER */}
      <div className="flex-1 overflow-auto flex relative bg-white m-4 rounded-xl shadow-sm border border-gray-200">
        
        {/* LEFT PANEL - Data List */}
        <div className="w-[480px] shrink-0 border-r border-gray-200 bg-white z-[40] sticky left-0 flex flex-col pointer-events-none">
          <div className="h-16 border-b border-gray-200 bg-slate-50/95 backdrop-blur shrink-0 grid grid-cols-[1fr_50px_70px] items-end pb-2 px-4 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)] sticky top-0 z-[50] pointer-events-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estructura / Tarea</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase text-center">%</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase text-center">Estado</span>
          </div>

          <div className="pb-10 pointer-events-auto">
            {Array.from(grouped.map.entries()).map(([projName, phases], pIdx) => {
              const isPriority = phases.values().next().value?.[0]?.priorityProject || false;
              return (
              <div key={projName} className="mb-0">
                {pIdx > 0 && <div className="h-6 w-full bg-slate-50/50 border-t border-white border-b border-gray-200 shadow-sm relative z-10 w-full"></div>}
                <div 
                  className={`px-4 py-3 flex items-center gap-2 cursor-pointer select-none sticky top-16 z-20 group transition-colors shadow-sm ${isPriority ? 'bg-[#1e293b] text-white hover:bg-slate-700' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                  onClick={() => toggleProject(projName)}
                >
                  {expandedProjects.has(projName) ? <ChevronRight size={14} className="text-slate-400 group-hover:text-white shrink-0" /> : <ChevronDown size={14} className="text-white shrink-0" />}
                  <div className="flex flex-col flex-1 min-w-0">
                     <span className="font-bold text-xs uppercase tracking-wider truncate">{projName}</span>
                     <span className="text-[9px] flex items-center gap-1 font-bold mt-0.5 opacity-80 truncate">
                        {Math.round(grouped.pMeta.get(projName)!.prog / grouped.pMeta.get(projName)!.count) > 0 ? (
                           <>
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                             <span className="text-emerald-400">EN CURSO</span>
                           </>
                        ) : (
                           <>
                             <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                             <span className="text-slate-400">NO INICIADO AÚN</span>
                           </>
                        )}
                     </span>
                  </div>
                  
                  <button onClick={(e) => toggleProjectPriority(projName, e)} className="p-1 rounded hover:bg-white/20 transition-colors ml-1" title={isPriority ? "Quitar prioridad" : "Marcar como prioritario"}>
                    <Star size={14} className={isPriority ? "fill-amber-400 text-amber-400" : "text-slate-400 opacity-50 group-hover:opacity-100 hover:text-amber-400"} />
                  </button>

                  {/* Notebook link button */}
                  {(() => {
                    const hasLink = !!projects.find(p => p.project === projName)?.notebookLink;
                    return (
                      <div className="relative">
                        <button
                          onClick={(e) => handleNotebookLinkClick(projName, e)}
                          onContextMenu={(e) => { e.preventDefault(); openNotebookModal(projName, e); }}
                          className="p-1 rounded hover:bg-white/20 transition-colors"
                          title={hasLink ? "Abrir cuaderno (clic derecho para editar)" : "Configurar cuaderno del proyecto"}
                        >
                          <BookOpen size={14} className={hasLink ? "text-teal-300" : "text-slate-400 opacity-50 group-hover:opacity-100"} />
                        </button>
                        {hasLink && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-teal-400 rounded-full" />
                        )}
                      </div>
                    );
                  })()}

                  {expandedProjects.has(projName) && (
                    <span className="ml-auto text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full" title="Progreso total promedio">
                      {Math.round(grouped.pMeta.get(projName)!.prog / grouped.pMeta.get(projName)!.count)}%
                    </span>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveProjectDashboard(projName); }} 
                    className={`p-1.5 rounded-md hover:bg-white/20 transition-colors ${expandedProjects.has(projName) ? 'ml-2' : 'ml-auto'}`}
                    title="Dashboard de Métricas del Proyecto"
                  >
                     <BarChart size={14} className="text-slate-300 hover:text-white" />
                  </button>
                </div>

                {!expandedProjects.has(projName) && Array.from(phases.entries()).map(([phaseName, tasks]) => (
                  <div key={phaseName}>
                    <div 
                      className="bg-slate-100 border-y border-slate-200 px-4 py-2 pl-8 flex items-center gap-2 cursor-pointer hover:bg-slate-200 select-none group/phase"
                      onClick={() => togglePhase(projName + phaseName)}
                    >
                      {expandedPhases.has(projName + phaseName) ? <ChevronRight size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-700" />}
                      <span className="font-bold text-xs text-slate-700">{phaseName}</span>
                      
                      <div className="ml-auto flex gap-2 items-center">
                         {!expandedPhases.has(projName + phaseName) && tasks.some(t => t.subtasks && t.subtasks.length > 0) && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); toggleAllSubtasksInPhase(tasks); }}
                             className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors uppercase"
                             title="Expandir/Colapsar todas las subtareas"
                           >
                             {tasks.filter(t => t.subtasks && t.subtasks.length > 0).every(t => expandedTasks.has(t.id)) ? 'Ocultar Subs' : 'Ver Subs'}
                           </button>
                         )}
                         <span className="text-[10px] text-slate-400 font-medium">{tasks.length} tareas</span>
                         {expandedPhases.has(projName + phaseName) && (
                            <span className="text-[10px] font-bold bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full" title="Progreso fase">
                              {Math.round(grouped.phMeta.get(projName + phaseName)!.prog / grouped.phMeta.get(projName + phaseName)!.count)}%
                            </span>
                         )}
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             if (confirm(`¿Eliminar la fase "${phaseName}" y sus ${tasks.length} tarea(s) por completo? Esta acción no se puede deshacer.`)) {
                               const ids = tasks.map(t => t.id);
                               if (onBulkDeleteProjects) {
                                 onBulkDeleteProjects(ids);
                               } else {
                                 ids.forEach(id => onDeleteProject(id));
                               }
                             }
                           }}
                           className="opacity-0 group-hover/phase:opacity-100 transition-opacity text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded shadow-sm hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors uppercase flex items-center gap-1"
                           title={`Eliminar fase "${phaseName}" completa`}
                         >
                           <X size={10} /> Eliminar Fase
                         </button>
                      </div>
                    </div>

                    {!expandedPhases.has(projName + phaseName) && tasks.map(t => {
                      const overdue = isOverdue(t.endDate, t.status);
                      const isTaskExpanded = expandedTasks.has(t.id);
                      return (
                      <React.Fragment key={t.id}>
                        <div 
                          className="group grid grid-cols-[1fr_50px_70px] items-center px-4 py-3 border-b border-slate-100 bg-white hover:bg-blue-50/50 cursor-pointer h-12 transition-colors relative flex-1"
                          onClick={() => setViewTask(t)}
                        >
                          <div className="pl-6 truncate flex items-center gap-2">
                            {t.subtasks && t.subtasks.length > 0 ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }} 
                                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                              >
                                {isTaskExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            ) : (
                              <div className="w-6 shrink-0"></div>
                            )}
                            {overdue && <AlertTriangle size={12} className="text-red-500 shrink-0" title="Tarea Vencida" />}
                            <div className="flex flex-col truncate">
                              <span title={t.name} className={`text-xs font-medium truncate flex items-center gap-1.5 transition-colors group-hover:text-blue-700 ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                                 {t.link ? (
                                   <a href={t.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[9px] font-mono font-bold bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white px-1 py-0.5 rounded cursor-pointer transition-colors shrink-0" title="Abrir carpeta asociada">
                                     {grouped.taskCodes.get(t.id)}
                                   </a>
                                 ) : (
                                   <span className="text-[9px] font-mono font-bold bg-slate-200 text-slate-700 px-1 py-0.5 rounded shrink-0">{grouped.taskCodes.get(t.id)}</span>
                                 )}
                                 <span className="truncate">{t.name}</span>
                              </span>
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
                        {isTaskExpanded && t.subtasks?.map(st => (
                           <div key={st.id} className="group/sub flex items-center px-4 border-b border-slate-50 bg-slate-50 h-[34px] overflow-hidden">
                             <div className="pl-14 flex items-center gap-2 flex-1 min-w-0 pr-2">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleToggleSubtask(t, st.id); }} 
                                 className="mt-0.5 shrink-0 hover:scale-110 transition-transform cursor-pointer"
                                 title={st.completed ? "Marcar como pendiente" : "Marcar como completada"}
                               >
                                 {st.completed ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Circle size={13} className="text-slate-300 hover:text-blue-400" />}
                               </button>
                               <span title={st.text} className={`text-[11px] truncate flex-1 block ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>{st.text}</span>
                             </div>
                             <SubtaskRowLink 
                               link={st.link || ''}
                               closingNote={st.closingNote || ''}
                               onSave={(newLink, newObs) => handleUpdateSubtaskMeta(t, st.id, newLink, newObs)}
                             />
                           </div>
                        ))}
                      </React.Fragment>
                    )})}
                  </div>
                ))}
              </div>
            )})}
          </div>
        </div>

        {/* RIGHT PANEL - Timeline Grid */}
        <div className="flex-1 flex flex-col bg-slate-50 relative min-w-max">
          <div className="sticky top-0 z-[30] bg-slate-50/95 backdrop-blur border-b border-gray-200">
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
                return (
                  <div key={i} className={`shrink-0 w-[30px] border-r border-gray-200 flex flex-col items-center justify-center ${isToday ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500'}`}>
                    <span className="text-[10px] leading-tight mt-0.5">{d.getDate()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative flex-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMTAwJSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bGluZSB4MT0iMzAiIHkxPSIwIiB4Mj0iMzAiIHkyPSIxMDAlIiBzdHJva2U9IiNlMmU4ZjAiIHN0cm9rZS1kYXNoYXJyYXk9IjIgMiIgLz48L3N2Zz4=')] pb-10 w-max min-w-full">
            {grouped.daysArr.map((d, i) => {
               if (i > 0 && dayDiff(grouped.daysArr[i-1], d) > 1) {
                 return <div key={`wk_sep_${i}`} className="absolute top-0 bottom-0 w-[2px] bg-slate-200/80 pointer-events-none z-0" style={{ left: i * 30 }}></div>;
               }
               return null;
            })}

            <div 
              className="absolute top-0 bottom-0 border-l-2 border-red-400/50 z-0 pointer-events-none" 
              style={{ left: grouped.getDateIndex(today) * 30 + 15, display: grouped.getDateIndex(today) >= 0 && grouped.getDateIndex(today) < grouped.daysArr.length ? 'block' : 'none' }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-red-400"></div>
            </div>

            {Array.from(grouped.map.entries()).map(([projName, phases], pIdx) => {
              const pm = grouped.pMeta.get(projName)!;
              const pStartOffset = grouped.getDateIndex(pm.minD) * 30;
              const pDuration = Math.max(1, grouped.getDateIndex(pm.maxD) - grouped.getDateIndex(pm.minD)) * 30;

              return (
              <div key={projName + '_grid'}>
                {pIdx > 0 && <div className="h-6 w-full bg-slate-50/50 border-t border-white border-b border-gray-200"></div>}
                <div className="h-[44px] w-full border-b border-transparent relative">
                  {expandedProjects.has(projName) && (
                     <div className="absolute top-4 h-3 bg-slate-800 rounded shadow-sm opacity-60" style={{left: pStartOffset + 15, width: pDuration}}></div>
                  )}
                </div>

                {!expandedProjects.has(projName) && (() => {
                  const phaseEntries = Array.from(phases.entries());
                  return phaseEntries.map(([phaseName, tasks], phaseIdx) => {
                    const phm = grouped.phMeta.get(projName + phaseName)!;
                    const phStartOffset = grouped.getDateIndex(phm.minD) * 30;
                    const phDuration = Math.max(1, grouped.getDateIndex(phm.maxD) - grouped.getDateIndex(phm.minD)) * 30;

                    // ── Gap detection: compare with previous phase ──
                    let gapBand: React.ReactNode = null;
                    if (phaseIdx > 0) {
                      const [prevPhaseName] = phaseEntries[phaseIdx - 1];
                      const prevPhm = grouped.phMeta.get(projName + prevPhaseName)!;
                      const gapDays = dayDiff(prevPhm.maxD, phm.minD);
                      if (gapDays >= 3) {
                        const gapLeft  = grouped.getDateIndex(prevPhm.maxD) * 30 + 15;
                        const gapRight = grouped.getDateIndex(phm.minD) * 30 + 15;
                        const gapWidth = Math.max(0, gapRight - gapLeft);
                        const gapLabel = gapDays === 1 ? '1 día' : `${gapDays} días`;
                        gapBand = (
                          <div
                            className="absolute top-1 bottom-1 rounded pointer-events-none z-10"
                            style={{
                              left: gapLeft,
                              width: gapWidth,
                              background: 'repeating-linear-gradient(90deg, rgba(251,191,36,0.18) 0px, rgba(251,191,36,0.18) 6px, transparent 6px, transparent 12px)',
                              borderTop: '1.5px dashed rgba(217,119,6,0.5)',
                              borderBottom: '1.5px dashed rgba(217,119,6,0.5)',
                            }}
                            title={`Pausa entre fases: ${gapLabel}`}
                          >
                            {gapWidth > 40 && (
                              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-amber-600/80 uppercase tracking-widest select-none">
                                {gapLabel}
                              </span>
                            )}
                          </div>
                        );
                      }
                    }

                    return (
                    <div key={phaseName + '_grid'}>
                      <div className="h-[37px] w-full border-b border-transparent bg-slate-50/30 line-through-pattern relative">
                         {gapBand}
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
                         const leftOffset = grouped.getDateIndex(sDate) * 30;
                         const duration = Math.max(1, grouped.getDateIndex(eDate) - grouped.getDateIndex(sDate)) * 30;
                         const overdue = isOverdue(t.endDate, t.status);
                         const isTaskExpanded = expandedTasks.has(t.id);

                         return (
                          <React.Fragment key={t.id + '_grid_wrapper'}>
                            <div key={t.id + '_grid'} className="h-12 border-b border-slate-100 flex items-center relative group/row hover:bg-blue-50/20 transition-colors cursor-pointer" onClick={() => setViewTask(t)}>
                              <div 
                                className={`absolute h-6 rounded-md shadow-sm border overflow-hidden flex items-center transition-all hover:-translate-y-0.5 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] ${t.status === 'CERRADO' ? 'bg-emerald-500 border-emerald-600' : overdue ? 'bg-red-500 border-red-600' : t.status === 'EN PROGRESO' ? 'bg-blue-500 border-blue-600' : 'bg-slate-400 border-slate-500'}`}
                                style={{ left: leftOffset + 15, width: duration }}
                                title={`${t.name} (${t.progress}%)`}
                              >
                                 <div className="absolute top-0 bottom-0 left-0 bg-black/20" style={{ width: `${t.progress}%` }}></div>
                                 <span className="relative z-10 text-[9px] font-bold text-white px-2 truncate flex items-center gap-1 leading-none pt-0.5 pointer-events-none">
                                    {t.link ? (
                                      <a href={t.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="bg-black/30 hover:bg-white hover:text-blue-700 px-1 py-0.5 rounded-sm cursor-pointer transition-colors pointer-events-auto shrink-0" title="Abrir carpeta asociada">
                                        {grouped.taskCodes.get(t.id)}
                                      </a>
                                    ) : (
                                      <span className="bg-black/30 px-1 py-0.5 rounded-sm shrink-0">{grouped.taskCodes.get(t.id)}</span>
                                    )}
                                    <span className="truncate">{t.name}</span>
                                 </span>
                              </div>
                            </div>
                            {isTaskExpanded && t.subtasks?.map(st => (
                               <div key={st.id + '_grid_spacer'} className="h-[34px] border-b border-transparent bg-slate-50/30"></div>
                            ))}
                          </React.Fragment>
                         );
                      })}
                    </div>
                    );
                  });
                })()}
              </div>
            )})
          }
          </div>
        </div>
      </div>

      {/* MODALS RENDER LIST */}

      {/* ── Notebook Link Mini-Modal ── */}
      {notebookModal && (
        <div className="fixed inset-0 z-[400] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setNotebookModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-teal-100 p-2 rounded-xl"><BookOpen size={20} className="text-teal-600" /></div>
              <div>
                <h3 className="font-black text-slate-800 text-base">Cuaderno del Proyecto</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate max-w-[300px]">{notebookModal.projName}</p>
              </div>
              <button onClick={() => setNotebookModal(null)} className="ml-auto p-1.5 hover:bg-slate-100 rounded-full text-slate-400"><X size={16} /></button>
            </div>

            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">URL del cuaderno <span className="text-slate-400 font-normal normal-case">(NotebookLM, Drive, Notion, etc.)</span></label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-slate-50"
                  placeholder="https://notebooklm.google.com/..."
                  value={notebookModal.url}
                  onChange={e => setNotebookModal({ ...notebookModal, url: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && saveNotebookLink()}
                  autoFocus
                />
              </div>
              {notebookModal.url && (
                <a href={notebookModal.url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-100 hover:bg-teal-50 rounded-xl text-slate-500 hover:text-teal-600 transition-colors" title="Probar link">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={saveNotebookLink}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <BookOpen size={14} /> Guardar y sincronizar
              </button>
              {notebookModal.url && (
                <button
                  onClick={() => {
                    if (!onBulkUpdateProjects) return;
                    const projTasks = projects.filter(p => p.project === notebookModal.projName);
                    const updated = projTasks.map(p => { const { notebookLink: _, ...rest } = p; return rest as typeof p; });
                    onBulkUpdateProjects(updated);
                    setNotebookModal(null);
                  }}
                  className="px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl transition-colors text-sm"
                  title="Borrar link"
                >
                  Borrar
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3">El link se guarda en todos los equipos vía Google Sheets</p>
          </div>
        </div>
      )}

      {activeKpiModal && (
        <KpiListModal 
          mode={activeKpiModal} 
          projects={visibleTasks} 
          grouped={grouped}
          uniqueProjects={uniqueProjects}
          hiddenProjects={hiddenProjects}
          onToggleVisibility={(pName: string) => {
             const next = new Set(hiddenProjects);
             if (next.has(pName)) next.delete(pName);
             else next.add(pName);
             setHiddenProjects(next);
             localStorage.setItem('v25_hidden_projects', JSON.stringify(Array.from(next)));
          }}
          onClose={() => setActiveKpiModal(null)} 
          onViewTask={(t: any) => { setActiveKpiModal(null); setViewTask(t); }} 
        />
      )}

      {activeProjectDashboard && (
        <ProjectDashboardModal
          projectName={activeProjectDashboard}
          grouped={grouped}
          onClose={() => setActiveProjectDashboard(null)}
        />
      )}

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
                     {(st.observation || st.closingNote || st.link || st.assignee) && (
                       <div className="pl-6 space-y-1.5 mt-1">
                         {st.assignee && <p className="text-[11px] font-bold text-slate-600 bg-slate-100 w-fit px-2 py-0.5 rounded flex items-center gap-1 mb-1"><User size={10} /> Delegado a: {st.assignee}</p>}
                         {st.observation && <p className="text-[11px] text-yellow-800 bg-yellow-50 border border-yellow-100 p-2 rounded">{st.observation}</p>}
                         {st.closingNote && (
                           <p className={`text-[11px] p-2 rounded border ${st.completed ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                              <span className="font-bold">{st.completed ? '✓ Cierre: ' : 'Actualización: '}</span>{st.closingNote}
                           </p>
                         )}
                         {st.link && <a href={st.link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 flex items-center gap-1 hover:underline w-fit mt-1"><ExternalLink size={10} /> Link adjunto</a>}
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

  const updateTaskFromSubtasks = (newSubtasks: ProjectSubtask[]) => {
    let newProgress = edited.progress;
    let newStatus = edited.status;
    
    if (newSubtasks.length > 0) {
      const completed = newSubtasks.filter(s => s.completed).length;
      newProgress = Math.round((completed / newSubtasks.length) * 100);
      
      if (newProgress === 100) newStatus = 'CERRADO';
      else if (newProgress > 0) newStatus = 'EN PROGRESO';
      else newStatus = 'PENDIENTE';
    }
    
    setEdited({
      ...edited,
      subtasks: newSubtasks,
      progress: newProgress,
      status: newStatus
    });
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const st: ProjectSubtask = { id: 'ST-' + Date.now(), text: newSubtask, completed: false, link: '', observation: '', assignee: '' };
    updateTaskFromSubtasks([...(edited.subtasks || []), st]);
    setNewSubtask("");
  };

  const updateSubtask = (stId: string, updates: Partial<ProjectSubtask>) => {
    const newSubtasks = edited.subtasks?.map(s => s.id === stId ? { ...s, ...updates } : s) || [];
    updateTaskFromSubtasks(newSubtasks);
  };

  const removeSubtask = (stId: string) => {
    const newSubtasks = edited.subtasks?.filter(s => s.id !== stId) || [];
    updateTaskFromSubtasks(newSubtasks);
  };

  const moveSubtask = (index: number, direction: 'up' | 'down') => {
    if (!edited.subtasks) return;
    const newSubtasks = [...edited.subtasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSubtasks.length) return;
    const temp = newSubtasks[index];
    newSubtasks[index] = newSubtasks[targetIndex];
    newSubtasks[targetIndex] = temp;
    updateTaskFromSubtasks(newSubtasks);
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
              {edited.subtasks?.map((st, idx) => (
                <div key={st.id} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm relative group">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                    <div className="flex bg-slate-100 rounded border border-slate-200 shadow-sm">
                      <button onClick={(e) => { e.preventDefault(); moveSubtask(idx, 'up'); }} disabled={idx === 0} className="px-1 py-0.5 text-slate-400 hover:text-blue-600 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Mover arriba"><ChevronUp size={12}/></button>
                      <button onClick={(e) => { e.preventDefault(); moveSubtask(idx, 'down'); }} disabled={idx === (edited.subtasks?.length || 0) - 1} className="px-1 py-0.5 text-slate-400 hover:text-blue-600 hover:bg-slate-200 border-l border-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Mover abajo"><ChevronDown size={12}/></button>
                    </div>
                    <button onClick={(e) => { e.preventDefault(); removeSubtask(st.id); }} className="text-gray-400 hover:text-white hover:bg-red-500 bg-gray-50 border border-gray-200 p-0.5 rounded shadow-sm transition-colors ml-1 mt-[-1px]"><X size={14} /></button>
                  </div>
                  
                  <div className="flex items-start gap-2 mb-3 mr-16">
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
                    <div className="flex flex-col gap-2">
                      <textarea value={st.observation || ''} onChange={e => updateSubtask(st.id, { observation: e.target.value })} placeholder="Instrucciones o detalles de la tarea..." className="w-full text-xs p-2 border border-gray-200 bg-gray-50 rounded-md outline-none focus:border-blue-400 min-h-[40px] resize-none" />
                      <input type="text" value={st.closingNote || ''} onChange={e => updateSubtask(st.id, { closingNote: e.target.value })} placeholder="Nota de cierre / Actualización..." className="w-full text-xs p-2 border border-blue-100 bg-blue-50/30 rounded-md outline-none focus:border-blue-400" />
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

const KpiListModal = ({ mode, projects, grouped, uniqueProjects, hiddenProjects, onToggleVisibility, onClose, onViewTask }: any) => {
  const isOverdue = (dateStr: string, status: string) => {
    if (status === 'CERRADO') return false;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      return d < new Date(new Date().setHours(0,0,0,0));
    }
    return false;
  };

  let title = "Detalles";
  let items: any[] = [];
  
  if (mode === 'proyectos') {
    title = "Proyectos Activos";
    items = (uniqueProjects || []).map((k: string) => ({ name: k, type: 'project' }));
  } else if (mode === 'completadas') {
    title = "Tareas Completadas";
    items = projects.filter((p: any) => p.status === 'CERRADO');
  } else if (mode === 'subtareas') {
    title = "Subtareas Completadas";
    projects.forEach((p: any) => {
      if (p.subtasks) {
         p.subtasks.forEach((st: any) => {
           if (st.completed) items.push({ ...st, type: 'subtask', project: p.project, phase: p.phase, parentTask: p.name });
         });
      }
    });
  } else if (mode === 'atrasadas') {
    title = "Tareas Atrasadas Críticas";
    items = projects.filter((p: any) => isOverdue(p.endDate, p.status));
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">{title} ({items.length})</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {items.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No hay elementos para mostrar.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item, idx) => (
                <li key={idx} className="p-4 rounded-xl border border-gray-100 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  {item.type === 'project' ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <FolderKanban size={20} className="text-blue-500" />
                        <span className="font-bold text-slate-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{!hiddenProjects?.has(item.name) ? 'Visible' : 'Oculto'}</span>
                        <div 
                          onClick={() => onToggleVisibility(item.name)}
                          className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${!hiddenProjects?.has(item.name) ? 'bg-blue-500' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${!hiddenProjects?.has(item.name) ? 'left-[22px]' : 'left-0.5'}`}></div>
                        </div>
                      </div>
                    </div>
                  ) : item.type === 'subtask' ? (
                     <div className="flex flex-col gap-1 w-full relative pl-8">
                       <CheckSquare size={16} className="text-teal-500 absolute left-0 top-1" />
                       <span className="font-bold text-slate-800 text-[13px]">{item.text}</span>
                       <div className="flex text-[10px] text-slate-500 gap-2">
                         <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold">PROYECTO: {item.project}</span>
                         <span className="italic">Tarea: {item.parentTask}</span>
                       </div>
                       {item.closingNote && <div className="text-[10px] bg-blue-50 text-blue-700 p-1.5 rounded mt-1 border border-blue-100">Cierre: {item.closingNote}</div>}
                     </div>
                  ) : (
                    <div className="flex flex-col gap-1 w-full" onClick={() => onViewTask(item)} role="button">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'CERRADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex text-xs text-slate-500 gap-4">
                        <span>{item.project} &gt; {item.phase}</span>
                        <span>{item.endDate}</span>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};


const ProjectDashboardModal = ({ projectName, grouped, onClose }: any) => {
  const [showDateRange, setShowDateRange] = React.useState(true);
  const mapList = grouped.map.get(projectName);
  if (!mapList) return null;

  const phases = Array.from(mapList.keys());
  const pm = grouped.pMeta.get(projectName)!;

  let totalP = 0, totalE = 0, totalC = 0;
  let totalSubtasks = 0, closedSubtasks = 0, overdueCount = 0;
  const phaseStats: any[] = [];

  const now = new Date(); now.setHours(0,0,0,0);

  for (const phaseName of phases) {
    const tasks = mapList.get(phaseName)!;
    const progressTotal = tasks.reduce((acc:any, t:any) => acc + (t.progress || 0), 0);
    const avgProg = tasks.length > 0 ? Math.round(progressTotal / tasks.length) : 0;
    const closedInPhase = tasks.filter((t:any) => t.status === 'CERRADO').length;
    phaseStats.push({ name: phaseName, progress: avgProg, total: tasks.length, closed: closedInPhase });

    tasks.forEach((t:any) => {
      if (t.status === 'CERRADO') totalC++;
      else if (t.status === 'EN PROGRESO') totalE++;
      else totalP++;

      if (t.subtasks) {
        totalSubtasks += t.subtasks.length;
        closedSubtasks += t.subtasks.filter((s:any) => s.completed).length;
      }

      // Overdue check
      if (t.status !== 'CERRADO' && t.endDate) {
        const parts = t.endDate.split('/');
        if (parts.length === 3) {
          const end = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          if (end < now) overdueCount++;
        }
      }
    });
  }

  const allTasksCount = totalP + totalE + totalC;
  const globalProgress = allTasksCount > 0 ? Math.round(pm.prog / pm.count) : 0;

  // Donut calc
  const pTotalC = allTasksCount > 0 ? (totalC / allTasksCount) * 100 : 0;
  const pTotalE = allTasksCount > 0 ? (totalE / allTasksCount) * 100 : 0;
  const closedDeg = (pTotalC / 100) * 360;
  const inProgDeg = (pTotalE / 100) * 360;
  const gradient = `conic-gradient(#10b981 0deg ${closedDeg}deg, #3b82f6 ${closedDeg}deg ${closedDeg + inProgDeg}deg, #e2e8f0 ${closedDeg + inProgDeg}deg 360deg)`;

  // Circular progress ring
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (globalProgress / 100) * circumference;

  const statusColor = globalProgress === 100 ? 'text-emerald-400' : globalProgress >= 60 ? 'text-blue-400' : globalProgress >= 30 ? 'text-amber-400' : 'text-red-400';
  const statusLabel = globalProgress === 100 ? 'COMPLETADO' : globalProgress >= 60 ? 'EN BUEN RITMO' : globalProgress >= 30 ? 'EN PROGRESO' : 'EN INICIO';

  const maxD = pm.maxD.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  const minD = pm.minD.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  // Date: es-ES locale produces all-lowercase in es-ES, just capitalize first letter
  const rawToday = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const todayDisplay = rawToday.charAt(0).toUpperCase() + rawToday.slice(1);


  const logoUrl = "https://drive.google.com/thumbnail?id=1BkFrIklMROkiE8ekHz3UpWjw7Yoo58dW&sz=h200";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* ── HEADER ── */}
        <div className="relative px-8 pt-6 pb-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white shrink-0 overflow-hidden">
          {/* Decorations */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-12 w-48 h-48 bg-indigo-500/10 rounded-full translate-y-1/2 pointer-events-none" />

          {/* Close button - top right, separate from ring */}
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-full transition-colors z-10">
            <X size={18} className="text-slate-400" />
          </button>

          <div className="relative flex items-center gap-6">
            {/* Logo – no background box, sized to match header height */}
            <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain shrink-0" referrerPolicy="no-referrer" />

            {/* Title block */}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.25em] mb-0.5">RESUMEN DE REPORTE EJECUTIVO</p>
              <h2 className="text-xl font-black uppercase tracking-wide leading-tight truncate">{projectName}</h2>
              <p className="text-slate-400 text-[10px] mt-1">{todayDisplay}</p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                  overdueCount > 0 ? 'border-red-400/50 bg-red-500/20 text-red-300' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                }`}>
                  {overdueCount > 0 ? `⚠ ${overdueCount} TAREA${overdueCount > 1 ? 'S' : ''} ATRASADA${overdueCount > 1 ? 'S' : ''}` : '✓ SIN ATRASOS'}
                </span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border border-blue-400/30 bg-blue-500/10 ${statusColor}`}>
                  ● {statusLabel}
                </span>
              </div>
            </div>

            {/* Progress Ring – bigger, with clear spacing from close btn */}
            <div className="relative shrink-0 mr-6 flex items-center justify-center" style={{ width: 130, height: 130 }}>
              <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90 absolute inset-0">
                <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
                <circle
                  cx="65" cy="65" r="54" fill="none"
                  stroke={globalProgress === 100 ? '#10b981' : globalProgress >= 60 ? '#60a5fa' : globalProgress >= 30 ? '#fbbf24' : '#f87171'}
                  strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={2 * Math.PI * 54 - (globalProgress / 100) * 2 * Math.PI * 54}
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
              </svg>
              <div className="flex flex-col items-center z-10">
                <span className="text-4xl font-black text-white leading-none">{globalProgress}%</span>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mt-1">progreso</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex flex-col gap-5">

          {/* ── TOP 4 KPI CARDS ── */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg shrink-0"><Layers size={20} /></div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Fases</p>
                <p className="text-2xl font-black text-slate-800">{phases.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-lg shrink-0"><CheckCircle2 size={20} /></div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Tareas Cerradas</p>
                <p className="text-2xl font-black text-slate-800">{totalC}<span className="text-xs font-medium text-slate-400">/{allTasksCount}</span></p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="bg-teal-100 text-teal-600 p-2.5 rounded-lg shrink-0"><CheckSquare size={20} /></div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Subtareas</p>
                <p className="text-2xl font-black text-slate-800">{closedSubtasks}<span className="text-xs font-medium text-slate-400">/{totalSubtasks}</span></p>
              </div>
            </div>
            <div className={`rounded-xl p-4 shadow-sm border flex items-center gap-3 hover:shadow-md transition-shadow ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
              <div className={`p-2.5 rounded-lg shrink-0 ${overdueCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}><AlertTriangle size={20} /></div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Atrasos</p>
                <p className={`text-2xl font-black ${overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{overdueCount}</p>
              </div>
            </div>
          </div>

          {/* ── DATES BANNER ── */}
          <div
            className={`rounded-xl px-5 py-3 shadow-sm border flex items-center justify-between shrink-0 transition-colors ${
              showDateRange ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100'
            }`}
            onClick={!showDateRange ? () => setShowDateRange(true) : undefined}
          >
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rango del Proyecto</span>
              {!showDateRange && (
                <span className="text-[9px] text-slate-400 italic ml-1">(oculto — clic para mostrar)</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {showDateRange && (
                <>
                  <span className="text-sm font-bold text-slate-700">{minD}</span>
                  <div className="relative h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{width: `${globalProgress}%`}} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700">{maxD}</span>
                    <span className="text-[9px] text-slate-400 font-medium ml-1.5">Fecha de referencia</span>
                  </div>
                </>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setShowDateRange(v => !v); }}
                className={`p-1 rounded-lg transition-colors ${
                  showDateRange
                    ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    : 'text-blue-500 bg-blue-50 hover:bg-blue-100'
                }`}
                title={showDateRange ? 'Ocultar rango del proyecto' : 'Mostrar rango del proyecto'}
              >
                {showDateRange ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* ── BOTTOM: Distribution + Phase Breakdown ── */}
          <div className="grid grid-cols-2 gap-5">

            {/* ── DISTRIBUCIÓN DE TAREAS – split layout ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 pt-4 pb-2 border-b border-slate-50">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Distribución de Tareas</h3>
              </div>
              <div className="p-4 flex items-center gap-4 h-full">

                {/* Main donut – tasks */}
                <div className="flex flex-col items-center gap-5 flex-1">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full" style={{ background: gradient, boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }} />
                    <div className="relative w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center shadow-lg z-10">
                      <span className="text-3xl font-black text-slate-800 leading-none">{allTasksCount}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">tareas</span>
                    </div>
                  </div>
                  <div className="w-full grid grid-cols-3 gap-1.5">
                    <div className="flex flex-col items-center gap-0.5 bg-emerald-50 py-1.5 px-1 rounded-lg border border-emerald-100">
                      <span className="text-base font-black text-emerald-600">{totalC}</span>
                      <div className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[8px] font-bold text-emerald-700 uppercase">Cerr.</span></div>
                      <span className="text-[9px] font-black text-emerald-500">{allTasksCount > 0 ? Math.round(totalC/allTasksCount*100) : 0}%</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 bg-blue-50 py-1.5 px-1 rounded-lg border border-blue-100">
                      <span className="text-base font-black text-blue-600">{totalE}</span>
                      <div className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /><span className="text-[8px] font-bold text-blue-700 uppercase">Prog.</span></div>
                      <span className="text-[9px] font-black text-blue-500">{allTasksCount > 0 ? Math.round(totalE/allTasksCount*100) : 0}%</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 bg-slate-50 py-1.5 px-1 rounded-lg border border-slate-200">
                      <span className="text-base font-black text-slate-500">{totalP}</span>
                      <div className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-300" /><span className="text-[8px] font-bold text-slate-500 uppercase">Pend.</span></div>
                      <span className="text-[9px] font-black text-slate-400">{allTasksCount > 0 ? Math.round(totalP/allTasksCount*100) : 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px bg-slate-100 self-stretch mx-1" />

                {/* Subtask info panel – no % to avoid confusion with header % */}
                {(() => {
                  const remainingSubtasks = totalSubtasks - closedSubtasks;
                  const fillPct = totalSubtasks > 0 ? (closedSubtasks / totalSubtasks) * 100 : 0;
                  const barColor = fillPct === 100 ? 'bg-emerald-500' : fillPct >= 50 ? 'bg-blue-500' : fillPct > 0 ? 'bg-amber-400' : 'bg-slate-200';
                  const allDone = remainingSubtasks === 0 && totalSubtasks > 0;
                  return (
                    <div className="flex flex-col gap-3 shrink-0 w-[88px]">
                      {/* Icon + label */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`p-2 rounded-lg ${allDone ? 'bg-emerald-100' : 'bg-teal-50'}`}>
                          <CheckSquare size={18} className={allDone ? 'text-emerald-500' : 'text-teal-500'} />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Subtareas</span>
                      </div>

                      {/* Big counter */}
                      <div className="text-center">
                        <p className="text-2xl font-black text-slate-800 leading-none">
                          {closedSubtasks}
                          <span className="text-sm font-bold text-slate-400"> / {totalSubtasks}</span>
                        </p>
                        <p className="text-[9px] text-slate-500 font-medium mt-0.5">completadas</p>
                      </div>

                      {/* Slim fill bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>

                      {/* Status label */}
                      <p className={`text-[9px] text-center font-bold ${allDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {allDone ? '✓ Todas listas' : `${remainingSubtasks} por cerrar`}
                      </p>
                    </div>
                  );
                })()}


              </div>
            </div>

            {/* ── AVANCE POR FASE – premium card ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 pt-4 pb-2 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Avance por Fase</h3>
                <span className="text-[9px] font-bold text-slate-400">{phaseStats.filter(p => p.progress === 100).length}/{phaseStats.length} completadas</span>
              </div>
              <div className="p-5 space-y-3">
                {phaseStats.map((ps:any, i:number) => {
                  const isComplete = ps.progress === 100;
                  const hasProgress = ps.progress > 0;
                  const barColor = isComplete ? 'from-emerald-400 to-emerald-500' : hasProgress ? 'from-blue-400 to-indigo-500' : 'from-slate-200 to-slate-300';
                  const bgCard = isComplete ? 'bg-emerald-50/60 border-emerald-100' : hasProgress ? 'bg-blue-50/40 border-blue-100' : 'bg-slate-50 border-slate-100';
                  const textNum = isComplete ? 'text-emerald-600' : hasProgress ? 'text-blue-600' : 'text-slate-400';

                  return (
                    <div key={i} className={`rounded-lg border p-3 ${bgCard}`}>
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <span className="text-[10px] font-bold text-slate-700 leading-tight" title={ps.name}>{ps.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-slate-400 font-medium">{ps.closed}/{ps.total}</span>
                          <span className={`text-[10px] font-black ${textNum}`}>
                            {isComplete ? '✓ 100%' : hasProgress ? `${ps.progress}%` : '—'}
                          </span>
                        </div>
                      </div>
                      {/* Segmented bar */}
                      <div className="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                          style={{ width: `${ps.progress}%` }}
                        />
                      </div>
                      {/* Mini task dots */}
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {Array.from({ length: ps.total }, (_, tidx) => (
                          <div
                            key={tidx}
                            className={`w-1.5 h-1.5 rounded-full ${tidx < ps.closed ? (isComplete ? 'bg-emerald-400' : 'bg-blue-400') : 'bg-slate-300/60'}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};




