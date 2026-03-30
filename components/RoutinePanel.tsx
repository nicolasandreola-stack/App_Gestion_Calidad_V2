import React, { useState, useRef } from 'react';
import { Plus, RotateCw, Edit2, Link as LinkIcon, ExternalLink, Sunrise, Sun, Utensils, Moon, ListChecks, GripVertical } from 'lucide-react';
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
  // Filter items that run today or "all"
  const visibleItems = items.filter(r => r.days === 'all' || r.days.includes(today));

  // Sort logic based on TimeBlock
  const blockOrder: Record<string, number> = { 'start': 1, 'mid': 2, 'noon': 3, 'end': 4 };
  
  visibleItems.sort((a, b) => {
    const orderA = blockOrder[a.block || 'start'] || 1; // Default to start if undefined
    const orderB = blockOrder[b.block || 'start'] || 1;
    
    if (orderA !== orderB) return orderA - orderB;
    return 0; // Maintain insertion order if same block
  });

  // Icon Mapper
  const getBlockIcon = (block: TimeBlock) => {
    switch (block) {
      case 'start': return <Sunrise size={10} />;
      case 'mid': return <Sun size={10} />;
      case 'noon': return <Utensils size={10} />;
      case 'end': return <Moon size={10} />;
      default: return <Sun size={10} />;
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
    // Pequeño timeout para que el elemento arrastrado no desaparezca visualmente de inmediato
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.classList.add("opacity-50");
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, id: string, block: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    if (draggedItemId === id) return;

    // Solo permitimos soltar sobre elementos del mismo bloque
    const draggedItem = items.find(i => i.id === draggedItemId);
    const draggedBlock = draggedItem?.block || 'start';
    
    if (draggedBlock === block) {
      setDragOverItemId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string, block: string) => {
    e.preventDefault();
    setDragOverItemId(null);
    
    if (!draggedItemId || draggedItemId === targetId) {
      setDraggedItemId(null);
      return;
    }

    const draggedItem = items.find(i => i.id === draggedItemId);
    const draggedBlock = draggedItem?.block || 'start';

    if (draggedBlock === block) {
      onReorder(draggedItemId, targetId);
    }
    
    setDraggedItemId(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    if (e.target instanceof HTMLElement) {
      e.target.classList.remove("opacity-50");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white border border-borderLight rounded-lg overflow-hidden h-auto md:h-full">
      <div className="bg-[#FAFAFA] px-4 py-2.5 border-b border-borderLight flex justify-between items-center shrink-0">
        <span className="text-[13px] font-semibold text-textPrimary uppercase">Rutina Diaria</span>
        <div className="flex gap-1">
          <button onClick={onOpenManager} className="p-1 rounded hover:bg-gray-200 text-textSecondary hover:text-textPrimary transition-colors" title="Gestionar Rutinas">
            <ListChecks size={14} />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1 self-center"></div>
          <button onClick={onAdd} className="p-1 rounded hover:bg-gray-200 text-textSecondary hover:text-textPrimary transition-colors" title="Agregar Rutina">
            <Plus size={14} />
          </button>
          <button onClick={onReset} className="p-1 rounded hover:bg-gray-200 text-textSecondary hover:text-textPrimary transition-colors" title="Reiniciar Checkboxes">
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 md:overflow-y-auto no-scrollbar min-h-[150px] md:min-h-0">
        {visibleItems.length === 0 && (
          <div className="p-4 text-center text-textSecondary text-xs">No hay rutinas para hoy.</div>
        )}
        
        {visibleItems.map(item => {
          const isDone = state[item.id]?.done || false;
          const note = state[item.id]?.note || "";
          const isNoteOpen = expandedNotes.has(item.id);
          
          // Get Block Info
          const block = item.block || 'start'; // Default
          const blockInfo = TIME_BLOCKS[block];
          const isDragging = draggedItemId === item.id;
          const isDragOver = dragOverItemId === item.id;

          return (
            <div 
              key={item.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragOver={(e) => handleDragOver(e, item.id, block)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.id, block)}
              onDragEnd={handleDragEnd}
              className={`border-b border-[#F1F3F4] last:border-0 group transition-all ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-t-2 border-t-accentBlue bg-blue-50/30' : ''}`}
            >
              <div className={`flex items-center px-4 py-2 hover:bg-[#F8F9FA] transition-colors ${isDone ? 'bg-gray-50' : ''}`}>
                <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 mr-2 shrink-0" title="Arrastrar para reordenar">
                  <GripVertical size={14} />
                </div>
                <input 
                  type="checkbox" 
                  checked={isDone} 
                  onChange={() => onToggle(item.id)}
                  className="mr-3 w-4 h-4 accent-accentBlue cursor-pointer shrink-0"
                />
                
                <div 
                  className={`flex-1 cursor-pointer flex items-center gap-2 select-none overflow-hidden ${isDone ? 'opacity-50' : ''}`}
                  onClick={() => toggleNoteView(item.id)}
                >
                  <span 
                      className={`text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 font-medium whitespace-nowrap shrink-0 ${blockInfo.color}`}
                      title={blockInfo.label}
                  >
                      {getBlockIcon(block)} {blockInfo.label}
                  </span>
                  
                  {/* Fuente reducida a text-[11px] */}
                  <span className={`text-[11px] truncate ${isDone ? 'line-through text-gray-400' : 'text-textPrimary group-hover:text-accentBlue'}`}>
                    {item.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {item.l1 && (
                    <a 
                      href={item.l1} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-accentBlue px-1 py-0.5 rounded hover:bg-blue-50 hover:underline font-medium flex items-center gap-1 max-w-[60px] truncate"
                      title={item.n1 || 'Link 1'}
                    >
                      {item.n1 || <ExternalLink size={10} />}
                    </a>
                  )}
                  {item.l2 && (
                    <a 
                      href={item.l2} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-accentBlue px-1 py-0.5 rounded hover:bg-blue-50 hover:underline font-medium flex items-center gap-1 max-w-[60px] truncate"
                      title={item.n2 || 'Link 2'}
                    >
                      {item.n2 || <ExternalLink size={10} />}
                    </a>
                  )}
                  {item.l3 && (
                    <a 
                      href={item.l3} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-accentBlue px-1 py-0.5 rounded hover:bg-blue-50 hover:underline font-medium flex items-center gap-1 max-w-[60px] truncate"
                      title={item.n3 || 'Link 3'}
                    >
                      {item.n3 || <ExternalLink size={10} />}
                    </a>
                  )}
                  
                  <div className="md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-borderLight bg-white text-textSecondary hover:text-textPrimary hover:bg-gray-100"
                    >
                      <Edit2 size={10} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Note Area */}
              {isNoteOpen && (
                <div className="bg-[#FFFDE7] px-4 py-2 border-b border-gray-100 animate-in slide-in-from-top-1">
                  <textarea 
                    className="w-full bg-transparent border-none text-xs text-gray-600 resize-y outline-none min-h-[30px]"
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