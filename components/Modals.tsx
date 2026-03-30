import React, { useState, useEffect } from 'react';
import { Task, RoutineItem, HistoryEntry, Category, Complexity, TimeBlock, TIME_BLOCKS, Achievement } from '../types';
import { Sunrise, Sun, Utensils, Moon, Edit2, RotateCcw, Search, Archive, Link as LinkIcon, ExternalLink, CheckCircle2, Circle, AlertCircle, Clock, Check, Trophy, BarChart2 } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* --- Shared Modal Shell --- */
const ModalShell: React.FC<{ title: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; width?: string }> = ({ title, onClose, children, footer, width = "w-[500px]" }) => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
    <div className={`bg-white border border-borderLight shadow-2xl rounded-lg ${width} max-h-[90vh] flex flex-col p-5`}>
      <h3 className="mt-0 font-semibold text-[15px] text-textPrimary border-b border-borderLight pb-2.5 mb-4">{title}</h3>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </div>
      {footer && <div className="mt-5 pt-3 border-t border-borderLight flex justify-end gap-2">{footer}</div>}
    </div>
  </div>
);

// Helper for Icons
const getBlockIcon = (block: TimeBlock) => {
    switch (block) {
      case 'start': return <Sunrise size={14} />;
      case 'mid': return <Sun size={14} />;
      case 'noon': return <Utensils size={14} />;
      case 'end': return <Moon size={14} />;
      default: return <Sun size={14} />;
    }
};

/* --- KPI Details Modal (Admin View) --- */
interface KPIDetailsModalProps {
    title: string;
    type: 'routine' | 'tasks_completed' | 'tasks_active';
    data: any[]; // Puede ser RoutineItem[] o Task[]
    routineState?: any; // Solo para tipo rutina
    onClose: () => void;
}

