import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import KPIBoard from './KPIBoard';
import RoutinePanel from './RoutinePanel';
import TaskPanel from './TaskPanel';
import { RoutineModal, TaskModal, HistoryModal, RoutineManagerModal, NoteActionModal, CompletedTasksModal, KPIDetailsModal, AchievementsModal, StatsModal } from './Modals';
import AsistenteChat from './AsistenteChat';
import CloudSyncModal from './CloudSyncModal';
import { Task, RoutineItem, RoutineState, HistoryEntry, BackupData, GlobalCloudData, Achievement } from '../types';
import { Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DashboardProps {
  user: string;
  onLogout: () => void;
  onSwitchToAdmin?: () => void;
}

// VERSION CONTROL
const LAST_UPDATE = new Date().toLocaleString('es-ES', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onSwitchToAdmin }) => {
  // Helper to prefix keys with username
  const getUserKey = (key: string) => `v25_user_${user}_${key}`;

  // State Initialization from LocalStorage (User specific)
  const [routineMaster, setRoutineMaster] = useState<RoutineItem[]>(() => {
    const saved = localStorage.getItem(getUserKey("rt_master"));
    return saved ? JSON.parse(saved) : [{ id: "def1", text: "Organizar escritorio", days: "all" }];
  });

  const [routineState, setRoutineState] = useState<RoutineState>(() => {
    const saved = localStorage.getItem(getUserKey("rt_state"));
    return saved ? JSON.parse(saved) : {};
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(getUserKey("tasks"));
    return saved ? JSON.parse(saved) : [];
  });

  const [completedTasks, setCompletedTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(getUserKey("completed_tasks"));
    return saved ? JSON.parse(saved) : [];
  });

  const [deletedTasks, setDeletedTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(getUserKey("deleted_tasks"));
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem(getUserKey("hist"));
    return saved ? JSON.parse(saved) : [];
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem(getUserKey("achievements"));
    return saved ? JSON.parse(saved) : [];
  });

  const [routineHistory, setRoutineHistory] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(getUserKey("routine_history"));
    return saved ? JSON.parse(saved) : {};
  });

  const [toast, setToast] = useState<string | null>(null);

  // Modals state
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showCloudSync, setShowCloudSync] = useState(false);
  const [showRoutineManager, setShowRoutineManager] = useState(false);
  const [showCompletedRegistry, setShowCompletedRegistry] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [achievementPopup, setAchievementPopup] = useState<Achievement | null>(null);

  // Detail Modal State (KPIs)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalTitle, setDetailModalTitle] = useState("");
  const [detailModalType, setDetailModalType] = useState<'routine' | 'tasks_completed' | 'tasks_active'>('tasks_active');
  const [detailModalData, setDetailModalData] = useState<any[]>([]);

  // Action Logic States (Standby/Close)
  const [actionTask, setActionTask] = useState<Task | null>(null);
  const [actionType, setActionType] = useState<'complete' | 'standby' | null>(null);

  // --- AUTOMATIC SYNC STATE ---
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error' | 'unsaved'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastTaskIds, setLastTaskIds] = useState<Set<number>>(new Set());
  const [newAssignmentModal, setNewAssignmentModal] = useState<{ count: number; tasks: Task[] } | null>(null);

  // Ref to hold latest state for the interval (to avoid stale closures)
  const currentStateRef = useRef<BackupData>({ rtM: [], rtS: {}, tks: [], h: [], cTks: [], ach: [], rtH: {} });
  const isFirstRender = useRef(true);

  // Persistence Effects (User specific) - Local
  useEffect(() => {
    localStorage.setItem(getUserKey("rt_master"), JSON.stringify(routineMaster));
    localStorage.setItem(getUserKey("rt_state"), JSON.stringify(routineState));
    localStorage.setItem(getUserKey("tasks"), JSON.stringify(tasks));
    localStorage.setItem(getUserKey("completed_tasks"), JSON.stringify(completedTasks));
    localStorage.setItem(getUserKey("deleted_tasks"), JSON.stringify(deletedTasks));
    localStorage.setItem(getUserKey("hist"), JSON.stringify(history));
    localStorage.setItem(getUserKey("achievements"), JSON.stringify(achievements));
    localStorage.setItem(getUserKey("routine_history"), JSON.stringify(routineHistory));

    // Update Ref
    currentStateRef.current = { rtM: routineMaster, rtS: routineState, tks: tasks, h: history, cTks: completedTasks, dTks: deletedTasks, ach: achievements, rtH: routineHistory };

    // Mark as unsaved (Dirty) if not first render
    if (!isFirstRender.current) {
      setHasUnsavedChanges(true);
      setSyncStatus('unsaved');
    }
    isFirstRender.current = false;
  }, [routineMaster, routineState, tasks, completedTasks, history, achievements, routineHistory, user]);

  // --- AUTO-SAVE INTERVAL (Every 30 seconds if dirty) ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges && autoSyncEnabled) {
        triggerAutoSave();
      }
    }, 30000); // 30 segundos
    return () => clearInterval(interval);
  }, [hasUnsavedChanges, autoSyncEnabled]);

  // --- NEW: AUTO-POLL FOR ADMIN TASKS ---
  useEffect(() => {
    if (tasks.length > 0 && lastTaskIds.size === 0) {
      setLastTaskIds(new Set(tasks.map(t => t.id)));
    }
  }, [tasks, lastTaskIds]);

  const checkForNewTasks = async () => {
    try {
        const res = await fetch('/api/sync/get');
        if (res.ok) {
            const result = await res.json() as GlobalCloudData;
            const myData = result.users?.[user];
            if (myData && myData.tks) {
                const cloudTasks = myData.tks;
                const currentIds = new Set(currentStateRef.current.tks.map(t => t.id));
                const newTasks = cloudTasks.filter(t => t.del === 'Admin' && !currentIds.has(t.id));
                
                if (newTasks.length > 0) {
                    // Show centered persistent modal instead of auto-disappearing toast
                    setNewAssignmentModal({ count: newTasks.length, tasks: newTasks });
                    
                    // Inject new tasks into active array
                    setTasks(prev => {
                        const updated = [...newTasks, ...prev];
                        setLastTaskIds(new Set(updated.map(t => t.id)));
                        currentStateRef.current.tks = updated;
                        return updated;
                    });
                    
                    // Mark dirty to ensure it persists in the next auto-save to cloud
                    setHasUnsavedChanges(true);
                }
            }
        }
    } catch (e) {
        console.error("Auto-pull error", e);
    }
  };

  useEffect(() => {
      if (autoSyncEnabled) {
          const interval = setInterval(() => {
              if (!hasUnsavedChanges && syncStatus !== 'syncing') {
                 checkForNewTasks();
              }
          }, 60000); // 1 minuto
          return () => clearInterval(interval);
      }
  }, [autoSyncEnabled, hasUnsavedChanges, syncStatus]);

  // Trigger from Cloud Modal or Interval
  const triggerAutoSave = async () => {
    setSyncStatus('syncing');
    try {
      await performFetchMergePush(currentStateRef.current);
      setSyncStatus('saved');
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error("Auto-save failed", e);
      setSyncStatus('error');
      showToast("⚠️ Falló el guardado automático. Revisa conexión.");
    }
  };

  // --- CORE CLOUD LOGIC (Concurrency Safe) ---
  const performFetchMergePush = async (localData: BackupData) => {
    // 1. FETCH LATEST (Critical for concurrency)
    const fetchRes = await fetch(`/api/sync/get`);

    let globalData: GlobalCloudData = { users: {}, lastUpdate: "" };

    if (fetchRes.ok) {
      const result = await fetchRes.json();
      // Verify structure
      if (result.users && !Array.isArray(result.users)) {
        globalData = result;
      }
    }

    if (!globalData.users || Array.isArray(globalData.users)) {
      globalData.users = {};
    }

    // 2. MERGE: Update ONLY current user data
    globalData.users[user] = localData;
    globalData.lastUpdate = new Date().toISOString();

    // 3. PUSH
    const saveRes = await fetch(`/api/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(globalData)
    });

    if (!saveRes.ok) throw new Error("Upload Failed");
  };

  // --- MANUAL CLOUD HANDLERS (From Modal) ---
  const handleManualUpload = async () => {
    showToast("⏳ Subiendo a Sheets...");
    try {
      await performFetchMergePush(currentStateRef.current);
      showToast("✅ Datos subidos y sincronizados.");
      setSyncStatus('saved');
      setHasUnsavedChanges(false);
      setShowCloudSync(false);
    } catch (e) {
      showToast("❌ Error al subir.");
      setSyncStatus('error');
    }
  };

  const handleManualDownload = async () => {
    showToast("⏳ Descargando de Sheets...");
    try {
      const response = await fetch(`/api/sync/get`);

      if (response.ok) {
        const result = await response.json();
        const globalData = result as GlobalCloudData;

        if (globalData && globalData.users && globalData.users[user]) {
          const myData = globalData.users[user];
          // Update state
          if (myData.rtM) setRoutineMaster(myData.rtM);
          if (myData.rtS) setRoutineState(myData.rtS);
          if (myData.tks) setTasks(myData.tks);
          if (myData.cTks) setCompletedTasks(myData.cTks);
          if (myData.dTks) setDeletedTasks(myData.dTks);
          if (myData.h) setHistory(myData.h);
          if (myData.ach) setAchievements(myData.ach);
          if (myData.rtH) setRoutineHistory(myData.rtH);

          // Reset dirty state since we are now in sync with cloud
          setHasUnsavedChanges(false);
          setSyncStatus('saved');
          showToast("✅ Datos actualizados desde Sheets.");
          setShowCloudSync(false);
        } else {
          showToast("⚠️ No hay datos para tu usuario en Sheets.");
        }
      }
    } catch (e) {
      showToast("❌ Error de descarga.");
    }
  };


  // Toast Helper
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Acknowledge new assignment: mark tasks, push to cloud
  const handleAcknowledgeAssignment = async () => {
    if (!newAssignmentModal) return;
    const ackIds = new Set(newAssignmentModal.tasks.map(t => t.id));
    setTasks(prev => {
      const updated = prev.map(t => ackIds.has(t.id) ? { ...t, acknowledged: true } : t);
      currentStateRef.current.tks = updated;
      return updated;
    });
    setNewAssignmentModal(null);
    // Push silenciosamente para que el admin vea el estado actualizado
    try {
      await performFetchMergePush(currentStateRef.current);
    } catch (e) {
      console.error('Ack push failed', e);
    }
  };

  // --- Routine Logic ---
  const toggleRoutine = (id: string) => {
    setRoutineState(prev => ({
      ...prev,
      [id]: { ...prev[id], done: !prev[id]?.done }
    }));
  };

  const updateRoutineNote = (id: string, note: string) => {
    setRoutineState(prev => ({
      ...prev,
      [id]: { ...prev[id], note }
    }));
  };

  const addRoutineItem = () => {
    const id = "c" + Date.now();
    const newItem: RoutineItem = { id, text: "Nueva Tarea", days: "all" };
    setRoutineMaster([...routineMaster, newItem]);
    setEditingRoutineId(id);
  };

  const saveRoutineItem = (item: RoutineItem) => {
    setRoutineMaster(prev => prev.map(r => r.id === item.id ? item : r));
  };

  const deleteRoutineItem = (id: string) => {
    setRoutineMaster(prev => prev.filter(r => r.id !== id));
  };

  const reorderRoutineItem = (draggedId: string, targetId: string) => {
    setRoutineMaster(prev => {
      const draggedIndex = prev.findIndex(r => r.id === draggedId);
      const targetIndex = prev.findIndex(r => r.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const draggedItem = prev[draggedIndex];
      const targetItem = prev[targetIndex];

      // Double check they are in the same block
      const blockA = draggedItem.block || 'start';
      const blockB = targetItem.block || 'start';

      if (blockA !== blockB) return prev;

      const newMaster = [...prev];
      newMaster.splice(draggedIndex, 1);
      newMaster.splice(targetIndex, 0, draggedItem);
      return newMaster;
    });
  };

  const resetRoutine = () => {
    if (confirm("¿Reiniciar día?")) {
      setRoutineState({});
    }
  };

  // --- Task Logic ---
  const addTask = (taskData: Omit<Task, 'id' | 'prio' | 'note'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now(),
      prio: false,
      note: ""
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const deleteTask = (id: number) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (taskToDelete) {
      setDeletedTasks(prev => [{ ...taskToDelete, deleted: true }, ...prev]);
    }
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Prepara la solicitud de Completado (Abre Modal)
  const handleRequestComplete = (task: Task) => {
    setActionTask(task);
    setActionType('complete');
  };

  // Confirma el completado y mueve a registro
  const confirmComplete = (note: string, links: { l1: string, n1: string, l2: string, n2: string }) => {
    if (!actionTask) return;

    // 1. Crear copia para historial y registro con los nuevos links
    const closedTask: Task = {
      ...actionTask,
      closingNote: note,
      closingL1: links.l1, closingN1: links.n1,
      closingL2: links.l2, closingN2: links.n2,
      completedAt: new Date().toLocaleDateString()
    };

    // 2. Mover a completadas
    setCompletedTasks(prev => [closedTask, ...prev]);

    // 3. Log en historial
    const logText = `[${closedTask.cat}] ${closedTask.text} - CERRADA: ${note}`;
    setHistory(prev => [{ t: new Date().toLocaleString(), txt: logText }, ...prev]);

    // 4. Borrar de activas
    setTasks(prev => prev.filter(t => t.id !== actionTask.id));

    // 5. Cleanup
    setActionTask(null);
    setActionType(null);
    showToast("Tarea archivada correctamente.");
  };

  // Restaurar tarea desde el archivo
  const handleRestoreTask = (task: Task) => {
    // Eliminar de completadas y eliminadas
    setCompletedTasks(prev => prev.filter(t => t.id !== task.id));
    setDeletedTasks(prev => prev.filter(t => t.id !== task.id));

    // Volver a activas (limpiando nota de cierre)
    const restoredTask = { ...task, closingNote: undefined, completedAt: undefined, closingL1: undefined, closingN1: undefined, closingL2: undefined, closingN2: undefined, deleted: undefined };
    setTasks(prev => [...prev, restoredTask]);

    showToast("Tarea restaurada a la lista activa.");
  };

  // Prepara solicitud Standby
  const handleRequestStandby = (task: Task) => {
    // Si ya está en standby, la reanudamos directamente (toggle)
    if (task.isStandby) {
      const updated = {
        ...task,
        isStandby: false,
        standbyNote: undefined,
        standbyL1: undefined, standbyN1: undefined,
        standbyL2: undefined, standbyN2: undefined
      };
      updateTask(updated);
      showToast("Tarea reanudada.");
    } else {
      // Si no está en standby, pedimos motivo
      setActionTask(task);
      setActionType('standby');
    }
  };

  const confirmStandby = (note: string, links: { l1: string, n1: string, l2: string, n2: string }) => {
    if (!actionTask) return;
    const updated = {
      ...actionTask,
      isStandby: true,
      standbyNote: note,
      standbyL1: links.l1, standbyN1: links.n1,
      standbyL2: links.l2, standbyN2: links.n2,
    };
    updateTask(updated);
    setActionTask(null);
    setActionType(null);
    showToast("Tarea puesta en Standby.");
  };

  const toggleTaskPriority = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, prio: !t.prio } : t));
  };

  const updateTaskNote = (id: number, note: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, note } : t));
  };

  const updateTaskSubtasks = (id: number, subtasks: Task['subtasks']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, subtasks } : t));
  };

  const reorderTask = (draggedId: number, targetId: number) => {
    setTasks(prev => {
      const draggedIndex = prev.findIndex(t => t.id === draggedId);
      const targetIndex = prev.findIndex(t => t.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newTasks = [...prev];
      const [draggedItem] = newTasks.splice(draggedIndex, 1);
      newTasks.splice(targetIndex, 0, draggedItem);
      return newTasks;
    });
  };

  // Quick Schedule Actions
  const handleQuickSchedule = (id: number, type: 'today' | 'tomorrow') => {
    const d = new Date();
    if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    }
    const dateStr = d.toLocaleDateString('en-CA');
    setTasks(prev => prev.map(t => t.id === id ? { ...t, date: dateStr } : t));
    showToast(type === 'today' ? "📅 Programada para Hoy" : "⏭ Programada para Mañana");
  };

  // --- Global Actions ---
  const handleExport = () => {
    const data: BackupData = { rtM: routineMaster, rtS: routineState, tks: tasks, h: history, cTks: completedTasks, dTks: deletedTasks, ach: achievements, rtH: routineHistory };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${user}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as BackupData;
        if (data.rtM) setRoutineMaster(data.rtM);
        if (data.rtS) setRoutineState(data.rtS);
        if (data.tks) setTasks(data.tks);
        if (data.h) setHistory(data.h);
        if (data.cTks) setCompletedTasks(data.cTks);
        if (data.dTks) setDeletedTasks(data.dTks);
        if (data.ach) setAchievements(data.ach);
        if (data.rtH) setRoutineHistory(data.rtH);
        showToast("✅ Datos restaurados correctamente");
      } catch (err) {
        alert("Error: El archivo de respaldo no es válido.");
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleReport = () => {
    const routinePct = document.getElementById('kpi-routine-value')?.innerText || "0%"; // Fallback
    const doneCount = history.filter(h => h.t.includes(new Date().toLocaleDateString())).length;
    const criticalCount = tasks.filter(t => t.comp === 'high' && !t.isStandby).length; // Excluir standby del reporte

    const txt = `*REPORTE ${user.toUpperCase()} ${new Date().toLocaleDateString()}*\nRutina: ${routinePct}\nHecho hoy: ${doneCount}\nPendientes Críticos: ${criticalCount}`;
    navigator.clipboard.writeText(txt);
    showToast("Reporte copiado al portapapeles");
  };

  // --- KPI Calculations ---
  const dateObj = new Date();
  const todayStr = dateObj.toLocaleDateString('en-CA');
  const localDateStr = dateObj.toLocaleDateString(); // For history/completed check

  const todaysRoutineItems = routineMaster.filter(r => r.days === 'all' || r.days.includes(dateObj.getDay()));
  const doneRoutineCount = todaysRoutineItems.filter(r => routineState[r.id]?.done).length;
  const routinePct = todaysRoutineItems.length ? Math.round((doneRoutineCount / todaysRoutineItems.length) * 100) : 0;

  const tasksDoneToday = history.filter(h => h.t.includes(localDateStr)).length;

  // Calcular desglose de tareas completadas hoy para el KPI
  const completedTodayList = completedTasks.filter(t => t.completedAt === localDateStr);
  const completedBreakdown = {
    low: completedTodayList.filter(t => t.comp === 'low').length,
    med: completedTodayList.filter(t => t.comp === 'med').length,
    high: completedTodayList.filter(t => t.comp === 'high').length
  };

  // Calcular contadores de KPIs
  const standbyCount = tasks.filter(t => t.isStandby).length;

  // Critical Task Count: Alta Complejidad Y QUE NO esté en Standby
  const criticalTasksCount = tasks.filter(t => t.comp === 'high' && !t.isStandby).length;

  const overdueTasksCount = tasks.filter(t => t.date && t.date < todayStr).length;

  const tasksForToday = tasks.filter(t => t.date === todayStr);
  const todayLoad = {
    total: tasksForToday.length,
    high: tasksForToday.filter(t => t.comp === 'high').length,
    med: tasksForToday.filter(t => t.comp === 'med').length,
    low: tasksForToday.filter(t => t.comp === 'low').length,
  };

  // --- LOGICA DE LOGROS (Gamification) ---
  useEffect(() => {
    const prodLowMed = completedBreakdown.low + completedBreakdown.med;
    const prodHigh = completedBreakdown.high;
    let prodLevel = 0;
    if (prodLowMed >= 2 && prodHigh >= 1) prodLevel = 3;
    else if (prodLowMed > 6) prodLevel = 2;
    else if (prodLowMed >= 3) prodLevel = 1;

    const newAchievements: Achievement[] = [];

    const checkAndUnlock = (type: string, title: string, desc: string, icon: string) => {
      const id = `${type}_${todayStr}`;
      if (!achievements.find(a => a.id === id)) {
        newAchievements.push({ id, type, title, desc, date: todayStr, icon });
      }
    };

    // Logro de Rutina
    if (routinePct === 100 && todaysRoutineItems.length > 0) {
      checkAndUnlock('routine_100', '¡Rutina Perfecta!', 'Alcanzaste el 100% de efectividad en tu rutina diaria.', '🏆');
    }

    // Logros de Productividad
    if (prodLevel >= 1) {
      checkAndUnlock('prod_lvl1', 'Productividad Nivel 1', 'Buen ritmo de trabajo. Has completado varias tareas hoy.', '⭐');
    }
    if (prodLevel >= 2) {
      checkAndUnlock('prod_lvl2', 'Productividad Nivel 2', 'Excelente ritmo. Estás avanzando muy rápido.', '🌟');
    }
    if (prodLevel >= 3) {
      checkAndUnlock('prod_lvl3', 'Productividad Nivel 3', '¡Imparable! Has completado tareas complejas y mantenido un gran volumen.', '🔥');
    }

    // Logros de Tareas Asignadas (Admin)
    const adminTasksCompletedToday = completedTodayList.filter(t => t.del === 'Admin' || t.del?.toLowerCase() === 'admin').length;
    const activeAdminTasks = tasks.filter(t => t.del === 'Admin' || t.del?.toLowerCase() === 'admin').length;

    if (adminTasksCompletedToday > 0) {
      checkAndUnlock('admin_task_1', 'Misión Cumplida', 'Completaste una tarea asignada por el administrador.', '🎯');
    }
    if (adminTasksCompletedToday > 0 && activeAdminTasks === 0) {
      checkAndUnlock('admin_tasks_all', 'Bandeja Limpia', 'Completaste todas las tareas asignadas por el administrador.', '✨');
    }

    if (newAchievements.length > 0) {
      setAchievements(prev => [...newAchievements, ...prev]);
      // Mostrar el último logro desbloqueado en el popup
      setAchievementPopup(newAchievements[newAchievements.length - 1]);

      // Lanzar confeti!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.1 },
        colors: ['#FBBF24', '#F59E0B', '#D97706', '#FFFFFF'],
        zIndex: 1000
      });

      setTimeout(() => setAchievementPopup(null), 5000); // Ocultar después de 5 segundos
    }
  }, [routinePct, completedBreakdown.low, completedBreakdown.med, completedBreakdown.high, todaysRoutineItems.length, achievements, todayStr]);

  // Update routine history
  useEffect(() => {
    setRoutineHistory(prev => ({
      ...prev,
      [todayStr]: routinePct
    }));
  }, [routinePct, todayStr]);

  // --- Handlers for Detail Views ---
  const openRoutineDetail = () => {
    setDetailModalTitle("Detalle Rutina Diaria");
    setDetailModalType('routine');
    setDetailModalData(todaysRoutineItems);
    setDetailModalOpen(true);
  };
  const openProductivityDetail = () => {
    setDetailModalTitle("Tareas Completadas Hoy");
    setDetailModalType('tasks_completed');
    setDetailModalData(completedTodayList);
    setDetailModalOpen(true);
  };
  const openActiveDetail = (title: string, filterFn: (t: Task) => boolean) => {
    setDetailModalTitle(title);
    setDetailModalType('tasks_active');
    setDetailModalData(tasks.filter(filterFn));
    setDetailModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen font-sans bg-bgBody text-textPrimary overflow-y-auto md:overflow-hidden relative">
      <Header
        user={user}
        onExport={handleExport}
        onImport={handleImport}
        onReport={handleReport}
        onOpenAssistant={() => setShowAssistant(true)}
        onOpenCloud={() => setShowCloudSync(true)}
        onOpenAchievements={() => setShowAchievements(true)}
        onOpenStats={() => setShowStats(true)}
        onLogout={onLogout}
        onSwitchToAdmin={onSwitchToAdmin}
        syncStatus={syncStatus}
      />

      <span id="kpi-routine-value" className="hidden">{routinePct}%</span>

      <div className="relative z-10">
        {/* Toggle Panel UI */}
        <div className="flex justify-end px-5 pt-3 pb-1 max-w-[1600px] mx-auto w-full">
            <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                <input type="checkbox" className="sr-only" checked={autoSyncEnabled} onChange={(e) => setAutoSyncEnabled(e.target.checked)} />
                <div className={`w-2.5 h-2.5 rounded-full ${autoSyncEnabled ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`}></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{autoSyncEnabled ? 'Auto-Sync Activo' : 'Auto-Sync Pausado'}</span>
            </label>
        </div>
        <KPIBoard
          routinePercentage={routinePct}
          tasksDoneToday={tasksDoneToday}
          criticalTasksCount={criticalTasksCount}
          todayLoad={todayLoad}
          overdueCount={overdueTasksCount}
          completedBreakdown={completedBreakdown}
          standbyCount={standbyCount}
          onRoutineClick={openRoutineDetail}
          onProductivityClick={openProductivityDetail}
          onOverdueClick={() => openActiveDetail("Tareas Vencidas", t => !!(t.date && t.date < todayStr))}
          onStandbyClick={() => openActiveDetail("Tareas en Standby", t => !!t.isStandby)}
          onBottleneckClick={() => openActiveDetail("Cuello de Botella (Complejas)", t => t.comp === 'high' && !t.isStandby)}
        />
      </div>

      {/* Main Container: Increased pb-12 for more separation from footer */}
      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 pb-12 h-auto md:h-full md:overflow-hidden">
        <RoutinePanel
          items={routineMaster}
          state={routineState}
          onToggle={toggleRoutine}
          onUpdateNote={updateRoutineNote}
          onAdd={addRoutineItem}
          onEdit={setEditingRoutineId}
          onReset={resetRoutine}
          onOpenManager={() => setShowRoutineManager(true)}
          onReorder={reorderRoutineItem}
        />
        <TaskPanel
          tasks={tasks}
          onAdd={addTask}
          onEdit={setEditingTask}
          onDelete={deleteTask}
          onRequestComplete={handleRequestComplete}
          onRequestStandby={handleRequestStandby}
          onTogglePriority={toggleTaskPriority}
          onUpdateNote={updateTaskNote}
          onUpdateSubtasks={updateTaskSubtasks}
          onReorder={reorderTask}
          onQuickSchedule={handleQuickSchedule}
          onOpenHistory={() => setShowHistory(true)}
          onOpenCompletedRegistry={() => setShowCompletedRegistry(true)}
        />
      </main>

      {/* Modals */}
      {actionType === 'complete' && actionTask && (
        <NoteActionModal
          title="Cerrar Tarea"
          description={`Indica una observación final para: "${actionTask.text}"`}
          placeholder="Motivo de cierre, resultados, etc..."
          onConfirm={confirmComplete}
          onClose={() => { setActionType(null); setActionTask(null); }}
        />
      )}

      {actionType === 'standby' && actionTask && (
        <NoteActionModal
          title="Poner en Standby"
          description={`¿Por qué se detiene "${actionTask.text}"?`}
          placeholder="Falta información de X, esperando aprobación, etc..."
          onConfirm={confirmStandby}
          onClose={() => { setActionType(null); setActionTask(null); }}
        />
      )}

      {showCompletedRegistry && (
        <CompletedTasksModal
          tasks={completedTasks}
          onRestore={handleRestoreTask}
          onClose={() => setShowCompletedRegistry(false)}
        />
      )}

      {detailModalOpen && (
        <KPIDetailsModal
          title={detailModalTitle}
          type={detailModalType}
          data={detailModalData}
          routineState={routineState}
          onClose={() => setDetailModalOpen(false)}
        />
      )}

      {editingRoutineId && (
        <RoutineModal
          item={routineMaster.find(r => r.id === editingRoutineId)!}
          onSave={saveRoutineItem}
          onDelete={deleteRoutineItem}
          onClose={() => setEditingRoutineId(null)}
        />
      )}

      {showRoutineManager && (
        <RoutineManagerModal
          items={routineMaster}
          onEdit={(id) => {
            setShowRoutineManager(false);
            setEditingRoutineId(id);
          }}
          onClose={() => setShowRoutineManager(false)}
        />
      )}

      {editingTask && (
        <TaskModal
          task={editingTask}
          onSave={updateTask}
          onClose={() => setEditingTask(null)}
        />
      )}

      {showHistory && (
        <HistoryModal
          history={history}
          onClose={() => setShowHistory(false)}
          onDownload={() => alert("Función: Selecciona y copia el texto del historial.")}
        />
      )}

      {showAssistant && (
        <AsistenteChat onClose={() => setShowAssistant(false)} />
      )}

      {showCloudSync && (
        <CloudSyncModal
          onClose={() => setShowCloudSync(false)}
          onUpload={handleManualUpload}
          onDownload={handleManualDownload}
        />
      )}

      {showAchievements && (
        <AchievementsModal
          achievements={achievements}
          onClose={() => setShowAchievements(false)}
        />
      )}

      {showStats && (
        <StatsModal
          completedTasks={completedTasks}
          routineHistory={routineHistory}
          onClose={() => setShowStats(false)}
        />
      )}

      {/* Achievement Popup Animation */}
      {achievementPopup && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-slate-900 to-slate-800 border-2 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.4)] rounded-2xl p-5 flex items-center gap-5 z-[100] animate-in slide-in-from-top-8 fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-50 animate-pulse rounded-full"></div>
            <div className="text-5xl relative z-10 animate-bounce drop-shadow-lg">{achievementPopup.icon}</div>
          </div>
          <div className="pr-4">
            <div className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em] mb-1 drop-shadow-sm">¡Logro Desbloqueado!</div>
            <div className="text-xl font-bold text-white mb-0.5">{achievementPopup.title}</div>
            <div className="text-sm text-slate-300 font-medium">{achievementPopup.desc}</div>
          </div>
        </div>
      )}

      {/* Toast Notification (general) */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#323232] text-white px-4 py-2 text-xs rounded shadow-lg transition-all duration-500 z-[100] ${toast ? 'opacity-100' : 'opacity-0 pointer-events-none scale-95'}`}
      >
        {toast}
      </div>

      {/* NEW ASSIGNMENT MODAL — Centered, persistent, requires manual close */}
      {newAssignmentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-green-400 animate-in zoom-in-95 slide-in-from-bottom-4 duration-400">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl animate-bounce">🔔</div>
                <div>
                  <div className="text-[11px] font-black text-green-100 uppercase tracking-[0.2em] mb-0.5">Nueva Asignación</div>
                  <h2 className="text-xl font-bold text-white leading-tight">¡Tenés {newAssignmentModal.count} tarea{newAssignmentModal.count > 1 ? 's' : ''} nueva{newAssignmentModal.count > 1 ? 's' : ''}!</h2>
                </div>
              </div>
            </div>

            {/* Task list */}
            <div className="px-6 py-4 max-h-64 overflow-y-auto">
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">El administrador te delegó:</p>
              <div className="space-y-2">
                {newAssignmentModal.tasks.map(t => (
                  <div key={t.id} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3">
                    <span className="text-green-500 mt-0.5 shrink-0">▶</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{t.text}</p>
                      {t.date && <p className="text-[11px] text-gray-400 mt-0.5">📅 Vence: {t.date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleAcknowledgeAssignment}
                className="bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                ✅ Entendido, ya lo veo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-2 right-4 text-[10px] text-gray-500 font-mono pointer-events-none select-none z-[40] text-right leading-tight">
        <div>APP Gestor de tareas (creada por Nicolas Andreola)</div>
        <div>Última modificación: {LAST_UPDATE}</div>
      </div>
    </div>
  );
};

export default Dashboard;