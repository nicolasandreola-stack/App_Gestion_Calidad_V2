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
    showTaskDates: true,
    showProjectDates: true,
    undefinedEndDate: false
  });

  const logoUrl = "https://drive.google.com/thumbnail?id=1BkFrIklMROkiE8ekHz3UpWjw7Yoo58dW&sz=h200";

  // Filter and group by phase
  const targetProjects = projects.filter(p => p.project === projectName);
  const phasesMap = new Map<string, ProjectTask[]>();
  let totalTasks = 0;
  let completedTasks = 0;
  let minD = new Date('2099-12-31');
  let maxD = new Date('2000-01-01');

  targetProjects.forEach(task => {
    totalTasks++;
    if (task.status === 'CERRADO') completedTasks++;
    
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
            
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded border border-slate-200 cursor-pointer" onClick={() => setConfig({...config, showSubtasks: !config.showSubtasks})}>
              <input type="checkbox" checked={config.showSubtasks} readOnly className="w-4 h-4 text-blue-600 rounded" />
              <div>
                <p className="text-sm font-bold text-slate-700">Visualizar detalles y subtareas</p>
                <p className="text-[11px] text-slate-500">Incluir el desglose minucioso de cada fase.</p>
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
      <div className="w-full max-w-[210mm] mx-auto bg-white min-h-[297mm] my-8 shadow-2xl print:my-0 print:shadow-none print:max-w-full text-slate-800 p-12">
        
        {/* Document Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
          <img src={logoUrl} alt="Logo" className="h-14 object-contain" referrerPolicy="no-referrer" />
          <div className="text-right">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">REPORTE DE ESTADO</h1>
            <p className="text-slate-500 text-sm mt-1 capitalize">{currentDate}</p>
            <p className="text-slate-600 font-medium text-sm mt-1">Ref: {projectName}</p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-10 flex items-center gap-8">
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Proyecto en curso</p>
            <h2 className="text-2xl font-black text-blue-900">{projectName}</h2>
            {config.showProjectDates && (
               <p className="text-sm font-medium text-slate-500 mt-2 bg-slate-100 px-3 py-1 rounded inline-block">
                 <span className="text-slate-400">Rango:</span> {minDStr} al {config.undefinedEndDate ? 'No definida' : maxDStr}
               </p>
            )}
          </div>
          <div className="w-px h-12 bg-slate-200"></div>
          <div className="text-center px-4">
            <p className="text-3xl font-black text-slate-800">{totalTasks}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Tareas Totales</p>
          </div>
          <div className="w-px h-12 bg-slate-200"></div>
          <div className="text-center px-4">
            <p className="text-3xl font-black text-emerald-600">{overallProgress}%</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Progreso Global</p>
          </div>
        </div>

        {/* Phases Iteration */}
        <div className="space-y-8">
          {Array.from(phasesMap.entries()).map(([phaseName, tasks]) => {
            const phaseCompleted = tasks.filter(t => t.status === 'CERRADO').length;
            const phasePct = Math.round((phaseCompleted / tasks.length) * 100);

            return (
              <div key={phaseName} className="break-inside-avoid">
                {/* Phase Header */}
                <div className="flex items-center gap-4 border-b border-slate-300 pb-2 mb-4">
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-wide flex-1 flex items-center gap-2">
                    <Layers size={16} className="text-slate-400" /> {phaseName}
                  </h3>
                  <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                    Gantt: {phasePct}%
                  </span>
                </div>

                {/* Tasks List */}
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
                            <h4 className={`text-sm font-bold ${t.status === 'CERRADO' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                              {t.name}
                            </h4>
                            {t.assignee && (
                              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
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
                            <span className="text-[9px] text-slate-400 font-medium">
                              {t.startDate} al {t.endDate}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Task Description (if any) */}
                      {t.details && config.showSubtasks && (
                        <div className="ml-10 mb-3 text-[11px] text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
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
                                <p className={`text-[11px] font-medium ${st.completed ? 'text-slate-400' : 'text-slate-700'}`}>
                                  {st.text}
                                </p>
                                
                                {/* Subtask Observations / Details */}
                                {(st.observation || st.closingNote) && (
                                  <div className="mt-1 space-y-1">
                                    {st.observation && (
                                      <p className="text-[10px] text-slate-600 bg-yellow-50/50 p-1.5 border-l-2 border-yellow-300">
                                        {st.observation}
                                      </p>
                                    )}
                                    {st.closingNote && (
                                      <p className={`text-[10px] p-1.5 border-l-2 ${st.completed ? 'bg-emerald-50/50 border-emerald-300 text-emerald-800' : 'bg-slate-50/50 border-slate-300 text-slate-600'}`}>
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
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-slate-200 text-center">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-relaxed">
              Reporte generado por <span className="font-bold text-slate-500">{config.generatorName || 'Usuario'}</span> | Plataforma Dashboard <br/>
              {currentDate}
            </p>
        </div>

      </div>
    </div>
  );
}
