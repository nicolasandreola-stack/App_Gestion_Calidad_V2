import React, { useState } from 'react';
import { ProjectTask, ProjectSubtask } from '../types';
import { Bot, FileJson, X, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronUp, Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface ImportProjectModalProps {
  onClose: () => void;
  onImport: (newProjects: ProjectTask[]) => Promise<void>;
}

const ImportProjectModal: React.FC<ImportProjectModalProps> = ({ onClose, onImport }) => {
  const [jsonText, setJsonText] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const PROMPT_TEMPLATE = `Necesito que armes el cronograma operativo de mi proyecto en formato JSON estricto para importarlo a mi sistema de gestión.

El JSON debe ser un array (lista) con objetos que representen cada TAREA PRINCIPAL del proyecto. Cada objeto debe tener esta estructura exacta:

[
  {
    "project": "NOMBRE DEL PROYECTO",
    "phase": "NOMBRE DE LA FASE O ETAPA",
    "name": "Nombre de la Tarea Principal",
    "startDate": "DD/MM/AAAA",
    "endDate": "DD/MM/AAAA",
    "assignee": "Área o persona responsable",
    "details": "Descripción breve de la tarea y su objetivo.",
    "subtasks": [
      {
        "text": "Descripción concreta de la acción a realizar",
        "assignee": "Responsable específico (opcional)",
        "observation": "Detalle adicional, contexto, normativa relacionada, etc. (opcional)"
      }
    ]
  }
]

REGLAS IMPORTANTES:
- Agrupar las tareas por FASES (field "phase"). Cada fase puede tener varias tareas.
- Las fechas deben estar en formato DD/MM/AAAA.
- Las subtareas son las acciones concretas dentro de cada tarea.
- No agregar campos extra fuera de la estructura indicada.
- El output debe ser SOLO el JSON, sin texto adicional antes ni después.`;


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
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 space-y-4">
           <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
               <AlertTriangle size={18} className="shrink-0 text-blue-600 mt-0.5" />
               <p>
                 Pega debajo exactamente el código JSON (con los corchetes <code>[ ]</code> incluidos) que te generó la Inteligencia Artificial.
                 El sistema validará la estructura, asignará IDs únicos y los inyectará automáticamente en la nube.
               </p>
           </div>

           {/* Prompt Helper */}
           <div className="border border-violet-200 rounded-xl overflow-hidden">
             <button
               onClick={() => setShowPrompt(v => !v)}
               className="w-full flex items-center justify-between px-4 py-3 bg-violet-50 hover:bg-violet-100 transition-colors text-left"
             >
               <div className="flex items-center gap-2">
                 <Sparkles size={14} className="text-violet-500" />
                 <span className="text-xs font-bold text-violet-700">¿Cómo pedirle el JSON a NotebookLM o tu IA?</span>
                 <span className="bg-violet-200 text-violet-700 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">Prompt</span>
               </div>
               {showPrompt ? <ChevronUp size={14} className="text-violet-500" /> : <ChevronDown size={14} className="text-violet-500" />}
             </button>
             {showPrompt && (
               <div className="p-4 bg-white border-t border-violet-100">
                 <p className="text-[10px] text-slate-500 mb-2">Copiá este prompt y pegalo en NotebookLM (o cualquier IA con contexto de tu proyecto) para obtener el JSON listo para importar:</p>
                 <div className="relative">
                   <pre className="bg-slate-900 text-green-300 text-[10px] p-4 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono max-h-48 overflow-y-auto custom-scrollbar">{PROMPT_TEMPLATE}</pre>
                   <button
                     onClick={() => { navigator.clipboard.writeText(PROMPT_TEMPLATE); toast.success('¡Prompt copiado al portapapeles!'); }}
                     className="absolute top-2 right-2 flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white text-[9px] font-bold px-2 py-1 rounded-md shadow transition-colors"
                   >
                     <Copy size={10} /> Copiar
                   </button>
                 </div>
                 <p className="text-[10px] text-slate-400 mt-2 italic">💡 Tip: Pegá este prompt <span className="font-bold">al final</span> de tu sesión de NotebookLM, después de haber consultado toda la documentación del proyecto.</p>
               </div>
             )}
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