export const KPIDetailsModal: React.FC<KPIDetailsModalProps> = ({ title, type, data, routineState, onClose }) => {
    return (
        <ModalShell
            title={title}
            onClose={onClose}
            footer={<button onClick={onClose} className="bg-transparent border border-borderLight text-textSecondary px-3 py-1.5 rounded text-sm hover:bg-gray-50">Cerrar</button>}
        >
            <div className="flex flex-col gap-3">
                {data.length === 0 && <p className="text-gray-400 text-sm text-center italic py-4">No hay ítems en esta categoría.</p>}
                
                {/* LISTA DE RUTINA */}
                {type === 'routine' && data.map((item: RoutineItem) => {
                    const isDone = routineState[item.id]?.done;
                    const note = routineState[item.id]?.note;
                    return (
                        <div key={item.id} className="flex flex-col border border-gray-100 rounded-lg p-2 bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className={isDone ? "text-green-600" : "text-gray-300"}>
                                    {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </div>
                                <span className={`text-sm ${isDone ? 'text-gray-600 font-medium' : 'text-textPrimary'}`}>{item.text}</span>
                            </div>
                            {note && (
                                <div className="ml-8 mt-1 text-xs text-gray-500 italic bg-white p-1.5 rounded border border-gray-100">
                                    "{note}"
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* LISTA DE TAREAS COMPLETADAS (Con detalle de cierre) */}
                {type === 'tasks_completed' && data.map((task: Task) => (
                    <div key={task.id} className="border border-green-100 bg-green-50/30 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-1">
                             <span className="text-xs font-bold text-gray-700 bg-white px-1.5 rounded border border-gray-200">{task.cat}</span>
                             {task.del === 'Admin' && <span className="text-[10px] bg-gray-800 text-white px-1.5 rounded font-bold">ASIGNADA ADMIN</span>}
                        </div>
                        <div className="text-sm font-medium text-textPrimary mb-2">{task.text}</div>
                        
                        {/* Detalle de Cierre */}
                        {(task.closingNote || task.closingL1 || task.closingL2) ? (
                            <div className="bg-white p-2 rounded border border-gray-200 text-xs">
                                {task.closingNote && (
                                    <div className="mb-1 text-gray-600">
                                        <span className="font-bold text-gray-400 text-[10px] uppercase mr-1">Cierre:</span>
                                        {task.closingNote}
                                    </div>
                                )}
                                <div className="flex gap-2 mt-1">
                                    {task.closingL1 && (
                                        <a href={task.closingL1} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                            <ExternalLink size={10} /> {task.closingN1 || 'Link 1'}
                                        </a>
                                    )}
                                    {task.closingL2 && (
                                        <a href={task.closingL2} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                            <ExternalLink size={10} /> {task.closingN2 || 'Link 2'}
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-[10px] text-gray-400 italic">Sin notas de cierre.</div>
                        )}
                    </div>
                ))}

                {/* LISTA DE TAREAS ACTIVAS (Vencidas, Standby, Cuello) */}
                {type === 'tasks_active' && data.map((task: Task) => (
                     <div key={task.id} className={`border rounded-lg p-3 ${task.isStandby ? 'bg-gray-50 border-gray-200' : 'bg-white border-borderLight'}`}>
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex gap-1 items-center">
                                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-1.5 rounded">{task.cat}</span>
                                {task.prio && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded font-bold">★ PRIO</span>}
                            </div>
                            {task.date && <span className="text-[10px] font-mono text-gray-500">{task.date}</span>}
                        </div>
                        <div className={`text-sm font-medium ${task.isStandby ? 'text-gray-500 italic' : 'text-textPrimary'} mb-2`}>{task.text}</div>
                        
                        {task.isStandby && task.standbyNote && (
                            <div className="bg-amber-50 p-2 rounded border border-amber-100 text-xs text-amber-800">
                                <span className="font-bold mr-1">Motivo Standby:</span> {task.standbyNote}
                            </div>
                        )}
                        
                        {!task.isStandby && task.note && (
                             <div className="text-xs text-gray-500 italic bg-gray-50 p-1.5 rounded">"{task.note}"</div>
                        )}
                     </div>
                ))}
            </div>
        </ModalShell>
    );
}

/* --- Note Action Modal (For Closing or Standby with Links) --- */
interface NoteActionModalProps {
  title: string;
  description: string;
  placeholder: string;
  initialValue?: string;
  onConfirm: (note: string, links: {l1:string, n1:string, l2:string, n2:string}) => void;
  onClose: () => void;
}

export const NoteActionModal: React.FC<NoteActionModalProps> = ({ title, description, placeholder, initialValue = "", onConfirm, onClose }) => {
  const [note, setNote] = useState(initialValue);
  
  // Links de referencia
  const [l1, setL1] = useState("");
  const [n1, setN1] = useState("");
  const [l2, setL2] = useState("");
  const [n2, setN2] = useState("");

  const handleConfirm = () => {
      onConfirm(note, { l1, n1, l2, n2 });
  };

  return (
    <ModalShell
      title={title}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="bg-transparent border border-borderLight text-textSecondary px-3 py-1.5 rounded text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={handleConfirm} className="bg-accentBlue text-white border-none px-3 py-1.5 rounded text-sm font-bold hover:bg-blue-700">Confirmar</button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
            <p className="text-xs text-textSecondary mb-2">{description}</p>
            <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={placeholder}
            className="w-full h-20 p-2 border border-borderLight rounded text-sm outline-none focus:border-accentBlue bg-gray-50 resize-none"
            />
        </div>
        
        <div className="bg-gray-50 p-3 rounded border border-gray-100">
            <span className="text-[10px] font-bold text-textSecondary uppercase block mb-2">Referencias (Opcional)</span>
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <input placeholder="URL Link 1 (Ej: Mail enviado)" value={l1} onChange={e => setL1(e.target.value)} className="flex-[2] px-2 py-1.5 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white" />
                    <input placeholder="Nombre" value={n1} onChange={e => setN1(e.target.value)} className="flex-1 px-2 py-1.5 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white" />
                </div>
                <div className="flex gap-2">
                    <input placeholder="URL Link 2 (Ej: Carpeta Drive)" value={l2} onChange={e => setL2(e.target.value)} className="flex-[2] px-2 py-1.5 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white" />
                    <input placeholder="Nombre" value={n2} onChange={e => setN2(e.target.value)} className="flex-1 px-2 py-1.5 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white" />
                </div>
            </div>
        </div>
      </div>
    </ModalShell>
  );
};

/* --- Completed Tasks Modal (Registry) --- */
interface CompletedTasksModalProps {
  tasks: Task[];
  onRestore: (task: Task) => void;
  onClose: () => void;
}

export const CompletedTasksModal: React.FC<CompletedTasksModalProps> = ({ tasks, onRestore, onClose }) => {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all');

  const filtered = tasks.filter(t => {
      const s = search.toLowerCase();
      // Buscar en titulo, categoria, notas internas y notas de cierre
      const matchesSearch = 
        t.text.toLowerCase().includes(s) || 
        t.cat.toLowerCase().includes(s) || 
        (t.note && t.note.toLowerCase().includes(s)) ||
        (t.closingNote && t.closingNote.toLowerCase().includes(s));
      
      const matchesCategory = catFilter === 'all' || t.cat === catFilter;
      
      return matchesSearch && matchesCategory;
  });

  return (
    <ModalShell
      title="Registro de Tareas Completadas"
      onClose={onClose}
      footer={
        <button onClick={onClose} className="bg-transparent border border-borderLight text-textSecondary px-3 py-1.5 rounded text-sm hover:bg-gray-50">Cerrar</button>
      }
    >
      <div className="flex flex-col gap-3 h-full">
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar en historial..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 border border-borderLight rounded text-xs bg-gray-50 outline-none focus:border-accentBlue"
                />
            </div>
            <select 
                value={catFilter} 
                onChange={e => setCatFilter(e.target.value as any)}
                className="w-24 py-1.5 px-2 border border-borderLight rounded text-xs bg-white outline-none focus:border-accentBlue text-textSecondary"
            >
                <option value="all">Todas</option>
                <option value="SGI">SGI</option>
                <option value="Ingenieria">Ingeniería</option>
                <option value="Tecnologia">Tecnología</option>
                <option value="OEA">OEA</option>
                <option value="Otro">Otro</option>
            </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">
             <Archive size={32} className="mx-auto mb-2 opacity-50"/>
             No hay tareas completadas registradas con este criterio.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
             {filtered.map(task => (
                <div key={task.id} className="border border-borderLight rounded-lg p-3 bg-gray-50 flex flex-col gap-2">
                   <div className="flex justify-between items-start">
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800">Cerrada</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">{task.cat}</span>
                            {task.completedAt && <span className="text-[10px] text-gray-400">{task.completedAt}</span>}
                         </div>
                         <div className="text-sm font-medium text-textPrimary line-through opacity-70">{task.text}</div>
                      </div>
                      <button 
                        onClick={() => onRestore(task)}
                        className="text-accentBlue hover:bg-blue-50 p-1.5 rounded transition-colors"
                        title="Restaurar / Reabrir"
                      >
                         <RotateCcw size={14} />
                      </button>
                   </div>
                   
                   {/* Info de cierre */}
                   {(task.closingNote || task.closingL1) && (
                      <div className="bg-white border border-borderLight rounded p-2 text-xs text-gray-600 mt-1">
                         {task.closingNote && (
                             <div className="italic mb-1">
                                <span className="font-bold not-italic text-[10px] text-gray-400 block mb-0.5">MOTIVO DE CIERRE:</span>
                                "{task.closingNote}"
                             </div>
                         )}
                         {(task.closingL1 || task.closingL2) && (
                             <div className="flex gap-2 mt-1.5 pt-1 border-t border-gray-100">
                                {task.closingL1 && (
                                    <a href={task.closingL1} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                        <ExternalLink size={10} /> {task.closingN1 || 'Ref 1'}
                                    </a>
                                )}
                                {task.closingL2 && (
                                    <a href={task.closingL2} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                        <ExternalLink size={10} /> {task.closingN2 || 'Ref 2'}
                                    </a>
                                )}
                             </div>
                         )}
                      </div>
                   )}
                   
                   {/* Notas internas originales si existen */}
                   {task.note && (
                       <div className="text-[10px] text-gray-400 italic px-1">
                           Nota original: "{task.note}"
                       </div>
                   )}
                </div>
             ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
};


/* --- Routine Manager Modal (New) --- */
interface RoutineManagerModalProps {
  items: RoutineItem[];
  onEdit: (id: string) => void;
  onClose: () => void;
}

export const RoutineManagerModal: React.FC<RoutineManagerModalProps> = ({ items, onEdit, onClose }) => {
  const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  return (
    <ModalShell
      title="Gestor de Rutinas"
      onClose={onClose}
      footer={
        <button onClick={onClose} className="bg-transparent border border-borderLight text-textSecondary px-3 py-1.5 rounded text-sm hover:bg-gray-50">Cerrar</button>
      }
    >
      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="text-gray-400 text-center text-sm py-4">No hay rutinas creadas.</p>
        ) : (
          items.map(item => {
             const block = item.block || 'start';
             const blockInfo = TIME_BLOCKS[block];
             
             return (
               <div key={item.id} className="flex items-center justify-between p-2 border border-borderLight rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col gap-1 overflow-hidden">
                     <div className="flex items-center gap-2">
                         <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 font-bold ${blockInfo.color}`}>
                             {getBlockIcon(block)} {blockInfo.label}
                         </span>
                         <span className="text-xs font-medium text-textPrimary truncate">{item.text}</span>
                     </div>
                     
                     <div className="flex gap-1 mt-1">
                        {dayLabels.map((l, idx) => (
                           <span key={idx} className={`w-4 h-4 text-[9px] flex items-center justify-center rounded-full ${
                             item.days === 'all' || item.days.includes(idx) 
                               ? 'bg-accentBlue text-white' 
                               : 'bg-gray-100 text-gray-300'
                           }`}>
                             {l}
                           </span>
                        ))}
                     </div>
                  </div>
                  
                  <button onClick={() => onEdit(item.id)} className="p-2 text-gray-400 hover:text-accentBlue hover:bg-blue-50 rounded-full">
                     <Edit2 size={14} />
                  </button>
               </div>
             )
          })
        )}
      </div>
    </ModalShell>
  );
};


/* --- Routine Modal --- */
interface RoutineModalProps {
  item: RoutineItem;
  onSave: (item: RoutineItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const RoutineModal: React.FC<RoutineModalProps> = ({ item, onSave, onDelete, onClose }) => {
  const [text, setText] = useState(item.text);
  const [days, setDays] = useState<number[]>(item.days === 'all' ? [0,1,2,3,4,5,6] : item.days);
  const [block, setBlock] = useState<TimeBlock>(item.block || 'start');
  const [l1, setL1] = useState(item.l1 || '');
  const [n1, setN1] = useState(item.n1 || '');
  const [l2, setL2] = useState(item.l2 || '');
  const [n2, setN2] = useState(item.n2 || '');
  const [l3, setL3] = useState(item.l3 || '');
  const [n3, setN3] = useState(item.n3 || '');

  const toggleDay = (d: number) => {
    if (days.includes(d)) setDays(days.filter(x => x !== d));
    else setDays([...days, d]);
  };

  const handleSave = () => {
    onSave({
      ...item,
      text,
      days: days.length === 7 ? 'all' : days,
      block,
      l1, n1, l2, n2, l3, n3
    });
    onClose();
  };

  const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  return (
    <ModalShell 
      title="Configurar Rutina" 
      onClose={onClose}
      footer={
        <div className="flex justify-between w-full">
           <button onClick={() => { onDelete(item.id); onClose(); }} className="text-accentRed text-sm font-medium hover:underline px-2">Eliminar</button>
           <div className="flex gap-2">
             <button onClick={onClose} className="bg-transparent border border-borderLight text-textSecondary px-3 py-1.5 rounded text-sm hover:bg-gray-50">Cancelar</button>
             <button onClick={handleSave} className="bg-green-600 text-white border-none px-3 py-1.5 rounded text-sm font-bold hover:bg-green-700">Guardar</button>
           </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Nombre</label>
          <input type="text" value={text} onChange={e => setText(e.target.value)} className="w-full px-2 py-1.5 border border-borderLight rounded text-sm outline-none focus:border-accentBlue bg-white text-textPrimary" />
        </div>
        
        {/* Selector de Bloque de Tiempo */}
        <div>
           <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Bloque de Tiempo</label>
           <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TIME_BLOCKS) as TimeBlock[]).map((key) => (
                <button
                   key={key}
                   onClick={() => setBlock(key)}
                   className={`flex items-center gap-2 px-3 py-2 rounded text-xs border transition-all ${
                     block === key 
                       ? 'bg-blue-50 border-accentBlue text-accentBlue font-bold ring-1 ring-accentBlue' 
                       : 'bg-white border-borderLight text-textSecondary hover:bg-gray-50'
                   }`}
                >
                   <span>{getBlockIcon(key)}</span>
                   <span>{TIME_BLOCKS[key].label}</span>
                </button>
              ))}
           </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Días</label>
          <div className="flex gap-1">
            {dayLabels.map((label, idx) => (
              <button 
                key={idx} 
                onClick={() => toggleDay(idx)}
                className={`w-7 h-7 rounded-full text-[10px] border flex items-center justify-center transition-colors ${days.includes(idx) ? 'bg-accentBlue text-white border-accentBlue' : 'bg-white text-gray-400 border-borderLight'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Links Fijos</label>
          <div className="flex flex-col gap-2">
             <div className="flex gap-2">
                <input placeholder="URL 1" value={l1} onChange={e => setL1(e.target.value)} className="flex-[2] px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
                <input placeholder="Nombre" value={n1} onChange={e => setN1(e.target.value)} className="flex-1 px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
             </div>
             <div className="flex gap-2">
                <input placeholder="URL 2" value={l2} onChange={e => setL2(e.target.value)} className="flex-[2] px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
                <input placeholder="Nombre" value={n2} onChange={e => setN2(e.target.value)} className="flex-1 px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
             </div>
             <div className="flex gap-2">
                <input placeholder="URL 3" value={l3} onChange={e => setL3(e.target.value)} className="flex-[2] px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
                <input placeholder="Nombre" value={n3} onChange={e => setN3(e.target.value)} className="flex-1 px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
             </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

/* --- Task Modal --- */
interface TaskModalProps {
  task: Task;
  onSave: (task: Task) => void;
  onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, onSave, onClose }) => {
  const [text, setText] = useState(task.text);
  const [cat, setCat] = useState<Category>(task.cat);
  const [comp, setComp] = useState<Complexity>(task.comp);
  const [date, setDate] = useState(task.date || '');
  const [del, setDel] = useState(task.del || '');
  const [l1, setL1] = useState(task.l1 || '');
  const [n1, setN1] = useState(task.n1 || '');
  const [l2, setL2] = useState(task.l2 || '');
  const [n2, setN2] = useState(task.n2 || '');
  const [l3, setL3] = useState(task.l3 || '');
  const [n3, setN3] = useState(task.n3 || '');

  const handleSave = () => {
    onSave({ ...task, text, cat, comp, date: date || undefined, del, l1, n1, l2, n2, l3, n3 });
    onClose();
  };

  return (
    <ModalShell 
      title="Editar Tarea" 
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="bg-transparent border border-borderLight text-textSecondary px-3 py-1.5 rounded text-sm hover:bg-gray-50">Cerrar</button>
          <button onClick={handleSave} className="bg-green-600 text-white border-none px-3 py-1.5 rounded text-sm font-bold hover:bg-green-700">Guardar Cambios</button>
        </>
      }
    >
       <div className="flex flex-col gap-4">
        <input type="text" value={text} onChange={e => setText(e.target.value)} className="w-full px-2 py-1.5 border border-borderLight rounded text-sm outline-none focus:border-accentBlue bg-white text-textPrimary" placeholder="Descripción de la tarea" />
        
        <div className="flex gap-4">
          <div className="flex-1">
             <label className="block text-xs text-textSecondary mb-1">Categoría</label>
             <select value={cat} onChange={e => setCat(e.target.value as Category)} className="w-full px-2 py-1.5 border border-borderLight rounded text-sm bg-white text-textPrimary">
                <option value="SGI">SGI</option>
                <option value="Tecnologia">Tecnología</option>
                <option value="Ingenieria">Ingeniería</option>
                <option value="OEA">OEA</option>
                <option value="Otro">Otro</option>
             </select>
          </div>
          <div className="flex-1">
             <label className="block text-xs text-textSecondary mb-1">Complejidad</label>
             <select value={comp} onChange={e => setComp(e.target.value as Complexity)} className="w-full px-2 py-1.5 border border-borderLight rounded text-sm bg-white text-textPrimary">
                <option value="low">Rápida</option>
                <option value="med">Media</option>
                <option value="high">Compleja</option>
             </select>
          </div>
        </div>

        <div className="flex gap-4">
             <div className="flex-1">
                <label className="block text-xs text-textSecondary mb-1">Fecha Programada</label>
                <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    className="w-full px-2 py-1.5 border border-borderLight rounded text-sm outline-none focus:border-accentBlue bg-white text-textPrimary" 
                />
                <span className="text-[10px] text-gray-400">Dejar vacío para Backlog</span>
             </div>
             <div className="flex-1">
                <label className="block text-xs text-textSecondary mb-1">Delegado a:</label>
                <input value={del} onChange={e => setDel(e.target.value)} className="w-full px-2 py-1.5 border border-borderLight rounded text-sm outline-none focus:border-accentBlue bg-white text-textPrimary" placeholder="Nadie" />
             </div>
        </div>

        <div>
          <label className="block text-xs text-textSecondary mb-1">Links</label>
          <div className="flex flex-col gap-2">
             <div className="flex gap-2">
                <input placeholder="URL 1" value={l1} onChange={e => setL1(e.target.value)} className="flex-[2] px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
                <input placeholder="Nombre" value={n1} onChange={e => setN1(e.target.value)} className="flex-1 px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
             </div>
             <div className="flex gap-2">
                <input placeholder="URL 2" value={l2} onChange={e => setL2(e.target.value)} className="flex-[2] px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
                <input placeholder="Nombre" value={n2} onChange={e => setN2(e.target.value)} className="flex-1 px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
             </div>
             <div className="flex gap-2">
                <input placeholder="URL 3" value={l3} onChange={e => setL3(e.target.value)} className="flex-[2] px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
                <input placeholder="Nombre" value={n3} onChange={e => setN3(e.target.value)} className="flex-1 px-2 py-1 border border-borderLight rounded text-xs outline-none focus:border-accentBlue bg-white text-textPrimary" />
             </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

/* --- History Modal --- */
interface HistoryModalProps {
  history: HistoryEntry[];
  onClose: () => void;
  onDownload: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ history, onClose, onDownload }) => (
  <ModalShell
    title="Log de Movimientos"
    onClose={onClose}
    footer={
      <>
        <button onClick={onDownload} className="bg-accentBlue text-white border-none px-3 py-1.5 rounded text-sm hover:bg-blue-700">Descargar</button>
        <button onClick={onClose} className="bg-transparent border border-borderLight text-textSecondary px-3 py-1.5 rounded text-sm hover:bg-gray-50">Cerrar</button>
      </>
    }
  >
    <div className="flex flex-col">
      {history.length === 0 ? (
        <div className="text-gray-400 text-center py-4">Vacío</div>
      ) : (
        history.map((h, idx) => (
          <div key={idx} className="border-b border-borderLight py-2 text-[13px] flex gap-3">
             <span className="text-textSecondary font-mono text-xs whitespace-nowrap">{h.t}</span>
             <span className="text-textPrimary">{h.txt}</span>
          </div>
        ))
      )}
    </div>
  </ModalShell>
);

/* --- Achievements Modal --- */
interface AchievementsModalProps {
  achievements: Achievement[];
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ achievements, onClose }) => {
  // Agrupar por fecha
  const grouped = achievements.reduce((acc, ach) => {
    if (!acc[ach.date]) acc[ach.date] = [];
    acc[ach.date].push(ach);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <ModalShell
      title="Mis Logros"
      onClose={onClose}
      footer={
        <button onClick={onClose} className="bg-transparent border border-borderLight text-textSecondary px-3 py-1.5 rounded text-sm hover:bg-gray-50">Cerrar</button>
      }
    >
      <div className="flex flex-col gap-4">
        {achievements.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs flex flex-col items-center">
            <Trophy size={32} className="mb-2 opacity-50 text-yellow-500" />
            Aún no has desbloqueado logros. ¡Sigue así!
          </div>
        ) : (
          sortedDates.map(date => (
            <div key={date}>
              <div className="text-xs font-bold text-textSecondary mb-2 border-b border-borderLight pb-1">{date}</div>
              <div className="flex flex-col gap-2">
                {grouped[date].map(ach => (
                  <div key={ach.id} className="flex items-center gap-3 p-3 bg-yellow-50/50 border border-yellow-100 rounded-lg">
                    <div className="text-2xl">{ach.icon}</div>
                    <div>
                      <div className="text-sm font-bold text-yellow-800">{ach.title}</div>
                      <div className="text-xs text-yellow-700/80">{ach.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </ModalShell>
  );
};

/* --- Stats Modal (Performance) --- */
interface StatsModalProps {
  completedTasks: Task[];
  routineHistory: Record<string, number>;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ completedTasks, routineHistory, onClose }) => {
  const [data, setData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    const historyData = [];
    
    if (viewMode === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString();
        const enCaDateStr = d.toLocaleDateString('en-CA');
        const shortDate = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });

        const dayTasks = completedTasks.filter(t => t.completedAt === dateStr);
        let score = 0;
        let high = 0, med = 0, low = 0;
        
        dayTasks.forEach(t => {
          if (t.comp === 'high') { score += 40; high++; }
          else if (t.comp === 'med') { score += 20; med++; }
          else { score += 10; low++; }
        });

        const routinePct = routineHistory[enCaDateStr] || 0;

        historyData.push({
          name: shortDate,
          fullDate: shortDate,
          score,
          routinePct,
          high,
          med,
          low,
          total: dayTasks.length
        });
      }
    } else {
      const targetMonth = new Date();
      targetMonth.setMonth(targetMonth.getMonth() + monthOffset);
      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        const dateStr = d.toLocaleDateString();
        const enCaDateStr = d.toLocaleDateString('en-CA');
        const shortDate = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });

        const dayTasks = completedTasks.filter(t => t.completedAt === dateStr);
        let score = 0;
        let high = 0, med = 0, low = 0;
        
        dayTasks.forEach(t => {
          if (t.comp === 'high') { score += 40; high++; }
          else if (t.comp === 'med') { score += 20; med++; }
          else { score += 10; low++; }
        });

        const routinePct = routineHistory[enCaDateStr] || 0;

        historyData.push({
          name: i.toString(),
          fullDate: shortDate,
          score,
          routinePct,
          high,
          med,
          low,
          total: dayTasks.length
        });
      }
    }
    setData(historyData);
  }, [completedTasks, routineHistory, viewMode, monthOffset]);

  const modalTitle = (
    <div className="flex items-center gap-3">
      <span>Rendimiento {viewMode === 'week' ? 'Semanal' : 'Mensual'}</span>
      {viewMode === 'month' && (
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 text-sm font-normal">
          <button 
            onClick={() => setMonthOffset(prev => prev - 1)}
            className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors"
          >
            &lt;
          </button>
          <span className="min-w-[100px] text-center text-gray-700 capitalize">
            {new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
          <button 
            onClick={() => setMonthOffset(prev => prev + 1)}
            disabled={monthOffset >= 0}
            className={`p-1 rounded transition-colors ${monthOffset >= 0 ? 'text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );

  return (
    <ModalShell
      title={modalTitle}
      onClose={onClose}
      width="w-[700px]"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-white shadow-sm text-accentBlue' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Semana
            </button>
            <button 
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-white shadow-sm text-accentBlue' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Mes
            </button>
          </div>
          <button onClick={onClose} className="bg-transparent border border-borderLight text-textSecondary px-3 py-1.5 rounded text-sm hover:bg-gray-50">Cerrar</button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} minTickGap={0} interval={0} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#10B981' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
              <Tooltip
                cursor={{ fill: '#F3F4F6' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-xl text-xs min-w-[140px]">
                        <div className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-1">{d.fullDate}</div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-500">Puntos:</span>
                          <span className="font-bold text-accentBlue text-sm">{d.score}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-500">Rutina:</span>
                          <span className="font-bold text-emerald-600 text-sm">{d.routinePct}%</span>
                        </div>
                        <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-2">
                          <span className="text-gray-500">Tareas Totales:</span>
                          <span className="font-bold text-gray-700">{d.total}</span>
                        </div>
                        <div className="text-red-600 flex justify-between mb-1"><span>Complejas:</span> <span className="font-medium">{d.high}</span></div>
                        <div className="text-orange-600 flex justify-between mb-1"><span>Medias:</span> <span className="font-medium">{d.med}</span></div>
                        <div className="text-emerald-600 flex justify-between"><span>Rápidas:</span> <span className="font-medium">{d.low}</span></div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar yAxisId="left" dataKey="score" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="routinePct" stroke="#10B981" strokeWidth={3} dot={{ r: 3, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-2 text-xs text-gray-600 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={16} className="text-accentBlue" />
            <strong className="text-gray-800 text-sm">Índice de Rendimiento</strong>
          </div>
          <p className="mb-2">Las <strong className="text-accentBlue">barras azules</strong> muestran los puntos obtenidos por las tareas completadas cada día. La <strong className="text-emerald-600">línea verde</strong> muestra el porcentaje de tu rutina diaria completada.</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white p-2 rounded border border-gray-100 text-center">
              <div className="font-bold text-emerald-600">10 pts</div>
              <div className="text-[10px] text-gray-500 uppercase mt-0.5">Rápida</div>
            </div>
            <div className="bg-white p-2 rounded border border-gray-100 text-center">
              <div className="font-bold text-orange-600">20 pts</div>
              <div className="text-[10px] text-gray-500 uppercase mt-0.5">Media</div>
            </div>
            <div className="bg-white p-2 rounded border border-gray-100 text-center">
              <div className="font-bold text-red-600">40 pts</div>
              <div className="text-[10px] text-gray-500 uppercase mt-0.5">Compleja</div>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};