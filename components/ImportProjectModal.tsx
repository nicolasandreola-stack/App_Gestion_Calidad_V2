import React, { useState } from 'react';
import { ProjectTask, ProjectSubtask } from '../types';
import { Bot, FileJson, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImportProjectModalProps {
  onClose: () => void;
  onImport: (newProjects: ProjectTask[]) => Promise<void>;
}

const ImportProjectModal: React.FC<ImportProjectModalProps> = ({ onClose, onImport }) => {
  const [jsonText, setJsonText] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!jsonText.trim()) {
      toast.error('Pega el JSON primero.');
      return;
    }

    setIsValidating(true);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      toast.error('Error de sintaxis: El texto no es un JSON válido.');
      setIsValidating(false);
      return;
    }

    if (!Array.isArray(parsed)) {
      toast.error('El JSON debe ser un array (lista) de tareas principales.');
      setIsValidating(false);
      return;
    }

    // Validate and build the ProjectTask array
    const newTasks: ProjectTask[] = [];
    const timestampId = Date.now();
    let invalidCount = 0;

    for (let i = 0; i < parsed.length; i++) {
       const row = parsed[i];
       
       if (!row.project || !row.phase || !row.name) {
          invalidCount++;
          continue;
       }

       // Parse subtasks correctly
       let subtasks: ProjectSubtask[] = [];
       if (Array.isArray(row.subtasks)) {
         subtasks = row.subtasks.map((st: any, idx: number) => ({
           id: `STAI-${timestampId}-${i}-${idx}`,
           text: st.text || 'Subtarea sin nombre',
           completed: false, // Force false initially
           observation: st.observation || '',
           assignee: st.assignee || ''
         }));
       }

       const newTask: ProjectTask = {
          id: `PROJ-AI-${timestampId}-${i}`,
          project: row.project,
          phase: row.phase,
          name: row.name,
          startDate: row.startDate || '',
          endDate: row.endDate || '',
          assignee: row.assignee || '',
          progress: 0,
          status: 'PENDIENTE',
          details: row.details || '',
          subtasks
       };
       newTasks.push(newTask);
    }

    setIsValidating(false);

    if (newTasks.length === 0) {
       toast.error('No se encontraron tareas válidas en el JSON. Revisa la estructura requerida.');
       return;
    }

    if (invalidCount > 0) {
       toast.error(`Se omitieron ${invalidCount} tareas por faltar campos clave (project, phase o name).`);
       // Continue even with warnings
    }

    setIsImporting(true);
    try {
      await onImport(newTasks);
      toast.success(`${newTasks.length} tareas importadas con éxito.`);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al inyectar las tareas a la base global.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[990] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-violet-600 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-lg">
                <Bot size={24} className="text-white" />
             </div>
             <div>
                <h3 className="font-bold text-white text-lg">Importador AI</h3>
                <p className="text-violet-200 text-xs font-medium">Convierte output de NotebookLM en tareas operativas</p>
             </div>
          </div>
          <button onClick={onClose} className="text-violet-200 bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Info Box */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
           <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex gap-3 text-sm text-blue-800">
               <AlertTriangle size={18} className="shrink-0 text-blue-600 mt-0.5" />
               <p>
                 Pega debajo exactamente el código JSON (con los corchetes <code>[ ]</code> incluidos) que te generó la Inteligencia Artificial.
                 El sistema validará la estructura, asignará IDs únicos y los inyectará automáticamente en la nube.
               </p>
           </div>
           
           <div className="flex flex-col flex-1 h-full min-h-[300px]">
             <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                <FileJson size={14} className="text-slate-400" />
                Raw JSON Input
             </label>
             <textarea 
               value={jsonText}
               onChange={(e) => setJsonText(e.target.value)}
               placeholder={'[\n  {\n    "project": "Plan Liderazgo",\n    "phase": "Fase 1",\n    ...\n  }\n]'}
               className="w-full flex-1 min-h-[250px] p-4 font-mono text-[11px] bg-slate-900 text-green-400 border-none rounded-xl focus:ring-4 focus:ring-violet-500/20 outline-none custom-scrollbar shadow-inner resize-none"
             />
           </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
            <button 
              onClick={onClose} 
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button 
              disabled={isValidating || isImporting || !jsonText.trim()}
              onClick={handleImport} 
              className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-violet-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100"
            >
              {isImporting || isValidating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {isImporting ? 'Inyectando a Google Sheets...' : isValidating ? 'Validando...' : 'Procesar e Importar JSON'}
            </button>
        </div>
        
      </div>
    </div>
  );
};

export default ImportProjectModal;
