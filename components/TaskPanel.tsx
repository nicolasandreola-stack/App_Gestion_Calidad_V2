import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Star, Edit2, Check, Trash2, User, ExternalLink, Filter, Calendar, Archive, Inbox, LayoutDashboard, List, Sun, ArrowRight, PauseCircle, PlayCircle, FolderCheck, Mail, GripVertical } from 'lucide-react';
import { Task, Category, Complexity, CATEGORY_COLORS, COMPLEXITY_LABELS } from '../types';

interface TaskPanelProps {
  tasks: Task[];
  onAdd: (task: Omit<Task, 'id' | 'prio' | 'note'>) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  
  // Modificado: Ahora solicitan modal
  onRequestComplete: (task: Task) => void;
  onRequestStandby: (task: Task) => void;

  onTogglePriority: (id: number) => void;
  onUpdateNote: (id: number, note: string) => void;
  onUpdateSubtasks: (id: number, subtasks: Task['subtasks']) => void;
  onReorder?: (draggedId: number, targetId: number) => void;
  onQuickSchedule?: (id: number, type: 'today' | 'tomorrow') => void;
  onOpenHistory: () => void;
  onOpenCompletedRegistry: () => void;
  onAdminQuery?: (task: Task) => void;
}

const TaskPanel: React.FC<TaskPanelProps> = ({ 
  tasks, onAdd, onEdit, onDelete, onRequestComplete, onRequestStandby, onTogglePriority, onUpdateNote, onUpdateSubtasks, onReorder, onQuickSchedule, onOpenHistory, onOpenCompletedRegistry, onAdminQuery
}) => {
  // View Mode: 'list' (Tabs) or 'matrix' (Eisenhower)
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');

  // Tabs: 'backlog' (Inbox/No Date) vs 'agenda' (Scheduled) - Only relevant in list mode
  const [activeTab, setActiveTab] = useState<'backlog' | 'agenda'>('agenda');

  // Input form state
  const [inputText, setInputText] = useState('');
  const [inputCat, setInputCat] = useState<Category>('SGI');
  const [inputComp, setInputComp] = useState<Complexity>('low');
  const [inputDate, setInputDate] = useState(''); // YYYY-MM-DD
  const [inputLink1, setInputLink1] = useState('');
  const [inputName1, setInputName1] = useState('');
  const [inputLink2, setInputLink2] = useState('');
  const [inputName2, setInputName2] = useState('');
  const [inputDelegate, setInputDelegate] = useState('');
  const [showDelegateInput, setShowDelegateInput] = useState(false);

  // Filter state
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all');
  const [filterComp, setFilterComp] = useState<Complexity | 'all'>('all');
  const [filterPrio, setFilterPrio] = useState(false);

  // Note expansion state
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<number | null>(null);
  const [dragGroup, setDragGroup] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: number, group: string) => {
    setDraggedTaskId(id);
    setDragGroup(group);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow drag image to generate before adding opacity
    setTimeout(() => {
      const el = document.getElementById(`task-${id}`);
      if (el) el.classList.add('opacity-50');
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, id: number, group: string) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    if (dragGroup === group && draggedTaskId !== id) {
      setDragOverTaskId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: number, group: string) => {
    e.preventDefault();
    if (dragGroup === group && draggedTaskId !== null && draggedTaskId !== targetId && onReorder) {
      onReorder(draggedTaskId, targetId);
    }
    setDragOverTaskId(null);
    setDraggedTaskId(null);
    setDragGroup(null);
  };

  const handleDragEnd = (e: React.DragEvent, id: number) => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragGroup(null);
    const el = document.getElementById(`task-${id}`);
    if (el) el.classList.remove('opacity-50');
  };

  const handleAdd = () => {
    if (!inputText.trim()) return;
    onAdd({
      text: inputText,
      cat: inputCat,
      comp: inputComp,
      date: inputDate || undefined,
      l1: inputLink1,
      n1: inputName1,
      l2: inputLink2,
      n2: inputName2,
      del: inputDelegate
    });
    // Reset form
    setInputText('');
    setInputLink1(''); setInputName1('');
    setInputLink2(''); setInputName2('');
    setInputDelegate('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const toggleNoteView = (id: number) => {
    const next = new Set(expandedNotes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNotes(next);
  };

  // --- Filtering Logic ---
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  // Common filter for both views
  const baseFilteredTasks = tasks.filter(t => {
    const matchCat = filterCat === 'all' || t.cat === filterCat;
    const matchComp = filterComp === 'all' || t.comp === filterComp;
    const matchPrio = !filterPrio || t.prio;
    return matchCat && matchComp && matchPrio;
  });

  // --- List View Logic ---
  const listFilteredTasks = baseFilteredTasks.filter(t => {
    const isScheduled = !!t.date;
    const matchTab = activeTab === 'agenda' ? isScheduled : !isScheduled;
    return matchTab;
  });

  const sortedTasks = [...listFilteredTasks].sort((a, b) => {
    if (a.prio !== b.prio) return a.prio ? -1 : 1; 
    if (activeTab === 'agenda') {
        if (a.date !== b.date) return (a.date || '') > (b.date || '') ? 1 : -1;
    }
    // Use the original array index to preserve manual reordering
    return tasks.indexOf(a) - tasks.indexOf(b); 
  });

  // --- Grouping for Agenda ---
  const groupAgendaTasks = () => {
      const groups: Record<string, Task[]> = { overdue: [], today: [], tomorrow: [], upcoming: [] };
      sortedTasks.forEach(t => {
          if (!t.date) return;
          if (t.date < todayStr) groups.overdue.push(t);
          else if (t.date === todayStr) groups.today.push(t);
          else {
              const tmrw = new Date();
              tmrw.setDate(tmrw.getDate() + 1);
              const tmrwStr = tmrw.toLocaleDateString('en-CA');
              if (t.date === tmrwStr) groups.tomorrow.push(t);
              else groups.upcoming.push(t);
          }
      });
      return groups;
  };
  const agendaGroups = activeTab === 'agenda' ? groupAgendaTasks() : null;

  // --- Eisenhower Matrix Logic (Improved V2) ---
  const getMatrixQuadrants = () => {
    const q1: Task[] = []; // Do (Important & Urgent) OR (Complex & Urgent)
    const q2: Task[] = []; // Plan (Important & Not Urgent) OR (Complex & Not Urgent)
    const q3: Task[] = []; // Delegate (Assigned) OR Quick (Low Comp)
    const q4: Task[] = []; // Eliminate/Backlog (Medium, No Prio, No Date)

    baseFilteredTasks.forEach(t => {
        const isPriority = t.prio;
        const isComplex = t.comp === 'high';
        const isQuick = t.comp === 'low';
        const isDelegated = !!t.del; 
        
        // Urgency: Today or Overdue
        const isUrgent = t.date ? t.date <= todayStr : false;

        // 1. DELEGATED tasks always go to Q3 (unless manual override logic, but simpler is better)
        if (isDelegated) {
            q3.push(t);
            return;
        }

        // 2. DO (HACER): Priority + Urgent OR Complex + Urgent
        // Si es compleja y vence hoy, hay que hacerla si o si.
        if ((isPriority || isComplex) && isUrgent) {
            q1.push(t);
            return;
        }

        // 3. PLAN (PLANIFICAR): Priority (Future/Backlog) OR Complex (Future/Backlog)
        // Las tareas complejas requieren planificación, así que van a Q2 si no son para hoy.
        if (isPriority || isComplex) {
            q2.push(t);
            return;
        }

        // 4. QUICK (RÁPIDO): Low Complexity (and not priority/urgent handled above)
        if (isQuick) {
            q3.push(t);
            return;
        }

        // 5. BACKLOG: Medium Complexity, Non-Priority, Future/NoDate, Not Delegated
        q4.push(t);
    });

    return { q1, q2, q3, q4 };
  };

  const matrixData = getMatrixQuadrants();

  // --- Render Helpers ---
  const renderTaskRow = (task: Task, minimal = false, group?: string) => {
    let badgeClass = '';
    let compText = COMPLEXITY_LABELS[task.comp];
    
    if (task.comp === 'low') badgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    else if (task.comp === 'med') badgeClass = 'bg-orange-50 text-orange-600 border border-orange-100';
    else badgeClass = 'bg-rose-50 text-rose-600 border border-rose-100';

    const isNoteOpen = expandedNotes.has(task.id);
    const isStandby = task.isStandby;
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const subtasksProgress = hasSubtasks ? (task.subtasks!.filter(s => s.completed).length / task.subtasks!.length) * 100 : 0;

    const isDragging = draggedTaskId === task.id;
    const isDragOver = dragOverTaskId === task.id;

    return (
      <div 
        key={task.id} 
        id={`task-${task.id}`}
        draggable={!!group}
        onDragStart={group ? (e) => handleDragStart(e, task.id, group) : undefined}
        onDragOver={group ? (e) => handleDragOver(e, task.id, group) : undefined}
        onDragLeave={group ? handleDragLeave : undefined}
        onDrop={group ? (e) => handleDrop(e, task.id, group) : undefined}
        onDragEnd={group ? (e) => handleDragEnd(e, task.id) : undefined}
        className={`border-b border-slate-100 last:border-0 group transition-all ${isStandby ? 'bg-amber-50/40' : 'bg-white'} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-t-2 border-t-blue-400 bg-blue-50/30' : ''}`}
      >
        <div className="flex items-center px-4 py-2 hover:bg-slate-50/80 transition-colors relative">
          {/* Drag Handle */}
          {group && (
            <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 mr-2 shrink-0" title="Arrastrar para reordenar">
              <GripVertical size={14} />
            </div>
          )}

          {/* Content */}
          <div 
            className={`flex-1 cursor-pointer flex items-center gap-2 text-[12px] overflow-hidden ${isStandby ? 'opacity-60 grayscale' : ''}`}
            onClick={() => toggleNoteView(task.id)}
          >
            {/* Priority Button */}
            <button 
              onClick={(e) => { e.stopPropagation(); onTogglePriority(task.id); }}
              className={`transition-transform hover:scale-125 shrink-0 ${task.prio ? 'text-accentYellow' : 'text-gray-300'}`}
              title="Prioridad"
            >
              <Star size={14} fill={task.prio ? "currentColor" : "none"} />
            </button>

            {/* Standby Button */}
            <button 
              onClick={(e) => { e.stopPropagation(); onRequestStandby(task); }}
              className={`transition-transform hover:scale-125 shrink-0 ${isStandby ? 'text-amber-500' : 'text-gray-300'}`}
              title={isStandby ? "Reanudar Tarea" : "Poner en Standby (Pausa)"}
            >
               {isStandby ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
            </button>

            {!minimal && (
                <span 
                className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white border-none shrink-0 opacity-90" 
                style={{ backgroundColor: CATEGORY_COLORS[task.cat] }}
                >
                {task.cat}
                </span>
            )}

            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 hidden sm:inline-block ${badgeClass}`}>
              {compText}
            </span>

            {/* Date Badge logic */}
            {task.date && (
                 <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-mono font-bold shrink-0 border ${task.date < todayStr ? 'text-red-600 bg-red-50 border-red-100' : task.date === todayStr ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>
                    {task.date === todayStr ? 'HOY' : task.date.slice(5)}
                 </span>
            )}

            {task.del && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1 shrink-0">
                  <User size={8} /> {task.del}
                </span>
            )}

            {/* Reduced to 11px */}
            <span className={`text-textPrimary hover:text-accentBlue font-normal flex items-center gap-1 min-w-0 ${minimal ? 'text-[11px]' : 'text-[11px]'} ${isStandby ? 'italic' : ''}`}>
               <span className="truncate">{task.text}</span>
               {hasSubtasks && (
                 <div className={`flex items-center gap-1.5 ml-1 px-1.5 py-0.5 rounded border shrink-0 transition-colors ${subtasksProgress === 100 ? 'bg-emerald-50 border-emerald-200 animate-pulse' : 'bg-gray-50 border-gray-100'}`}>
                   <span className={`text-[9px] font-medium ${subtasksProgress === 100 ? 'text-emerald-600' : 'text-gray-500'}`}>
                     {task.subtasks!.filter(s => s.completed).length}/{task.subtasks!.length}
                   </span>
                   <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                     <div 
                       className={`h-full transition-all duration-300 ${subtasksProgress === 100 ? 'bg-emerald-500' : 'bg-accentBlue'}`}
                       style={{ width: `${subtasksProgress}%` }}
                     />
                   </div>
                 </div>
               )}
            </span>
            
            {/* Standby Indicator Text */}
            {isStandby && <span className="text-[9px] text-amber-700 font-bold ml-1 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200">PAUSA</span>}

            {/* Admin Query Badge */}
            {task.del?.toLowerCase() === 'admin' && task.adminComments && onAdminQuery && (
              <button
                onClick={(e) => { e.stopPropagation(); onAdminQuery(task); }}
                className="ml-1 flex items-center gap-1 text-[9px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full font-bold hover:bg-purple-200 transition-colors shrink-0 animate-pulse"
                title="El Admin tiene una consulta sobre esta tarea"
              >
                💬 Consulta
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 pl-2 shrink-0">
            {task.l1 && !minimal && (
              <a href={task.l1} target="_blank" rel="noreferrer" className="text-[10px] text-accentBlue px-1 py-0.5 rounded hover:bg-blue-50 hover:underline font-medium max-w-[50px] truncate">
                {task.n1 || 'L1'}
              </a>
            )}
            {task.l2 && !minimal && (
              <a href={task.l2} target="_blank" rel="noreferrer" className="text-[10px] text-accentBlue px-1 py-0.5 rounded hover:bg-blue-50 hover:underline font-medium max-w-[50px] truncate">
                {task.n2 || 'L2'}
              </a>
            )}
            {task.l3 && !minimal && (
              <a href={task.l3} target="_blank" rel="noreferrer" className="text-[10px] text-accentBlue px-1 py-0.5 rounded hover:bg-blue-50 hover:underline font-medium max-w-[50px] truncate">
                {task.n3 || 'L3'}
              </a>
            )}
            
            <div className={`flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity ml-2 ${minimal ? 'scale-90' : ''}`}>
              {/* Quick Date Actions */}
              {onQuickSchedule && !isStandby && (
                <>
                   <button 
                     onClick={() => onQuickSchedule(task.id, 'today')} 
                     className="w-[22px] h-[22px] flex items-center justify-center border border-borderLight rounded bg-white text-orange-400 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                     title="Hacer Hoy"
                   >
                     <Sun size={10} />
                   </button>
                   <button 
                     onClick={() => onQuickSchedule(task.id, 'tomorrow')} 
                     className="w-[22px] h-[22px] flex items-center justify-center border border-borderLight rounded bg-white text-blue-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                     title="Pasar a Mañana"
                   >
                     <ArrowRight size={10} />
                   </button>
                </>
              )}

              <button onClick={() => onEdit(task)} className="w-[22px] h-[22px] flex items-center justify-center border border-borderLight rounded bg-white text-textSecondary hover:bg-gray-100 hover:text-textPrimary" title="Editar">
                <Edit2 size={10} />
              </button>
              <button onClick={() => onRequestComplete(task)} className="w-[22px] h-[22px] flex items-center justify-center border border-borderLight rounded bg-white text-textSecondary hover:bg-green-50 hover:text-green-600 hover:border-green-200" title="Completar y Archivar">
                <Check size={10} />
              </button>
              <button onClick={() => onDelete(task.id)} className="w-[22px] h-[22px] flex items-center justify-center border border-borderLight rounded bg-white text-textSecondary hover:bg-red-50 hover:text-red-600 hover:border-red-200" title="Eliminar">
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        </div>

        {/* Note Area */}
        {(isNoteOpen || isStandby) && (
        <div className={`px-4 py-2 border-b border-gray-100 ${isStandby ? 'bg-amber-50' : 'bg-[#FFFDE7]'}`}>
          
          {/* Standby Note Display */}
          {isStandby && (
              <div className="mb-2 text-xs text-amber-800 italic border-l-2 border-amber-300 pl-2">
                 <span className="font-bold not-italic">Motivo Pausa: </span> {task.standbyNote || 'Sin motivo'}
                 
                 {/* Links de Standby */}
                 {(task.standbyL1 || task.standbyL2) && (
                    <div className="flex gap-2 mt-1 not-italic">
                       {task.standbyL1 && (
                          <a href={task.standbyL1} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-amber-700 bg-white/50 px-1.5 py-0.5 rounded border border-amber-200 hover:bg-white">
                             <ExternalLink size={10} /> {task.standbyN1 || 'Link 1'}
                          </a>
                       )}
                       {task.standbyL2 && (
                          <a href={task.standbyL2} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-amber-700 bg-white/50 px-1.5 py-0.5 rounded border border-amber-200 hover:bg-white">
                             <ExternalLink size={10} /> {task.standbyN2 || 'Link 2'}
                          </a>
                       )}
                    </div>
                 )}
              </div>
          )}

          {/* Normal Note Editable */}
          {!isStandby && (
            <div className="flex flex-col gap-3">
              {/* Subtasks Section */}
              <div className="flex flex-col gap-1.5">
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {task.subtasks.map(st => (
                      <div key={st.id} className="flex items-center gap-2 group/st">
                        <input 
                          type="checkbox" 
                          checked={st.completed}
                          onChange={(e) => {
                            const newSubtasks = task.subtasks!.map(s => s.id === st.id ? { ...s, completed: e.target.checked } : s);
                            onUpdateSubtasks(task.id, newSubtasks);
                            
                            // Check if all subtasks are now completed
                            const allCompletedNow = newSubtasks.every(s => s.completed);
                            const allCompletedBefore = task.subtasks!.every(s => s.completed);
                            
                            if (allCompletedNow && !allCompletedBefore) {
                              confetti({
                                particleCount: 60,
                                spread: 60,
                                origin: { y: 0.8 },
                                colors: ['#10b981', '#3b82f6', '#f59e0b']
                              });
                            }
                          }}
                          className="w-3 h-3 text-accentBlue rounded border-gray-300 focus:ring-accentBlue cursor-pointer"
                        />
                        <input 
                          type="text"
                          value={st.text}
                          onChange={(e) => {
                            const newSubtasks = task.subtasks!.map(s => s.id === st.id ? { ...s, text: e.target.value } : s);
                            onUpdateSubtasks(task.id, newSubtasks);
                          }}
                          className={`text-[11px] flex-1 bg-transparent border border-transparent hover:border-gray-200 focus:border-accentBlue focus:bg-white px-1 py-0.5 rounded outline-none transition-colors ${st.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                        />
                        <button 
                          onClick={() => {
                            const newSubtasks = task.subtasks!.filter(s => s.id !== st.id);
                            onUpdateSubtasks(task.id, newSubtasks);
                          }}
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover/st:opacity-100 transition-opacity"
                          title="Eliminar subtarea"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input 
                  type="text"
                  placeholder="+ Agregar subtarea (Enter para guardar)"
                  className="w-full text-[11px] px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-accentBlue bg-transparent focus:bg-white transition-colors outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const newSubtask = { id: Date.now().toString(), text: e.currentTarget.value.trim(), completed: false };
                      const newSubtasks = [...(task.subtasks || []), newSubtask];
                      onUpdateSubtasks(task.id, newSubtasks);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>

              {/* Observations */}
              <textarea 
                className="w-full bg-transparent border-none text-[11px] text-gray-600 resize-y outline-none min-h-[30px] border-t border-gray-100 pt-2"
                placeholder="Observaciones..."
                value={task.note || ''}
                onChange={(e) => onUpdateNote(task.id, e.target.value)}
              />
            </div>
          )}
        </div>
      )}
      </div>
    );
  };

  // --- Custom Complexity Selector (Visual Soft) ---
  const ComplexitySelector = () => (
    <div className="flex gap-1 h-[28px] bg-white rounded border border-borderLight p-0.5">
       <button
         onClick={() => setInputComp('low')}
         className={`flex-1 px-2 rounded text-[10px] font-medium transition-colors ${inputComp === 'low' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
         title="Baja"
       >
         Rápida
       </button>
       <button
         onClick={() => setInputComp('med')}
         className={`flex-1 px-2 rounded text-[10px] font-medium transition-colors ${inputComp === 'med' ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
         title="Media"
       >
         Media
       </button>
       <button
         onClick={() => setInputComp('high')}
         className={`flex-1 px-2 rounded text-[10px] font-medium transition-colors ${inputComp === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
         title="Alta"
       >
         Compleja
       </button>
    </div>
  );

  return (
    <div className="flex-[1.5] flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden h-auto md:h-full shadow-sm transition-all duration-300">
      {/* ── HEADER ESTILO GANTT ── */}
      <div className="bg-slate-800 px-4 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Planificación de Tareas</span>
            {viewMode === 'matrix' && <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-bold">EISENHOWER</span>}
        </div>
        <div className="flex gap-1 items-center">
             <div className="flex items-center bg-white/10 rounded-lg p-0.5">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-300 hover:text-white'}`}
                    title="Vista Lista"
                >
                    <List size={13} />
                </button>
                <button 
                    onClick={() => setViewMode('matrix')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'matrix' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-300 hover:text-white'}`}
                    title="Vista Matriz Eisenhower"
                >
                    <LayoutDashboard size={13} />
                </button>
             </div>
             <button 
                onClick={onOpenCompletedRegistry}
                className="p-1.5 rounded-md hover:bg-white/20 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                title="Ver tareas finalizadas"
             >
                <FolderCheck size={13} />
             </button>
            <button 
                onClick={onOpenHistory}
                className="text-[10px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/20 transition-colors"
            >
                Log
            </button>
        </div>
      </div>

      {/* TABS SWITCHER (Only in List Mode) */}
      {viewMode === 'list' && (
        <div className="flex border-b border-gray-200 bg-white shrink-0">
            <button 
                onClick={() => setActiveTab('agenda')}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'agenda'
                    ? 'border-blue-500 text-blue-600 bg-blue-50/60'
                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
                <Calendar size={13} /> Agenda Planificada
            </button>
            <button 
                onClick={() => setActiveTab('backlog')}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'backlog'
                    ? 'border-blue-500 text-blue-600 bg-blue-50/60'
                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
                <Inbox size={13} /> Backlog / Caja
            </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-slate-50/60 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
          <Filter size={9} /> Filtrar:
        </span>
        <select 
          value={filterCat} 
          onChange={(e) => setFilterCat(e.target.value as any)}
          className="bg-white border border-slate-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-slate-600 cursor-pointer outline-none hover:border-slate-300 shadow-sm"
        >
          <option value="all">Todas</option>
          <option value="SGI">SGI</option>
          <option value="Ingenieria">Ingeniería</option>
          <option value="Tecnologia">Tecnología</option>
          <option value="OEA">OEA</option>
          <option value="Otro">Otro</option>
        </select>
        <select 
          value={filterComp} 
          onChange={(e) => setFilterComp(e.target.value as any)}
          className="bg-white border border-slate-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-slate-600 cursor-pointer outline-none hover:border-slate-300 shadow-sm"
        >
          <option value="all">Todas</option>
          <option value="low">Rápida</option>
          <option value="med">Media</option>
          <option value="high">Compleja</option>
        </select>
      </div>

      {/* Input Form */}
      <div className="bg-slate-50 p-4 border-b border-gray-200 flex flex-col gap-2 shrink-0">
        {/* Row 1 */}
        <div className="flex flex-col md:flex-row gap-2">
          <input 
            type="text" 
            placeholder="Nueva tarea..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full md:flex-[2] h-[28px] px-2 border border-borderLight rounded text-[12px] outline-none focus:border-accentBlue bg-white text-textPrimary placeholder:text-gray-400"
          />
          <div className="flex gap-2 w-full md:flex-1">
            <select 
                value={inputCat}
                onChange={(e) => setInputCat(e.target.value as Category)}
                className="flex-1 h-[28px] px-2 border border-borderLight rounded text-[12px] outline-none focus:border-accentBlue bg-white text-textPrimary"
            >
                <option value="SGI">SGI</option>
                <option value="Ingenieria">Ingeniería</option>
                <option value="Tecnologia">Tecnología</option>
                <option value="OEA">OEA</option>
                <option value="Otro">Otro</option>
            </select>
            
            {/* Custom Visual Complexity Selector */}
            <div className="flex-1">
                <ComplexitySelector />
            </div>
          </div>
        </div>
        
        {/* Row 2: Date & Links */}
        <div className="flex flex-col md:flex-row gap-2">
            {/* Date Input */}
            <div className="relative shrink-0 md:w-[140px]">
                <input 
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className={`w-full h-[28px] px-2 border rounded text-[12px] outline-none focus:border-accentBlue bg-white text-textPrimary ${!inputDate ? 'text-gray-400' : ''}`}
                    title="Fecha Programada (Opcional)"
                />
            </div>

            <div className="flex-1 grid grid-cols-2 gap-2">
                 <div className="flex gap-1 items-center relative">
                    <div className="relative flex-1">
                        <input 
                            type="url" 
                            placeholder="Link 1" 
                            value={inputLink1}
                            onChange={(e) => setInputLink1(e.target.value)}
                            className={`w-full h-[28px] px-2 border rounded text-[12px] outline-none focus:border-accentBlue bg-white border-borderLight text-textPrimary placeholder:text-gray-400`}
                        />
                    </div>
                 </div>
                 <div className="flex gap-1 items-center relative">
                    <div className="relative flex-1">
                        <input 
                            type="url" 
                            placeholder="Link 2" 
                            value={inputLink2}
                            onChange={(e) => setInputLink2(e.target.value)}
                            className={`w-full h-[28px] px-2 border rounded text-[12px] outline-none focus:border-accentBlue bg-white border-borderLight text-textPrimary placeholder:text-gray-400`}
                        />
                    </div>
                 </div>
            </div>
        </div>

        {/* Row 3: Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowDelegateInput(!showDelegateInput)}
              className="h-[28px] w-[28px] bg-white border border-borderLight rounded text-textSecondary hover:bg-gray-100 flex items-center justify-center"
              title="Delegar"
            >
              <User size={12} />
            </button>
            {showDelegateInput && (
              <input 
                type="text" 
                placeholder="Asignar a..." 
                value={inputDelegate}
                onChange={(e) => setInputDelegate(e.target.value)}
                className="w-[150px] md:w-[200px] h-[28px] px-2 border border-borderLight rounded text-[12px] outline-none focus:border-accentBlue bg-white text-textPrimary placeholder:text-gray-400 animate-in fade-in slide-in-from-left-2 duration-200"
                autoFocus
              />
            )}
            
            {/* Hint for where it goes */}
            <span className="text-[10px] text-textSecondary ml-2 italic">
               {viewMode === 'matrix' ? '➡ Se clasificará automáticamente.' : (inputDate ? '➡ Se agendará para la fecha.' : '➡ Se guardará en Backlog.')}
            </span>
          </div>
          <button 
            onClick={handleAdd}
            className="bg-accentBlue text-white border-none font-medium cursor-pointer px-4 rounded text-[10px] h-[28px] hover:bg-blue-700 transition-colors uppercase"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 md:overflow-y-auto no-scrollbar bg-white min-h-[300px] md:min-h-0">
        
        {/* === LIST VIEW === */}
        {viewMode === 'list' && (
           <>
            {activeTab === 'backlog' && (
                <div key="backlog" className="animate-in fade-in duration-500">
                    {sortedTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 opacity-60">
                            <Archive size={36} className="mb-3 text-slate-300" strokeWidth={1.5} />
                            <p className="text-[12px] font-medium">El backlog está vacío</p>
                            <p className="text-[10px] mt-1">Las tareas sin fecha caen acá.</p>
                        </div>
                    )}
                    {sortedTasks.map(t => renderTaskRow(t, false, 'backlog'))}
                </div>
            )}

            {activeTab === 'agenda' && agendaGroups && (
                <div key="agenda" className="pb-10 animate-in fade-in duration-500">
                    {/* Overdue */}
                    {agendaGroups.overdue.length > 0 && (
                        <div className="mb-0">
                            <div className="bg-red-50 border-y border-red-100 px-4 py-2 flex items-center gap-2 sticky top-0 z-10">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">⚠ Atrasadas</span>
                              <span className="ml-auto text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{agendaGroups.overdue.length}</span>
                            </div>
                            {agendaGroups.overdue.map(t => renderTaskRow(t, false, 'overdue'))}
                        </div>
                    )}

                    {/* Today */}
                    <div className="mb-0">
                        <div className="bg-blue-50 border-y border-blue-100 px-4 py-2 flex items-center gap-2 sticky top-0 z-10">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">📅 Hoy ({agendaGroups.today.length})</span>
                          <span className="ml-auto text-[9px] text-slate-400 font-mono">{todayStr}</span>
                        </div>
                        {agendaGroups.today.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400 opacity-60">
                                <Sun size={32} className="mb-2 text-amber-400/70" strokeWidth={1.5} />
                                <p className="text-[11px] font-medium mt-1">Todo listo por hoy</p>
                            </div>
                        )}
                        {agendaGroups.today.map(t => renderTaskRow(t, false, 'today'))}
                    </div>

                    {/* Tomorrow */}
                    {agendaGroups.tomorrow.length > 0 && (
                        <div className="mb-0">
                            <div className="bg-slate-100 border-y border-slate-200 px-4 py-2 flex items-center gap-2 sticky top-0 z-10">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">🔜 Mañana</span>
                              <span className="ml-auto text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{agendaGroups.tomorrow.length}</span>
                            </div>
                            {agendaGroups.tomorrow.map(t => renderTaskRow(t, false, 'tomorrow'))}
                        </div>
                    )}

                    {/* Upcoming */}
                    {agendaGroups.upcoming.length > 0 && (
                        <div className="mb-0">
                            <div className="bg-slate-50 border-y border-slate-200 px-4 py-2 flex items-center gap-2 sticky top-0 z-10">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">🗓️ Próximos Días</span>
                              <span className="ml-auto text-[9px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">{agendaGroups.upcoming.length}</span>
                            </div>
                            {agendaGroups.upcoming.map(t => renderTaskRow(t, false, 'upcoming'))}
                        </div>
                    )}
                </div>
            )}
           </>
        )}

        {/* === MATRIX VIEW (Eisenhower) === */}
        {viewMode === 'matrix' && (
            <div className="h-full p-2 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2">
                {/* Q1: Hacer (Urgent & Important) */}
                <div className="bg-red-50/30 border border-red-100 rounded-lg flex flex-col overflow-hidden">
                    <div className="px-3 py-2 bg-red-50 border-b border-red-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-red-800 uppercase">🔥 Hacer (Crítico)</span>
                        <span className="text-[10px] bg-red-100 text-red-800 px-1.5 rounded-full">{matrixData.q1.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                        {matrixData.q1.map(t => renderTaskRow(t, true, 'q1'))}
                        {matrixData.q1.length === 0 && <div className="text-[10px] text-red-300 text-center mt-4">¡Todo limpio!</div>}
                    </div>
                </div>

                {/* Q2: Planificar (Not Urgent & Important) */}
                <div className="bg-blue-50/30 border border-blue-100 rounded-lg flex flex-col overflow-hidden">
                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-blue-800 uppercase">📅 Planificar (Estratégico)</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 rounded-full">{matrixData.q2.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                         {matrixData.q2.map(t => renderTaskRow(t, true, 'q2'))}
                    </div>
                </div>

                {/* Q3: Delegar (Urgent & Not Important) */}
                <div className="bg-amber-50/30 border border-amber-100 rounded-lg flex flex-col overflow-hidden">
                    <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-800 uppercase">⚡ Delegar / Rápido</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 rounded-full">{matrixData.q3.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                        {matrixData.q3.map(t => renderTaskRow(t, true, 'q3'))}
                    </div>
                </div>

                {/* Q4: Eliminar/Caja (Not Urgent & Not Important) */}
                <div className="bg-gray-50/30 border border-gray-200 rounded-lg flex flex-col overflow-hidden">
                    <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-600 uppercase">📥 Caja / Backlog</span>
                        <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 rounded-full">{matrixData.q4.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                        {matrixData.q4.map(t => renderTaskRow(t, true, 'q4'))}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default TaskPanel;