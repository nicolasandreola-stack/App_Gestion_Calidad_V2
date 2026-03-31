import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Bot, FileText, Loader2, Lock, AlertTriangle, CheckCircle2, XCircle, ExternalLink, Clock, Copy, Check, Key, Paperclip, File as FileIcon, Trash2, Settings, Save, RefreshCw, Cpu, Minus, Maximize2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''; 

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AsistenteChatProps {
  onClose: () => void;
}

const QUICK_ACTIONS = [
  {
    label: "🔍 Desvíos para revisar esta semana",
    prompt: "Quiero saber los desvíos para revisar esta semana. Por favor, busca en el 'DOC Maestro DINAMICO - GEM (Desvios)' los registros de la semana pasada (semana vencida) y hazme un resumen."
  },
  {
    label: "🔍 Incidentes operativos para revisar esta semana",
    prompt: "Quiero saber los incidentes operativos para revisar esta semana. Por favor, busca en el 'DOC Maestro DINAMICO - GEM (Operaciones)' los registros de la semana pasada (semana vencida) y hazme un resumen."
  },
  {
    label: "📅 Pendientes de desvíos del 2026",
    prompt: "Quiero saber cómo venimos con los pendientes de desvíos de este año 2026. Busca en el 'DOC Maestro DINAMICO - GEM (Desvios)' todos los pendientes del 2026, excluyendo los de la semana actual, y hazme un resumen."
  },
  {
    label: "📅 Pendientes de incidentes operativos del 2026",
    prompt: "Quiero saber cómo venimos con los pendientes de incidentes operativos de este año 2026. Busca en el 'DOC Maestro DINAMICO - GEM (Operaciones)' todos los pendientes del 2026, excluyendo los de la semana actual, y hazme un resumen."
  }
];

const getWeekNumber = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
};

const AsistenteChat: React.FC<AsistenteChatProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hola, soy tu Asistente de Desvíos e Incidentes. ¿Qué quisieras consultar hoy?\n\nPuedes elegir una de las opciones rápidas o escribirme lo que necesites.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // --- ESTADOS DE DIAGNÓSTICO ---
  const [isServiceAccountConnected, setIsServiceAccountConnected] = useState<boolean>(true); // Asumimos true por defecto, fallará si el fetch falla
  const [authError, setAuthError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // --- CONFIGURACIÓN MANUAL (SETTINGS) ---
  const [showSettings, setShowSettings] = useState(false);
  
  // Clave Gemini Personalizada (Persistente)
  const [customGeminiKey, setCustomGeminiKey] = useState(() => localStorage.getItem("v25_gemini_key") || "");
  
  // Modelo Seleccionado
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem("v25_model");
    const validModels = ["gemini-3-flash-preview", "gemini-3-pro-preview", "gemini-flash-latest"];
    if (saved && validModels.includes(saved)) return saved;
    return "gemini-3-flash-preview";
  });

  const [inputGeminiKey, setInputGeminiKey] = useState("");
  const [savedGeminiSuccess, setSavedGeminiSuccess] = useState(false);

  // --- CACHÉ DE CONTEXTO ---
  const [cachedDriveContext, setCachedDriveContext] = useState<string | null>(null);
  const [useFullContext, setUseFullContext] = useState(() => localStorage.getItem("v25_full_context") === "true");
  const [useHistoricalContext, setUseHistoricalContext] = useState(false);

  // --- ARCHIVOS ADJUNTOS ---
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (!isMinimized) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, attachedFiles, isMinimized]);

  // Sincronizar input temporal al abrir settings
  useEffect(() => {
    if (showSettings) {
      setInputGeminiKey(customGeminiKey);
      setSavedGeminiSuccess(false);
    }
  }, [showSettings, customGeminiKey]);

  // Notificación de Restauración de Credenciales
  useEffect(() => {
    if (customGeminiKey) {
        setTimeout(() => {
            setMessages(prev => [
                ...prev, 
                { 
                    role: 'model', 
                    text: `⚙️ **Sesión Restaurada:**\n• 🔑 Clave API Personal cargada` 
                }
            ]);
        }, 500);
    }
  }, []); 

  const handleSaveGeminiKey = () => {
    const trimmed = inputGeminiKey.trim();
    setCustomGeminiKey(trimmed);
    localStorage.setItem("v25_gemini_key", trimmed);
    setSavedGeminiSuccess(true);
    setTimeout(() => setSavedGeminiSuccess(false), 2000);
    
    if (trimmed) {
      setMessages(prev => [...prev, { role: 'model', text: `🔑 Clave actualizada. Usando: ...${trimmed.slice(-4)}` }]);
    }
  };

  const handleClearGeminiKey = () => {
    setCustomGeminiKey("");
    setInputGeminiKey("");
    localStorage.removeItem("v25_gemini_key");
    alert("Has vuelto a la clave por defecto del sistema.");
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    localStorage.setItem("v25_model", newModel);
  };

  const handleFullContextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setUseFullContext(isChecked);
    localStorage.setItem("v25_full_context", isChecked.toString());
    // Limpiar caché para forzar nueva lectura con o sin truncamiento
    setCachedDriveContext(null);
  };

  const handleHistoricalContextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUseHistoricalContext(e.target.checked);
    // Limpiar caché para forzar nueva lectura de la carpeta correcta
    setCachedDriveContext(null);
  };

  // FETCH CONTEXTO DESDE EL BACKEND (Service Account)
  const fetchDocsContent = async () => {
    try {
      console.log("Solicitando contexto de Drive al servidor...");
      
      // Siempre pedimos la carpeta principal (donde están los pendientes y los desvíos)
      const mainResponse = await fetch(`/api/drive/files?full=${useFullContext}`);
      if (!mainResponse.ok) {
        const errData = await mainResponse.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${mainResponse.status}: La respuesta no es un JSON válido.`);
      }
      const mainData = await mainResponse.json();
      let combinedContext = mainData.context || "[Carpeta principal vacía]";

      // Si el usuario activó el histórico, pedimos TAMBIÉN la subcarpeta histórica y la sumamos
      if (useHistoricalContext) {
        console.log("Solicitando contexto histórico adicional...");
        const historicalFolderId = '1E_uJaarACpoBETw8YpYSYleh4ANUT1Ru';
        const histResponse = await fetch(`/api/drive/files?full=${useFullContext}&folderId=${historicalFolderId}`);
        
        if (histResponse.ok) {
          const histData = await histResponse.json();
          combinedContext += `\n\n=== INICIO CONTEXTO HISTÓRICO (2024-2025) ===\n${histData.context || "[Carpeta histórica vacía]"}\n=== FIN CONTEXTO HISTÓRICO ===\n`;
        } else {
          console.warn("No se pudo obtener la carpeta histórica");
          combinedContext += "\n\n[ADVERTENCIA: No se pudo cargar la carpeta histórica]";
        }
      }

      setIsServiceAccountConnected(true);
      return combinedContext;

    } catch (error: any) {
      console.error("Error fetching Drive context:", error);
      setIsServiceAccountConnected(false);
      setAuthError(error.message);
      return `[ERROR LEYENDO DRIVE: ${error.message}]`;
    }
  };

  // --- LOGICA ARCHIVOS ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getMimeType = (file: File) => {
    if (file.type) return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (['jpg', 'jpeg'].includes(ext || '')) return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (['txt', 'md', 'csv', 'json', 'js', 'ts', 'html'].includes(ext || '')) return 'text/plain';
    return 'application/octet-stream';
  };

  const processFile = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const mimeType = getMimeType(file);
      
      const isImageOrPdf = mimeType.startsWith('image/') || mimeType === 'application/pdf';

      if (isImageOrPdf) {
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          });
        };
        reader.onerror = (err) => reject(err);
      } else {
        // Texto
        reader.readAsText(file);
        reader.onload = () => {
          resolve({
            text: `\n--- Archivo Adjunto: ${file.name} ---\n${reader.result}\n`
          });
        };
        reader.onerror = (err) => reject(err);
      }
    });
  };

  const handleSend = async (overrideText?: string | React.MouseEvent | React.KeyboardEvent) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : input;
    
    if ((!textToSend.trim() && attachedFiles.length === 0) || isLoading) return;

    // PRIORIDAD: Key Personalizada > Variable de Entorno > Hardcoded
    const effectiveApiKey = customGeminiKey || process.env.API_KEY || API_KEY;
    
    if (!effectiveApiKey) {
      alert("Falta la API Key de Gemini. Por favor configúrala en el icono de engranaje.");
      setShowSettings(true);
      return;
    }

    const userMsg = textToSend;
    const currentFiles = [...attachedFiles];
    
    setInput('');
    setAttachedFiles([]);
    
    let displayMsg = userMsg;
    if (currentFiles.length > 0) {
      const fileNames = currentFiles.map(f => f.name).join(', ');
      displayMsg = `${userMsg ? userMsg + '\n\n' : ''}📎 Adjuntos (${currentFiles.length}): ${fileNames}`;
    }
      
    setMessages(prev => [...prev, { role: 'user', text: displayMsg }]);
    setIsLoading(true);

    try {
      // 1. Obtener Contexto de Drive (Service Account) con Caché
      let contextDocs = cachedDriveContext;
      if (!contextDocs) {
        try {
          const rawContext = await fetchDocsContent();
          contextDocs = rawContext;
          setCachedDriveContext(contextDocs);
        } catch (e) {
          contextDocs = "[No se pudo leer Drive]";
        }
      }

      const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      
      const now = new Date();
      const currentWeek = getWeekNumber(now);
      const currentYear = now.getFullYear();

      const systemInstruction = `Eres un Ingeniero de Calidad experto en análisis de desvíos e incidentes operativos para la empresa GEMEZ S.A.
      Hoy es ${now.toLocaleDateString('es-AR')} (Semana ${currentWeek} del año ${currentYear}).
      La "semana vencida" o "semana pasada" corresponde a la Semana ${currentWeek - 1}.
      
      CONTEXTO DE DRIVE (Obtenido vía Service Account):
      ${contextDocs}
      
      INSTRUCCIONES:
      Analiza la información proporcionada (archivos adjuntos y contexto de Drive) y responde a la consulta del usuario con precisión técnica.
      Si el contexto de Drive indica error, avisa al usuario que revise la configuración del servidor (Service Account).
      
      REGLAS ESPECIALES:
      1. Si te piden "Desvíos para revisar esta semana" o "Incidentes para revisar esta semana", debes buscar estrictamente los registros de la semana pasada (Semana ${currentWeek - 1}) en el documento correspondiente.
      2. Si te piden "Pendientes de este año", debes buscar todos los pendientes del año ${currentYear}, pero EXCLUIR los de la semana actual (Semana ${currentWeek}).
      Si la información solicitada no está en el contexto, indícalo claramente.`;

      // 2. Construir partes del mensaje (Texto + Archivos)
      const parts: any[] = [];
      
      if (currentFiles.length > 0) {
        try {
          const fileParts = await Promise.all(currentFiles.map(processFile));
          parts.push(...fileParts);
        } catch (e) {
          console.error("Error procesando archivos adjuntos:", e);
          setMessages(prev => [...prev, { role: 'model', text: "Error leyendo los archivos adjuntos. Asegúrate de que no estén corruptos." }]);
          setIsLoading(false);
          return;
        }
      }

      if (userMsg.trim()) {
        parts.push({ text: userMsg });
      } else if (currentFiles.length > 0) {
        parts.push({ text: "Por favor, analiza el contenido de estos archivos adjuntos." });
      }

      if (parts.length === 0) {
        parts.push({ text: "Hola." });
      }

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: 'user', parts: parts }],
        config: { systemInstruction },
      });

      setMessages(prev => [...prev, { role: 'model', text: response.text || "Sin respuesta del modelo." }]);
    } catch (error: any) {
      console.error("Error Gemini:", error);
      let errMsg = "Ocurrió un error al procesar.";
      
      // Parsear error robustamente
      const errStr = typeof error === 'string' ? error : (error.message || JSON.stringify(error));

      // MANEJO ESPECÍFICO DE ERROR 429 (QUOTA EXCEEDED)
      if (errStr.includes('429') || error.status === 429) {
        if (customGeminiKey) {
             errMsg = `⏳ **Error de Cuota o Configuración (429).**\n\nGoogle indica que se excedió el límite o el acceso no está configurado.\n\n**Posibles Causas (Clave Nueva):**\n1. **API no habilitada:** Busca "Google Generative Language API" en Google Cloud Console y habilítala.\n2. **Facturación:** Algunos proyectos requieren cuenta de facturación activa (aunque uses el plan gratuito).\n3. **Restricciones:** Si restringiste la API Key por IP o HTTP, intenta dejarla sin restricciones momentáneamente para probar.`;
        } else {
             errMsg = "⛔ CUOTA DE LA APP AGOTADA (429).\n\nLa clave por defecto alcanzó su límite. Por favor ingresa TU PROPIA clave en Configuración.";
        }
        setShowSettings(true); // Abrir ajustes automáticamente
      }
      // MANEJO DE ERROR 404 (MODEL NOT FOUND)
      else if (errStr.includes('404') || error.status === 404) {
          errMsg = `❌ **Modelo No Encontrado (404).**\n\nEl modelo seleccionado (${selectedModel}) ya no está disponible o el nombre es incorrecto para esta versión de la API.\n\n👉 **Solución:** Abre Configuración y selecciona otro modelo (ej: Gemini 3.0 Flash).`;
          setShowSettings(true);
      }
      else if (errStr.includes('400')) {
         errMsg += " Solicitud inválida (¿archivo demasiado grande o formato incorrecto?).";
      }
      else if (errStr.includes('403')) {
         errMsg += " Error de permisos o cuota.";
      }
      
      setMessages(prev => [...prev, { role: 'model', text: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const DiagnosticItem = ({ label, status }: { label: string, status: boolean | null }) => (
    <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      {status === true && <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={12} /> OK</span>}
      {status === false && <span className="text-red-600 flex items-center gap-1"><XCircle size={12} /> Error</span>}
      {status === null && <span className="text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> ...</span>}
    </div>
  );

  // --- MINIMIZED VIEW ---
  if (isMinimized) {
      return (
          <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
              <div className="bg-white border border-borderLight shadow-xl rounded-full pl-4 pr-2 py-2 flex items-center gap-3 hover:shadow-2xl transition-shadow cursor-pointer" onClick={() => setIsMinimized(false)}>
                  <div className="flex items-center gap-2">
                       {isLoading ? <Loader2 size={16} className="animate-spin text-accentBlue" /> : <Bot size={18} className="text-accentBlue" />}
                       <span className="text-sm font-bold text-textPrimary">Asistente IA</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }} className="p-1 hover:bg-gray-100 rounded-full">
                      <Maximize2 size={16} className="text-textSecondary" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 hover:bg-red-50 text-red-400 rounded-full ml-1 border-l border-gray-100 pl-2">
                      <X size={16} />
                  </button>
              </div>
          </div>
      );
  }

  // --- EXPANDED VIEW (Floating Widget, No Backdrop) ---
  return (
    <div className="fixed bottom-4 right-4 w-[90%] md:w-[450px] h-[600px] max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-borderLight animate-in zoom-in-95 duration-200 z-50">
        
        {/* Header */}
        <div className="bg-white border-b border-borderLight p-3 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-accentBlue">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary text-sm">Asistente de Desvíos</h3>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isServiceAccountConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-[10px] text-textSecondary">
                  {isServiceAccountConnected ? 'Drive Conectado (Server)' : 'Sin conexión a Drive'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={`p-1.5 rounded-full transition-colors ${showSettings ? 'bg-blue-100 text-accentBlue' : 'hover:bg-gray-100 text-textSecondary'}`}
              title="Configuración"
            >
              <Settings size={16} />
            </button>
            <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-gray-100 rounded-full text-textSecondary transition-colors" title="Minimizar">
              <Minus size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-red-50 text-red-500 rounded-full transition-colors" title="Cerrar">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Panel de Configuración (Overlay) */}
        {showSettings && (
          <div className="absolute top-[60px] left-0 right-0 bottom-0 bg-white/95 backdrop-blur-sm p-4 z-20 overflow-y-auto animate-in fade-in">
             <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                <h4 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                  <Settings size={14} /> Configuración Avanzada
                </h4>
                <button onClick={() => setShowSettings(false)} className="text-xs text-blue-600 hover:underline">Volver al chat</button>
             </div>

             {/* Configuración GEMINI */}
             <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                    <label className="block text-xs font-bold text-blue-800">
                    Gemini API Key
                    </label>
                    {customGeminiKey && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Check size={10} /> Activa
                        </span>
                    )}
                </div>
                
                <div className="flex gap-2 mb-3 mt-1">
                   <input 
                      type="password" 
                      value={inputGeminiKey}
                      onChange={(e) => setInputGeminiKey(e.target.value)}
                      placeholder={customGeminiKey ? "••••••••••••••••" : "Pegar API Key"}
                      className="flex-1 text-xs border border-blue-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
                   />
                   <button 
                    onClick={handleSaveGeminiKey}
                    className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    {savedGeminiSuccess ? <Check size={14} /> : <Save size={14} />}
                  </button>
                  {customGeminiKey && (
                      <button 
                        onClick={handleClearGeminiKey}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                      >
                          <Trash2 size={14} />
                      </button>
                  )}
                </div>

                {/* SELECTOR DE MODELO */}
                <div className="pt-2 border-t border-blue-100">
                   <label className="block text-xs font-bold text-blue-800 mb-1 flex items-center gap-2">
                     <Cpu size={12} /> Modelo de IA
                   </label>
                   <select 
                      value={selectedModel}
                      onChange={handleModelChange}
                      className="w-full text-xs border border-blue-200 rounded px-2 py-1.5 bg-white text-textPrimary focus:border-blue-500 outline-none cursor-pointer mb-3"
                   >
                      <option value="gemini-3-flash-preview">Gemini 3.0 Flash</option>
                      <option value="gemini-flash-latest">Gemini Flash (v1.5)</option>
                      <option value="gemini-3-pro-preview">Gemini 3.0 Pro</option>
                   </select>

                   <label className="flex items-center gap-2 text-xs font-bold text-blue-800 cursor-pointer mt-2">
                     <input 
                       type="checkbox" 
                       checked={useFullContext}
                       onChange={handleFullContextChange}
                       className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                     />
                     Enviar Documento Completo (Sin truncar)
                   </label>
                   <p className="text-[9px] text-blue-600 mt-1 leading-tight mb-3">
                     Activa esto solo si usas tu propia API Key con facturación habilitada. Si usas la clave gratuita, podrías recibir Error 429.
                   </p>

                   <label className="flex items-center gap-2 text-xs font-bold text-blue-800 cursor-pointer mt-2">
                     <input 
                       type="checkbox" 
                       checked={useHistoricalContext}
                       onChange={handleHistoricalContextChange}
                       className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                     />
                     Buscar en carpeta "Histórico 2024 - 2025"
                   </label>
                   <p className="text-[9px] text-blue-600 mt-1 leading-tight">
                     Activa esto para que el asistente busque en los documentos de años anteriores en lugar de los actuales.
                   </p>
                </div>
             </div>

             {/* Panel de Diagnóstico Simplificado */}
             <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                 <div className="flex justify-between items-center mb-2">
                     <h4 className="text-xs font-bold text-textPrimary uppercase flex items-center gap-2">
                     <AlertTriangle size={12} className="text-amber-500" /> Estado Conexión
                     </h4>
                 </div>
                 
                 <div className="mb-3">
                     <DiagnosticItem label="Service Account (Drive)" status={isServiceAccountConnected} />
                 </div>

                 {authError && (
                     <div className="mt-2 text-[10px] text-red-600 font-mono bg-red-50 p-2 rounded border border-red-100 break-all mb-2">
                     {authError}
                     </div>
                 )}
             </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#F5F6F8] space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-accentBlue text-white rounded-br-none' 
                    : 'bg-white text-textPrimary border border-borderLight rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-borderLight rounded-2xl rounded-bl-none px-3 py-2 shadow-sm flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-accentBlue" />
                <span className="text-xs text-textSecondary">Analizando...</span>
              </div>
            </div>
          )}

          {messages.length <= 2 && !isLoading && (
            <div className="flex flex-col gap-2 mt-2">
              {QUICK_ACTIONS.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(action.prompt)}
                  className="text-left text-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl p-3 shadow-sm transition-colors font-medium"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-borderLight flex flex-col gap-2">
          {/* File Preview */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-col gap-1 bg-blue-50 p-2 rounded-lg border border-blue-100">
              <span className="text-[10px] font-bold text-blue-700 uppercase">Archivos ({attachedFiles.length}):</span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded text-xs border border-blue-200 shrink-0 shadow-sm">
                    <FileIcon size={12} className="text-blue-500" />
                    <span className="max-w-[100px] truncate text-textPrimary font-medium" title={file.name}>{file.name}</span>
                    <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="relative flex items-center gap-2">
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect}
              accept=".pdf, .txt, .csv, .json, .md, image/*"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="relative p-2 text-textSecondary hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-0"
              title="Adjuntar"
            >
              <Paperclip size={18} />
              {attachedFiles.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold shadow-sm">
                  {attachedFiles.length}
                </span>
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Mensaje..."
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-50 border border-borderLight rounded-full text-xs outline-none focus:border-accentBlue focus:bg-white transition-all placeholder:text-gray-400 disabled:opacity-70"
            />
            <button 
              onClick={handleSend}
              disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
              className="absolute right-1 p-1.5 bg-accentBlue text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
    </div>
  );
};

export default AsistenteChat;