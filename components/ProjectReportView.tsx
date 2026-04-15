import React, { useState } from 'react';
import { ProjectTask, ProjectSubtask } from '../types';
import { Layers, CheckCircle2, Circle, User, X, FileText, Printer, Settings } from 'lucide-react';

interface ProjectReportViewProps {
  projectName: string;
  projects: ProjectTask[];
  onClose: () => void;
}

const parseObjDate = (dStr: string) => {
  if (!dStr) return new Date();
  const p = dStr.includes('/') ? dStr.split('/') : dStr.split('-');
  if (dStr.includes('/')) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
};

export default function ProjectReportView({ projectName, projects, onClose }: ProjectReportViewProps) {
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [config, setConfig] = useState({
    generatorName: 'Nicolas Andreola',
    showSubtasks: true,
    showSubtaskDetails: true,
    showTaskDates: true,
    showProjectDates: true,
    undefinedEndDate: false,
    excludedPhases: [] as string[]
  });

  const logoUrl = "https://drive.google.com/thumbnail?id=1BkFrIklMROkiE8ekHz3UpWjw7Yoo58dW&sz=h200";

  // Filter and group by phase
  const targetProjects = projects.filter(p => p.project === projectName);
  const phasesMap = new Map<string, ProjectTask[]>();
  let totalTasks = 0;
  let completedTasks = 0;
  let totalSubtasks = 0;
  let minD = new Date('2099-12-31');
  let maxD = new Date('2000-01-01');

  targetProjects.forEach(task => {
    totalTasks++;
    if (task.status === 'CERRADO') completedTasks++;
    if (task.subtasks) totalSubtasks += task.subtasks.length;
    
    const s = parseObjDate(task.startDate);
    const e = parseObjDate(task.endDate);
    if (s < minD) minD = s;
    if (e > maxD) maxD = e;

    if (!phasesMap.has(task.phase)) {
      phasesMap.set(task.phase, []);
    }
    phasesMap.get(task.phase)!.push(task);
  });

  const minDStr = minD.toLocaleDateString('es-ES');
  const maxDStr = maxD.toLocaleDateString('es-ES');

  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Generate Task Codes Map to be consistent
  const taskCodes = new Map<string, string>();
  let phaseIdx = 0;
  Array.from(phasesMap.entries()).forEach(([phaseName, phaseTasks]) => {
    const phaseLetter = String.fromCharCode(65 + phaseIdx);
    phaseTasks.forEach((t, taskIdx) => {
      taskCodes.set(t.id, `${phaseLetter}${taskIdx + 1}`);
    });
    phaseIdx++;
  });

  if (isConfiguring) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md my-auto border-t-4 border-blue-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="text-blue-500" /> Parámetros del Reporte
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Generado por (Nombre)</label>
              <input type="text" value={config.generatorName} onChange={e => setConfig({...config, generatorName: e.target.value})} className="w-full px-3 py-2 border border-yellow-400 bg-yellow-50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-800" placeholder="Ej: Nicolas Andreola" />
            </div>
            
            <div className="flex items-start gap-3 bg-slate-50 p-3 rounded border border-slate-200">
              <input type="checkbox" checked={config.showSubtasks} onChange={() => setConfig({...config, showSubtasks: !config.showSubtasks})} className="w-4 h-4 text-blue-600 rounded mt-1 cursor-pointer" />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700 cursor-pointer" onClick={() => setConfig({...config, showSubtasks: !config.showSubtasks})}>Visualizar nombre de subtareas</p>
                <p className="text-[11px] text-slate-500 cursor-pointer" onClick={() => setConfig({...config, showSubtasks: !config.showSubtasks})}>Muestra la lista de acciones dentro de cada tarea.</p>
                {config.showSubtasks && (
                  <label className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 cursor-pointer">
                    <input type="checkbox" checked={config.showSubtaskDetails} onChange={() => setConfig({...config, showSubtaskDetails: !config.showSubtaskDetails})} className="w-3 h-3 text-blue-600 rounded" />
                    <span className="text-[11px] font-bold text-slate-600">Visualizar detalle de subtareas (Observaciones y actualizaciones)</span>
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded border border-slate-200 cursor-pointer" onClick={() => setConfig({...config, showTaskDates: !config.showTaskDates})}>
              <input type="checkbox" checked={config.showTaskDates} readOnly className="w-4 h-4 text-blue-600 rounded" />
              <div>
                <p className="text-sm font-bold text-slate-700">Incluir fechas en tareas</p>
                <p className="text-[11px] text-slate-500">Muestra el rango de duración de la tarea bajo su estado.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 p-3 rounded border border-slate-200">
              <input type="checkbox" checked={config.showProjectDates} onChange={() => setConfig({...config, showProjectDates: !config.showProjectDates})} className="w-4 h-4 text-blue-600 rounded mt-1 cursor-pointer" />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700 cursor-pointer" onClick={() => setConfig({...config, showProjectDates: !config.showProjectDates})}>Rango estimado del proyecto</p>
                <p className="text-[11px] text-slate-500 cursor-pointer" onClick={() => setConfig({...config, showProjectDates: !config.showProjectDates})}>Muestra la fecha de inicio a fin calculadas globalmente.</p>
                {config.showProjectDates && (
                  <label className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 cursor-pointer">
                    <input type="checkbox" checked={config.undefinedEndDate} onChange={() => setConfig({...config, undefinedEndDate: !config.undefinedEndDate})} className="w-3 h-3 text-blue-600 rounded" />
                    <span className="text-[11px] font-bold text-red-600">Proteger fecha fin (Mostrar "No definida")</span>
                  </label>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded border border-slate-200">
              <p className="text-sm font-bold text-slate-700">Fases a profundizar en listado</p>
              <p className="text-[11px] text-slate-500 mb-2">Selecciona las fases de las cuales mostrar el listado completo de tareas. Las fases desmarcadas mostrarán únicamente su título, progreso y total de tareas colapsadas.</p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {Array.from(phasesMap.keys()).map(phase => (
                  <label key={phase} className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-slate-200 rounded hover:bg-blue-50 transition-colors">
                    <input type="checkbox" checked={!config.excludedPhases.includes(phase)} onChange={() => {
                      let next = [...config.excludedPhases];
                      if (next.includes(phase)) next = next.filter(p => p !== phase);
                      else next.push(phase);
                      setConfig({...config, excludedPhases: next});
                    }} className="w-4 h-4 rounded text-blue-600 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-slate-700 truncate" title={phase}>{phase}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => setIsConfiguring(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors flex justify-center items-center gap-2">
            <FileText size={18} /> Generar Vista Previa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm overflow-y-auto print:bg-white print:overflow-visible">
      {/* Action Bar (Hidden on print) */}
      <div className="sticky top-0 w-full bg-slate-800 text-white p-4 shadow-lg flex justify-between items-center print:hidden z-10">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-blue-400" />
          <h2 className="font-bold flex items-center gap-2">Reporte Generado <span className="text-blue-400 font-normal">| {projectName}</span></h2>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-bold transition-colors shadow-md"
          >
            <Printer size={16} /> Guardar como PDF
          </button>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* A4 Paper Canvas */}
      <div className="w-full max-w-[210mm] mx-auto bg-white min-h-[297mm] my-8 shadow-2xl print:my-0 print:shadow-none print:max-w-full text-slate-800 p-12 print:color-adjust-exact print:[-webkit-print-color-adjust:exact]">
        
        {/* Document Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5 mb-8">
          <div className="flex flex-col justify-center">
            <img src={logoUrl} alt="Logo" className="h-[110px] object-contain self-start" referrerPolicy="no-referrer" />
          </div>
          <div className="text-right flex flex-col items-end">
            <h2 className="text-[14px] font-black text-[#ED3833] uppercase tracking-widest mb-0.5">CALIDAD Y NUEVAS TECNOLOGÍAS</h2>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">REPORTE DE ESTADO</h1>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">
              Generado por <span className="text-slate-800">{config.generatorName || 'Usuario'}</span>
            </p>
            <p className="text-slate-500 text-sm mt-1 capitalize">{currentDate}</p>
            <p className="text-slate-600 font-medium text-sm mt-1">Ref: {projectName}</p>
          </div>
        </div>

        {/* Project Context & Global Stats Row */}
        <div className="flex items-end justify-between gap-6 mb-8 mt-2">
          
          <div className="flex-1 max-w-[55%]">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Proyecto en curso</p>
            <h2 className="text-2xl font-black text-blue-900 leading-tight mb-2 pr-4 break-words">{projectName}</h2>
            {config.showProjectDates && (
              <p className="text-[10px] text-slate-500 mt-1">
                <span className="font-bold text-slate-400 uppercase tracking-widest mr-1">Rango:</span> 
                {minDStr} al {config.undefinedEndDate ? '"Fecha no definida aún"' : maxDStr}
              </p>
            )}
          </div>
          
          {/* KPI Cards */}
          <div className="flex items-center gap-3">
             <div className="text-center px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 min-w-[80px]">
               <p className="text-2xl font-black text-slate-800 leading-none">{phasesMap.size}</p>
               <p className="text-[9px] uppercase font-bold text-slate-400 mt-1.5">Fases</p>
             </div>
             <div className="text-center px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 min-w-[80px]">
               <p className="text-2xl font-black text-slate-800 leading-none">{totalTasks}</p>
               <p className="text-[9px] uppercase font-bold text-slate-400 mt-1.5">Tareas</p>
             </div>
             <div className="text-center px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 min-w-[90px]">
               <p className="text-2xl font-black text-amber-500 leading-none">{totalSubtasks}</p>
               <p className="text-[9px] uppercase font-bold text-slate-400 mt-1.5">Subtareas</p>
             </div>
             <div className="text-center px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-200 min-w-[90px]">
               <p className="text-2xl font-black text-emerald-600 leading-none">{overallProgress}%</p>
               <p className="text-[9px] uppercase font-bold text-emerald-800 mt-1.5">Progreso</p>
             </div>
          </div>

        </div>

        {/* Phase Progress Bars */}
        <div className="mb-10 text-slate-800 break-inside-avoid bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
           <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-5">Métricas por Fase</h3>
           <div className="grid grid-cols-3 gap-x-8 gap-y-5 px-2">
             {Array.from(phasesMap.entries()).map(([phaseName, phaseTasks]) => {
                const pComplete = phaseTasks.filter(t => t.status === 'CERRADO').length;
                const pPct = phaseTasks.length > 0 ? Math.round((pComplete / phaseTasks.length) * 100) : 0;
                return (
                   <div key={`metric-${phaseName}`}>
                     <div className="flex justify-between items-end mb-1.5">
                       <p className="text-[11px] font-bold text-slate-600 truncate pr-2">{phaseName}</p>
                       <p className="text-[11px] font-black text-slate-800">{pPct}%</p>
                     </div>
                     <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 rounded-full transition-all" style={{width: `${pPct}%`}}></div>
                     </div>
                   </div>
                );
             })}
           </div>
        </div>


        {/* Section Divider */}
        <div className="flex items-center gap-4 mb-6 mt-16 break-inside-avoid print:mt-10">
          <div className="h-[2px] bg-slate-100 flex-1"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">Desglose Operativo</p>
          <div className="h-[2px] bg-slate-100 flex-1"></div>
        </div>

        {/* Phases Iteration */}
        <div className="space-y-6">
          {Array.from(phasesMap.entries()).map(([phaseName, tasks]) => {
            const phaseCompleted = tasks.filter(t => t.status === 'CERRADO').length;
            const phasePct = Math.round((phaseCompleted / tasks.length) * 100);

            return (
              <div key={phaseName} className="break-inside-avoid">
                {/* Phase Header */}
                <div className="flex items-center gap-4 border-b border-slate-300 pb-2 mb-4">
                  <h3 className="text-base font-black text-black uppercase tracking-wide flex-1 flex items-center gap-2">
                    <Layers size={16} className="text-slate-400" /> {phaseName}
                  </h3>
                  <span className="text-sm font-black text-black tracking-wide pr-2">
                    Gantt: {phasePct}%
                  </span>
                </div>

                {/* Tasks List */}
                {config.excludedPhases.includes(phaseName) ? (
                  <div className="py-1.5 pl-4 border-l-2 border-slate-100 text-[10px] font-bold text-slate-500 tracking-wide">
                    {tasks.length} TAREAS ADJUNTAS - DETALLE OMITIDO EN ESTE REPORTE
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map(t => (
                      <div key={t.id} className="pl-2 border-l-2 border-slate-200 break-inside-avoid">
                        
                        {/* Task Header */}
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="flex items-start gap-3">
                            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-0.5 shrink-0">
                              {taskCodes.get(t.id)}
                            </span>
                            <div>
                              <h4 className={`text-[15px] font-bold ${t.status === 'CERRADO' ? 'text-slate-700' : 'text-slate-800'}`}>
                                {t.name}
                              </h4>
                              {t.assignee && (
                                <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                                  <User size={10} /> Delegado a: <span className="font-bold text-slate-700">{t.assignee}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${t.status === 'CERRADO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : t.status === 'EN PROGRESO' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                              {t.status}
                            </span>
                            {config.showTaskDates && (
                              <span className="text-[9px] text-slate-500 font-medium">
                                {t.startDate} al {t.endDate}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Main Task Description (if any) */}
                        {t.details && config.showSubtaskDetails && (
                          <div className="ml-10 mb-3 text-[12px] text-slate-700 bg-slate-50 p-3 rounded border border-slate-100">
                            {t.details}
                          </div>
                        )}

                        {/* Subtasks */}
                        {t.subtasks && t.subtasks.length > 0 && config.showSubtasks && (
                          <div className="ml-10 space-y-2 mt-2">
                            {t.subtasks.map(st => (
                              <div key={st.id} className="flex gap-2">
                                <span className="mt-[3px] shrink-0">
                                  {st.completed ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Circle size={12} className="text-slate-300" />}
                                </span>
                                <div className="flex-1">
                                  <p className={`text-[12px] ${st.completed ? 'text-slate-600' : 'text-slate-800'}`}>
                                    {st.text}
                                  </p>
                                  
                                  {/* Subtask Observations / Details */}
                                  {(st.observation || st.closingNote) && config.showSubtaskDetails && (
                                    <div className="mt-1 space-y-1">
                                      {st.observation && (
                                        <p className="text-[11px] text-slate-700 bg-yellow-50/50 p-1.5 border-l-2 border-yellow-300">
                                          {st.observation}
                                        </p>
                                      )}
                                      {st.closingNote && (
                                        <p className={`text-[11px] p-1.5 border-l-2 ${st.completed ? 'bg-emerald-50/50 border-emerald-300 text-emerald-800' : 'bg-slate-50/50 border-slate-300 text-slate-700'}`}>
                                          <span className="font-bold">{st.completed ? 'Cierre: ' : 'Actualización: '}</span>
                                          {st.closingNote}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-slate-200 text-center">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest leading-relaxed">
              Calidad y nuevas tecnologías <br/>
              {currentDate}
            </p>
        </div>

      </div>
    </div>
  );
}
