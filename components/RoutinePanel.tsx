import React, { useState } from 'react';
import { Plus, RotateCw, Edit2, ExternalLink, Sunrise, Sun, Utensils, Moon, ListChecks, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import { RoutineItem, RoutineState, TimeBlock, TIME_BLOCKS } from '../types';

interface RoutinePanelProps {
  items: RoutineItem[];
  state: RoutineState;
  onToggle: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onReset: () => void;
  onOpenManager: () => void;
  onReorder: (draggedId: string, targetId: string) => void;
}

const RoutinePanel: React.FC<RoutinePanelProps> = ({
  items, state, onToggle, onUpdateNote, onAdd, onEdit, onReset, onOpenManager, onReorder
}) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const toggleNoteView = (id: string) => {
    const next = new Set(expandedNotes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNotes(next);
  };

  const today = new Date().getDay();
  const visibleItems = items.filter(r => r.days === 'all' || r.days.includes(today));

  const blockOrder: Record<string, number> = { 'start': 1, 'mid': 2, 'noon': 3, 'end': 4 };
  visibleItems.sort((a, b) => {
    const oA = blockOrder[a.block || 'start'] || 1;
    const oB = blockOrder[b.block || 'start'] || 1;
    if (oA !== oB) return oA - oB;
    return 0;
  });

  // Progress
  const doneCount = visibleItems.filter(r => state[r.id]?.done).length;
  const pct = visibleItems.length ? Math.round((doneCount / visibleItems.length) * 100) : 0;

  const getBlockIcon = (block: TimeBlock) => {
    switch (block) {
      case 'start': return <Sunrise size={9} />;
      case 'mid': return <Sun size={9} />;
      case 'noon': return <Utensils size={9} />;
      case 'end': return <Moon size={9} />;
      default: return <Sun size={9} />;
    }
  };

  // Block pill colors matching Gantt palette
  const blockPillColors: Record<string, string> = {
    start: 'bg-amber-100 text-amber-700 border-amber-200',
    mid:   'bg-sky-100 text-sky-700 border-sky-200',
    noon:  'bg-orange-100 text-orange-700 border-orange-200',
    end:   'bg-indigo-100 text-indigo-700 border-indigo-200',
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.classList.add('opacity-50');
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, id: string, block: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedItemId === id) return;
    const draggedItem = items.find(i => i.id === draggedItemId);
    if ((draggedItem?.block || 'start') === block) setDragOverItemId(id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string, block: string) => {
    e.preventDefault();
    setDragOverItemId(null);
    if (!draggedItemId || draggedItemId === targetId) { setDraggedItemId(null); return; }
    const draggedItem = items.find(i => i.id === draggedItemId);
    if ((draggedItem?.block || 'start') === block) onReorder(draggedItemId, targetId);
    setDraggedItemId(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    if (e.target instanceof HTMLElement) e.target.classList.remove('opacity-50');
  };

  return (
    <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden h-auto md:h-full shadow-sm">

      {/* ── HEADER ESTILO GANTT ── */}
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex flex-col gap-1 flex-1 min-w-0 mr-3">
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">Rutina Diaria</span>
          {/* Mini progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-400' : pct > 50 ? 'bg-sky-400' : 'bg-orange-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-[10px] font-black shrink-0 ${pct === 100 ? 'text-emerald-400' : pct > 50 ? 'text-sky-300' : 'text-orange-300'}`}>
              {pct}%
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onOpenManager} className="p-1.5 rounded-md hover:bg-white/20 text-slate-300 hover:text-white transition-colors" title="Gestionar Rutinas">
            <ListChecks size={14} />
          </button>
          <button onClick={onAdd} className="p-1.5 rounded-md hover:bg-white/20 text-slate-300 hover:text-white transition-colors" title="Agregar Rutina">
            <Plus size={14} />
          </button>
          <button onClick={onReset} className="p-1.5 rounded-md hover:bg-white/20 text-slate-300 hover:text-white transition-colors" title="Reiniciar Checkboxes">
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* ── LISTA ── */}
      <div className="flex-1 md:overflow-y-auto no-scrollbar min-h-[150px] md:min-h-0 bg-white">
        {visibleItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <ListChecks size={32} className="mb-2 text-slate-200" strokeWidth={1.5} />
            <p className="text-[11px] font-medium mt-1">Día sin rutinas asignadas</p>
          </div>
        )}

        {visibleItems.map(item => {
          const isDone = state[item.id]?.done || false;
          const note = state[item.id]?.note || '';
          const isNoteOpen = expandedNotes.has(item.id);
          const block = (item.block || 'start') as TimeBlock;
          const blockInfo = TIME_BLOCKS[block];
          const isDragging = draggedItemId === item.id;
          const isDragOver = dragOverItemId === item.id;
          const pillColor = blockPillColors[block] || blockPillColors.start;

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragOver={(e) => handleDragOver(e, item.id, block)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.id, block)}
              onDragEnd={handleDragEnd}
              className={`border-b border-slate-100 last:border-0 group transition-all ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-t-2 border-t-blue-400 bg-blue-50/30' : ''}`}
            >
              <div className={`flex items-center px-4 py-2.5 transition-colors ${isDone ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}>
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 mr-2 shrink-0">
                  <GripVertical size={13} />
                </div>

                {/* Checkbox */}
                <button
                  onClick={() => onToggle(item.id)}
                  className="mr-3 shrink-0 hover:scale-110 transition-transform"
                  title={isDone ? 'Desmarcar' : 'Marcar como hecha'}
                >
                  {isDone
                    ? <CheckCircle2 size={16} className="text-emerald-500" />
                    : <Circle size={16} className="text-slate-300 hover:text-blue-400" />
                  }
                </button>

                {/* Content */}
                <div
                  className={`flex-1 cursor-pointer flex items-center gap-2 select-none overflow-hidden ${isDone ? 'opacity-60' : ''}`}
                  onClick={() => toggleNoteView(item.id)}
                >
                  {/* Block badge */}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-bold whitespace-nowrap shrink-0 ${pillColor}`}>
                    {getBlockIcon(block)} {blockInfo.label}
                  </span>

                  <span className={`text-[11px] truncate font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-700 group-hover:text-blue-700'}`}>
                    {item.text}
                  </span>
                </div>

                {/* Links + Edit */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {item.l1 && (
                    <a href={item.l1} target="_blank" rel="noreferrer"
                      className="text-[10px] text-blue-600 px-1 py-0.5 rounded hover:bg-blue-50 hover:underline font-medium flex items-center gap-1 max-w-[60px] truncate"
                      title={item.n1 || 'Link 1'}>
                      {item.n1 || <ExternalLink size={10} />}
                    </a>
                  )}
                  {item.l2 && (
                    <a href={item.l2} target="_blank" rel="noreferrer"
                      className="text-[10px] text-blue-600 px-1 py-0.5 rounded hover:bg-blue-50 hover:underline font-medium flex items-center gap-1 max-w-[60px] truncate"
                      title={item.n2 || 'Link 2'}>
                      {item.n2 || <ExternalLink size={10} />}
                    </a>
                  )}
                  {item.l3 && (
                    <a href={item.l3} target="_blank" rel="noreferrer"
                      className="text-[10px] text-blue-600 px-1 py-0.5 rounded hover:bg-blue-50 hover:underline font-medium flex items-center gap-1 max-w-[60px] truncate"
                      title={item.n3 || 'Link 3'}>
                      {item.n3 || <ExternalLink size={10} />}
                    </a>
                  )}
                  <div className="md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Edit2 size={10} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Note Area */}
              {isNoteOpen && (
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 animate-in slide-in-from-top-1">
                  <textarea
                    className="w-full bg-transparent border-none text-xs text-amber-900 resize-y outline-none min-h-[30px] placeholder:text-amber-400"
                    placeholder="Nota..."
                    value={note}
                    onChange={(e) => onUpdateNote(item.id, e.target.value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoutinePanel;