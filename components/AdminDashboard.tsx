import React, { useState, useEffect, useRef } from 'react';
import { Users, BarChart3, CheckSquare, AlertTriangle, ArrowRight, Plus, UserCircle, LogOut, Trash2, LayoutDashboard, RefreshCw, Clock, Code, Key, ShieldAlert, Globe, Github, Server, FileText, ExternalLink, Sun, Calendar, ChevronDown, ChevronUp, X, Info, Link as LinkIcon, Loader2, Cloud, AlertCircle, PauseCircle, CalendarDays, CheckCircle2, Circle, Archive, ClipboardList } from 'lucide-react';
import { Task, RoutineItem, RoutineState, Category, Complexity, GlobalCloudData, TIME_BLOCKS, COMPLEXITY_LABELS, CATEGORY_COLORS } from '../types';
import { KPIDetailsModal, CompletedTasksModal } from './Modals';
import KPIBoard from './KPIBoard';

interface AdminDashboardProps {
    onLogout: () => void;
    onSwitchToPersonal: () => void;
    currentUser: string;
}

// VERSION CONTROL (Synced with Personal Dashboard)
const LAST_UPDATE = new Date().toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onSwitchToPersonal, currentUser }) => {
    const [users, setUsers] = useState<string[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    // Data del usuario seleccionado
    const [userTasks, setUserTasks] = useState<Task[]>([]);
    const [userRoutineMaster, setUserRoutineMaster] = useState<RoutineItem[]>([]);
    const [userRoutineState, setUserRoutineState] = useState<RoutineState>({});
    const [userCompletedTasks, setUserCompletedTasks] = useState<Task[]>([]); // New: For productivity calc and details
    const [userDeletedTasks, setUserDeletedTasks] = useState<Task[]>([]); // New: For deleted history

    // Formulario de Delegación
    const [newTaskText, setNewTaskText] = useState("");
    const [newTaskNote, setNewTaskNote] = useState("");
    const [newTaskL1, setNewTaskL1] = useState("");
    const [newTaskN1, setNewTaskN1] = useState("");
    const [newTaskL2, setNewTaskL2] = useState("");
    const [newTaskN2, setNewTaskN2] = useState("");
    const [newTaskPrio, setNewTaskPrio] = useState(false);
    const [newTaskDate, setNewTaskDate] = useState("");
    const [newTaskCategory, setNewTaskCategory] = useState<Category | "">("");

    // Cloud Sync
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<string>("");
    const [autoRefresh, setAutoRefresh] = useState(false);

    // UI States
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
    const [showTokenHelp, setShowTokenHelp] = useState(false);

    // Modal Details State
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailModalTitle, setDetailModalTitle] = useState("");
    const [detailModalType, setDetailModalType] = useState<'routine' | 'tasks_completed' | 'tasks_active'>('tasks_active');
    const [detailModalData, setDetailModalData] = useState<any[]>([]);
    const [showCompletedRegistry, setShowCompletedRegistry] = useState(false);

    // Expanded Tasks State (For Summary View)
    const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());

    // Assigned History Filter State
    const [assignedHistoryFilter, setAssignedHistoryFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [expandedAssignedIds, setExpandedAssignedIds] = useState<Set<number>>(new Set());

    const refreshIntervalRef = useRef<number | null>(null);

    // Cargar lista de usuarios al inicio
    useEffect(() => {
        const usersDb = JSON.parse(localStorage.getItem('v25_auth_users') || '{}');
        const userList = Object.keys(usersDb).filter(u => u !== currentUser.toLowerCase());
        setUsers(userList);
        if (userList.length > 0) setSelectedUser(userList[0]);
    }, [currentUser]);

    // Cargar datos cuando cambia el usuario seleccionado
    useEffect(() => {
        if (!selectedUser) return;
        loadUserData(selectedUser);
    }, [selectedUser]);

    // AUTO-REFRESH LOGIC
    useEffect(() => {
        if (autoRefresh) {
            refreshIntervalRef.current = window.setInterval(() => {
                handleGlobalSync(true); // Silent sync
            }, 60000); // 60 segundos
        } else {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        }
        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [autoRefresh]);

    const getUserKey = (u: string, key: string) => `v25_user_${u}_${key}`;

    const loadUserData = (username: string) => {
        const t = JSON.parse(localStorage.getItem(getUserKey(username, "tasks")) || '[]');
        const rm = JSON.parse(localStorage.getItem(getUserKey(username, "rt_master")) || '[]');
        const rs = JSON.parse(localStorage.getItem(getUserKey(username, "rt_state")) || '{}');
        const ct = JSON.parse(localStorage.getItem(getUserKey(username, "completed_tasks")) || '[]'); // Fetch completed
        const dt = JSON.parse(localStorage.getItem(getUserKey(username, "deleted_tasks")) || '[]'); // Fetch deleted

        setUserTasks(t);
        setUserRoutineMaster(rm);
        setUserRoutineState(rs);
        setUserCompletedTasks(ct);
        setUserDeletedTasks(dt);
    };

    const handleRestoreTask = (task: Task) => {
        if (!selectedUser) return;

        // Remove from completed or deleted
        const newCompleted = userCompletedTasks.filter(t => t.id !== task.id);
        setUserCompletedTasks(newCompleted);
        localStorage.setItem(getUserKey(selectedUser, "completed_tasks"), JSON.stringify(newCompleted));

        const newDeleted = userDeletedTasks.filter(t => t.id !== task.id);
        setUserDeletedTasks(newDeleted);
        localStorage.setItem(getUserKey(selectedUser, "deleted_tasks"), JSON.stringify(newDeleted));

        // Add to active (remove closing info)
        const restoredTask = { ...task, completedAt: undefined, closingNote: undefined, closingL1: undefined, closingN1: undefined, closingL2: undefined, closingN2: undefined, deleted: undefined };
        const newTasks = [...userTasks, restoredTask];
        setUserTasks(newTasks);
        localStorage.setItem(getUserKey(selectedUser, "tasks"), JSON.stringify(newTasks));

        alert("Tarea restaurada al tablero del usuario.");
    };

    const toggleTaskExpansion = (id: number) => {
        const next = new Set(expandedTaskIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedTaskIds(next);
    };

    const handleDelegateTask = async () => {
        if (!selectedUser || !newTaskText.trim()) return;

        // 1. Crear el objeto de tarea
        const newTask: Task = {
            id: Date.now(),
            text: newTaskText,
            cat: newTaskCategory || 'Otro', // Default category if empty
            comp: 'med',
            date: newTaskDate || undefined, // Optional date
            l1: newTaskL1, n1: newTaskN1,
            l2: newTaskL2, n2: newTaskN2,
            del: 'Admin', // Marcado como delegado por Admin
            prio: newTaskPrio,
            note: newTaskNote || 'Asignado por Administración'
        };

        // 2. Actualización Optimista (Local)
        const updatedTasks = [...userTasks, newTask];
        localStorage.setItem(getUserKey(selectedUser, "tasks"), JSON.stringify(updatedTasks));
        setUserTasks(updatedTasks);

        // 3. INTENTO DE SINCRONIZACIÓN CLOUD (Push directo a Sheets)
        setIsAssigning(true);
        try {
            // A. Traer datos frescos de la nube (para no sobrescribir)
            const fetchRes = await fetch(`/api/sync/get`);

            if (fetchRes.ok) {
                const result = await fetchRes.json();
                let globalData = result as GlobalCloudData;

                if (!globalData.users) globalData.users = {};
                if (!globalData.users[selectedUser]) {
                    globalData.users[selectedUser] = { tks: [], rtM: [], rtS: {}, h: [], cTks: [] };
                }

                // Asegurarse de que 'tks' existe
                if (!globalData.users[selectedUser].tks) globalData.users[selectedUser].tks = [];

                // B. Insertar la nueva tarea en la lista de la nube
                globalData.users[selectedUser].tks.push(newTask);
                globalData.lastUpdate = new Date().toISOString();

                // C. Subir (Push) los datos actualizados
                await fetch(`/api/sync/push`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(globalData)
                });

                alert(`✅ Tarea asignada a ${selectedUser.toUpperCase()} y sincronizada en Sheets.`);
            } else {
                throw new Error("Error fetching latest data from backend");
            }
        } catch (e) {
            console.error(e);
            alert(`⚠️ Tarea guardada LOCALMENTE. Error al subir a Google Sheets: ${e}`);
        } finally {
            setIsAssigning(false);
        }

        // Reset form
        setNewTaskText("");
        setNewTaskNote("");
        setNewTaskL1(""); setNewTaskN1("");
        setNewTaskL2(""); setNewTaskN2("");
        setNewTaskPrio(false);
        setNewTaskDate("");
        setNewTaskCategory("");
    };

    const handleDeleteUser = () => {
        if (!selectedUser) return;
        if (confirm(`¿Estás seguro de ELIMINAR al usuario ${selectedUser} y todos sus datos? Esta acción no se puede deshacer.`)) {
            localStorage.removeItem(getUserKey(selectedUser, "tasks"));
            localStorage.removeItem(getUserKey(selectedUser, "rt_master"));
            localStorage.removeItem(getUserKey(selectedUser, "rt_state"));
            localStorage.removeItem(getUserKey(selectedUser, "hist"));
            localStorage.removeItem(getUserKey(selectedUser, "completed_tasks"));

            const usersDb = JSON.parse(localStorage.getItem('v25_auth_users') || '{}');
            delete usersDb[selectedUser];
            localStorage.setItem('v25_auth_users', JSON.stringify(usersDb));

            const newList = users.filter(u => u !== selectedUser);
            setUsers(newList);
            setSelectedUser(newList.length > 0 ? newList[0] : null);
        }
    };

    const handleGlobalSync = async (silent = false) => {
        if (!silent) setIsSyncing(true);

        try {
            const response = await fetch(`/api/sync/get`);

            if (response.ok) {
                const result = await response.json();
                const globalData = result as GlobalCloudData;

                if (globalData && globalData.users && !Array.isArray(globalData.users)) {
                    Object.keys(globalData.users).forEach(u => {
                        const d = globalData.users[u];
                        if (d.tks) localStorage.setItem(getUserKey(u, "tasks"), JSON.stringify(d.tks));
                        if (d.rtM) localStorage.setItem(getUserKey(u, "rt_master"), JSON.stringify(d.rtM));
                        if (d.rtS) localStorage.setItem(getUserKey(u, "rt_state"), JSON.stringify(d.rtS));
                        if (d.cTks) localStorage.setItem(getUserKey(u, "completed_tasks"), JSON.stringify(d.cTks));
                        if (d.dTks) localStorage.setItem(getUserKey(u, "deleted_tasks"), JSON.stringify(d.dTks));
                    });

                    if (selectedUser) loadUserData(selectedUser);
                    setLastUpdate(new Date().toLocaleTimeString());
                    if (!silent) alert("Sincronización global completada.");
                }
            }
        } catch (e) {
            console.error(e);
            if (!silent) alert("Error de conexión.");
        } finally {
            setIsSyncing(false);
        }
    };

    const groupTasks = () => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const overdue: Task[] = [];
        const today: Task[] = [];
        const backlog: Task[] = [];
        const standby: Task[] = [];
        const bottleneck: Task[] = [];

        userTasks.forEach(t => {
            if (t.isStandby) standby.push(t);
            else {
                if (t.comp === 'high') bottleneck.push(t); // Critical active tasks
                if (t.date) {
                    if (t.date < todayStr) overdue.push(t);
                    else if (t.date === todayStr) today.push(t);
                    else backlog.push(t);
                } else {
                    backlog.push(t);
                }
            }
        });
        return { overdue, today, backlog, standby, bottleneck };
    };

    // --- Calculations for KPI Board ---
    const groupedTasks = groupTasks();

    const todayDateObj = new Date();
    const todayStr = todayDateObj.toLocaleDateString('en-CA');
    const todayRoutineItems = userRoutineMaster.filter(r => r.days === 'all' || r.days.includes(todayDateObj.getDay()));
    const doneRoutineCount = todayRoutineItems.filter(r => userRoutineState[r.id]?.done).length;
    const routinePct = todayRoutineItems.length ? Math.round((doneRoutineCount / todayRoutineItems.length) * 100) : 0;

    // Productivity: Completed Today
    const completedTodayList = userCompletedTasks.filter(t => t.completedAt === new Date().toLocaleDateString());
    const productivityScore = completedTodayList.length;
    const adminAssignedCompleted = completedTodayList.filter(t => t.del === 'Admin').length;

    // Assigned History Logic (Derived)
    const allAssignedHistory = [
        ...userTasks.filter(t => t.del === 'Admin').map(t => ({ ...t, status: t.isStandby ? 'standby' : 'active' })),
        ...userCompletedTasks.filter(t => t.del === 'Admin').map(t => ({ ...t, status: 'completed' })),
        ...userDeletedTasks.filter(t => t.del === 'Admin' && !userCompletedTasks.some(c => c.id === t.id)).map(t => ({ ...t, status: 'deleted' }))
    ].sort((a, b) => b.id - a.id);

    const assignedHistory = allAssignedHistory.filter(t => {
        if (assignedHistoryFilter === 'active') return t.status === 'active' || t.status === 'standby';
        if (assignedHistoryFilter === 'inactive') return t.status !== 'active' && t.status !== 'standby';
        return true;
    });

    // Breakdown for Productivity Gamification
    const completedBreakdown = {
        high: completedTodayList.filter(t => t.comp === 'high').length,
        med: completedTodayList.filter(t => t.comp === 'med').length,
        low: completedTodayList.filter(t => t.comp === 'low').length
    };

    // Breakdown for Today Load
    const todayLoad = {
        total: groupedTasks.today.length,
        high: groupedTasks.today.filter(t => t.comp === 'high').length,
        med: groupedTasks.today.filter(t => t.comp === 'med').length,
        low: groupedTasks.today.filter(t => t.comp === 'low').length
    };

    // --- Handlers for Detail Views ---
    const openRoutineDetail = () => {
        setDetailModalTitle("Detalle Rutina Diaria");
        setDetailModalType('routine');
        setDetailModalData(todayRoutineItems);
        setDetailModalOpen(true);
    };
    const openProductivityDetail = () => {
        setDetailModalTitle("Tareas Completadas Hoy");
        setDetailModalType('tasks_completed');
        setDetailModalData(completedTodayList);
        setDetailModalOpen(true);
    };
    const openActiveDetail = (title: string, data: Task[]) => {
        setDetailModalTitle(title);
        setDetailModalType('tasks_active');
        setDetailModalData(data);
        setDetailModalOpen(true);
    };

    // --- Visual Helpers ---
    const getComplexityBadge = (comp: Complexity) => {
        let colors = '';
        if (comp === 'low') colors = 'bg-emerald-50 text-emerald-600 border-emerald-100';
        else if (comp === 'med') colors = 'bg-orange-50 text-orange-600 border-orange-100';
        else colors = 'bg-rose-50 text-rose-600 border-rose-100';

        return (
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${colors}`}>
                {COMPLEXITY_LABELS[comp]}
            </span>
        );
    };

    const renderTaskWithDetails = (t: Task) => {
        const isExpanded = expandedTaskIds.has(t.id);
        return (
            <div
                key={t.id}
                onClick={() => toggleTaskExpansion(t.id)}
                className="bg-white border border-gray-200 p-2 rounded shadow-sm hover:border-blue-300 transition-colors cursor-pointer"
            >
                <div className="flex justify-between items-start mb-1">
                    <div className="flex gap-1">
                        {t.prio && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded font-bold">★ PRIO</span>}
                        {getComplexityBadge(t.comp)}
                    </div>
                    <span className="text-[9px] text-gray-400 font-mono">{t.date || 'S/F'}</span>
                </div>
                <p className="text-[11px] font-normal text-textPrimary mb-1">{t.text}</p>

                <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-1 flex-wrap">
                        <span
                            className="text-[9px] px-1.5 py-0.5 rounded text-white inline-block"
                            style={{ backgroundColor: CATEGORY_COLORS[t.cat] }}
                        >
                            {t.cat}
                        </span>
                        {/* ADMIN BADGE */}
                        {t.del === 'Admin' && (
                            <span className="text-[9px] bg-gray-800 text-white px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                ADMIN
                            </span>
                        )}
                    </div>
                    {isExpanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
                </div>

                {/* DETAILS (EXPANDED) */}
                {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-gray-100 animate-in slide-in-from-top-1">
                        {t.note ? (
                            <div className="text-[11px] text-gray-600 italic mb-2 bg-gray-50 p-1.5 rounded">
                                "{t.note}"
                            </div>
                        ) : (
                            <div className="text-[10px] text-gray-400 italic mb-2">Sin observaciones.</div>
                        )}

                        {(t.l1 || t.l2) && (
                            <div className="flex flex-col gap-1">
                                {t.l1 && (
                                    <a href={t.l1} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded" onClick={e => e.stopPropagation()}>
                                        <ExternalLink size={10} /> {t.n1 || 'Link 1'}
                                    </a>
                                )}
                                {t.l2 && (
                                    <a href={t.l2} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded" onClick={e => e.stopPropagation()}>
                                        <ExternalLink size={10} /> {t.n2 || 'Link 2'}
                                    </a>
                                )}
                            </div>
                        )}
                        {!t.l1 && !t.l2 && <div className="text-[10px] text-gray-400 italic">Sin adjuntos.</div>}
                    </div>
                )}
            </div>
        );
    };

    const logoUrl = "https://drive.google.com/thumbnail?id=1BkFrIklMROkiE8ekHz3UpWjw7Yoo58dW&sz=h200";

    // --- DEVELOPER LINKS COMPONENT ---
    const DevLink = ({ href, icon, label, warning, onClick }: { href?: string, icon: React.ReactNode, label: string, warning?: string, onClick?: () => void }) => {
        const content = (
            <>
                <span className="opacity-70 group-hover:opacity-100">{icon}</span>
                <div className="flex flex-col items-start text-left">
                    <span className="leading-none">{label}</span>
                    {warning && <span className="text-[9px] text-red-500 font-bold leading-none mt-0.5">{warning}</span>}
                </div>
            </>
        );

        const baseClass = "flex items-center gap-2 text-[11px] text-textSecondary hover:text-accentBlue hover:bg-blue-50 px-2 py-1.5 rounded transition-colors group w-full";

        if (onClick) {
            return <button onClick={onClick} className={baseClass}>{content}</button>;
        }
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={baseClass}>
                {content}
            </a>
        );
    };

    return (
        <div className="flex h-screen bg-bgBody font-sans overflow-hidden">

            {/* SIDEBAR */}
            <aside className="w-64 bg-white border-r border-borderLight flex flex-col shrink-0 z-20 shadow-sm overflow-hidden relative">
                <div className="p-5 border-b border-borderLight flex items-center gap-3 shrink-0">
                    <img src={logoUrl} className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
                    <div>
                        <h1 className="font-bold text-textPrimary text-sm">ADMINISTRADOR</h1>
                        <p className="text-[10px] text-textSecondary">Panel de Control</p>
                    </div>
                </div>

                {/* User List */}
                <div className="p-4 flex-1 overflow-y-auto">
                    <h3 className="text-xs font-bold text-textSecondary uppercase mb-3 px-2">Equipo ({users.length})</h3>
                    <div className="flex flex-col gap-1">
                        {users.length === 0 && <p className="text-xs text-gray-400 px-2">No hay otros usuarios.</p>}
                        {users.map(u => (
                            <button
                                key={u}
                                onClick={() => setSelectedUser(u)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${selectedUser === u ? 'bg-blue-50 text-accentBlue font-medium border border-blue-100' : 'text-textPrimary hover:bg-gray-50'}`}
                            >
                                <UserCircle size={18} />
                                <span className="capitalize truncate">{u}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sync Controls */}
                <div className="px-4 pb-2 flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between text-[10px] text-textSecondary px-1">
                        <span className="flex items-center gap-1"><Clock size={10} /> {lastUpdate || '---'}</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="accent-accentBlue" />
                            Auto (1m)
                        </label>
                    </div>
                    <button
                        onClick={() => handleGlobalSync(false)}
                        disabled={isSyncing}
                        className="w-full bg-blue-50 text-accentBlue border border-blue-100 hover:bg-blue-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                        {isSyncing ? "Sincronizando..." : "Actualizar Todo"}
                    </button>
                </div>

                {/* DEVELOPER TOOLS SECTION */}
                <div className="border-t border-borderLight bg-gray-50 flex flex-col shrink-0">
                    <button
                        onClick={() => setIsDevToolsOpen(!isDevToolsOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-bold text-gray-400 uppercase hover:bg-gray-100 transition-colors"
                    >
                        <span className="flex items-center gap-1"><Code size={10} /> Configuración App</span>
                        {isDevToolsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {isDevToolsOpen && (
                        <div className="px-3 pb-3 overflow-y-auto max-h-[200px] shrink-0 custom-scrollbar animate-in slide-in-from-top-2">
                            <div className="flex flex-col gap-0.5">
                                <DevLink
                                    href="https://aistudio.google.com/apps/drive/1o2S1UoYnTzYmAiU1RuMNs5iyiIPLaOxa?showAssistant=true&showPreview=true"
                                    icon={<Code size={14} />}
                                    label="Google AI Studio (Proyecto)"
                                />
                                <DevLink
                                    href="https://aistudio.google.com/app/api-keys?projectFilter=gen-lang-client-0508130572"
                                    icon={<Key size={14} />}
                                    label="Google AI Studio (API Key)"
                                />
                                <DevLink
                                    href="https://console.cloud.google.com/auth/clients/270210570235-64gpfb89fi5s39514h6l88osv72hijrp.apps.googleusercontent.com?project=gen-lang-client-0377615287&rapt=AEjHL4PCn5e4kGpigTK6p-NzzDsS2QeVyn55Q4W3hb-VC_Nv8ugvsgOSF7wTD0PhAGxIpESC8q-Gdc15Dd5jcbS8TNAyyywbSsFso_TwZMzohtfhBWenIYk"
                                    icon={<ShieldAlert size={14} />}
                                    label="Google Cloud (Origenes)"
                                />
                                <DevLink
                                    onClick={() => setShowTokenHelp(true)}
                                    icon={<ShieldAlert size={14} className="text-red-500" />}
                                    label="Generar Token Drive"
                                    warning="⚠️ IMPORTANTE: LEER AVISO"
                                />
                                <div className="h-px bg-gray-200 my-1"></div>
                                <DevLink
                                    href="https://github.com/nicolasandreola-stack/app-gestion-proyectos/tree/main"
                                    icon={<Github size={14} />}
                                    label="GitHub Repo"
                                />
                                <DevLink
                                    href="https://vercel.com/nicolas-projects-21bdaad2/app-gestion-proyectos/ANTBf1mPoxYf7rFindzf7h7M1aZY"
                                    icon={<Server size={14} />}
                                    label="Vercel Project"
                                />
                                <DevLink
                                    href="https://docs.google.com/document/d/1lnlpmdTaTUIAWvMMGN_KX-PI4KvyOwz2xzkKJ2HR0MQ/edit?tab=t.0"
                                    icon={<FileText size={14} />}
                                    label="Bitácora Proyecto"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-borderLight flex flex-col gap-2 shrink-0 bg-white">
                    <button onClick={onSwitchToPersonal} className="flex items-center gap-2 text-textPrimary hover:bg-gray-100 px-3 py-2 rounded-lg w-full transition-colors text-sm font-medium">
                        <LayoutDashboard size={16} /> Mi Tablero Personal
                    </button>
                    <button onClick={onLogout} className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg w-full transition-colors text-sm">
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* TOKEN HELP MODAL */}
            {showTokenHelp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-borderLight">
                        <div className="bg-red-50 px-5 py-4 border-b border-red-100 flex justify-between items-center">
                            <h3 className="font-bold text-red-700 flex items-center gap-2">
                                <ShieldAlert size={20} /> INSTRUCCIONES OBLIGATORIAS
                            </h3>
                            <button onClick={() => setShowTokenHelp(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-textPrimary leading-relaxed">
                                Para que el asistente pueda leer archivos, debes generar el token con un permiso específico ("Scope") que no está marcado por defecto.
                            </p>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-2 font-medium text-gray-700">
                                <div className="flex gap-2">
                                    <span className="bg-gray-200 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold">1</span>
                                    <span>En <b>Step 1</b>, busca "Drive API v3".</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="bg-red-100 text-red-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold border border-red-200">2</span>
                                    <span>Selecciona ÚNICAMENTE: <br /><code className="bg-white px-1 rounded border border-gray-300 text-red-600 break-all">https://www.googleapis.com/auth/drive.readonly</code></span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="bg-gray-200 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold">3</span>
                                    <span>Haz click en <b>Authorize APIs</b>.</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="bg-gray-200 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold">4</span>
                                    <span>En <b>Step 2</b>, dale a "Exchange authorization code for tokens".</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="bg-gray-200 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold">5</span>
                                    <span>Copia el <b>Access token</b> y pégalo en la configuración de la App.</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowTokenHelp(false)} className="px-4 py-2 rounded text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
                                <a
                                    href="https://developers.google.com/oauthplayground"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setShowTokenHelp(false)}
                                    className="bg-accentBlue text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 flex items-center gap-2"
                                >
                                    Entendido, ir a Google <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {detailModalOpen && (
                <KPIDetailsModal
                    title={detailModalTitle}
                    type={detailModalType}
                    data={detailModalData}
                    routineState={userRoutineState}
                    onClose={() => setDetailModalOpen(false)}
                />
            )}

            {/* COMPLETED TASKS MODAL */}
            {showCompletedRegistry && (
                <CompletedTasksModal
                    tasks={userCompletedTasks}
                    onRestore={handleRestoreTask}
                    onClose={() => setShowCompletedRegistry(false)}
                />
            )}

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {selectedUser ? (
                    <>
                        <header className="h-[60px] bg-white border-b border-borderLight px-6 flex items-center justify-between shadow-sm shrink-0">
                            <div className="flex items-center gap-2">
                                <UserCircle size={24} className="text-gray-400" />
                                <h2 className="text-xl font-light text-textPrimary capitalize">
                                    Tablero de <span className="font-bold">{selectedUser}</span>
                                </h2>
                                <button
                                    onClick={() => setShowCompletedRegistry(true)}
                                    className="ml-2 p-1.5 text-gray-400 hover:text-accentBlue hover:bg-blue-50 rounded transition-colors"
                                    title="Ver Archivo de Tareas"
                                >
                                    <Archive size={18} />
                                </button>
                            </div>
                            <button onClick={handleDeleteUser} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded" title="Eliminar Usuario">
                                <Trash2 size={16} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 pb-12 custom-scrollbar">

                            {/* KPI BOARD REPLICA */}
                            <div className="mb-6">
                                <KPIBoard
                                    routinePercentage={routinePct}
                                    tasksDoneToday={productivityScore}
                                    criticalTasksCount={groupedTasks.bottleneck.length}
                                    todayLoad={todayLoad}
                                    overdueCount={groupedTasks.overdue.length}
                                    completedBreakdown={completedBreakdown}
                                    standbyCount={groupedTasks.standby.length}
                                    adminAssignedCount={adminAssignedCompleted}
                                    // Handlers
                                    onRoutineClick={openRoutineDetail}
                                    onProductivityClick={openProductivityDetail}
                                    onOverdueClick={() => openActiveDetail("Tareas Vencidas", groupedTasks.overdue)}
                                    onStandbyClick={() => openActiveDetail("Tareas en Standby", groupedTasks.standby)}
                                    onBottleneckClick={() => openActiveDetail("Cuello de Botella (Complejas)", groupedTasks.bottleneck)}
                                />
                            </div>

                            {/* NEW LAYOUT: TOP ZONE (DELEGATION + DONUT + HISTORY) */}
                            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_220px_1.1fr] gap-6 mb-6">
                                
                                {/* 1. DELEGATION PANEL (WIDE) */}
                                <div className="bg-white border border-borderLight rounded-xl p-6 shadow-sm flex flex-col transition-all hover:shadow-md h-[400px]">
                                    <h3 className="font-bold text-textPrimary mb-5 flex items-center gap-2">
                                        <ArrowRight size={20} className="text-accentBlue" /> Asignar Nueva Tarea
                                    </h3>
                                    <div className="space-y-4">
                                        <textarea
                                            value={newTaskText}
                                            onChange={(e) => setNewTaskText(e.target.value)}
                                            placeholder={`Describe la tarea principal para ${selectedUser}...`}
                                            className="w-full p-3.5 border border-borderLight rounded-lg text-sm focus:border-accentBlue focus:ring-2 focus:ring-accentBlue/20 outline-none bg-gray-50 text-gray-900 min-h-[60px] transition-all"
                                        />

                                        <textarea
                                            value={newTaskNote}
                                            onChange={(e) => setNewTaskNote(e.target.value)}
                                            placeholder="Observaciones / Indicaciones adicionales..."
                                            className="w-full p-3 border border-borderLight rounded-lg text-xs focus:border-accentBlue focus:ring-2 focus:ring-accentBlue/20 outline-none bg-gray-50 text-gray-900 min-h-[50px] resize-none transition-all"
                                        />

                                        {/* Row 1: Date & Cat */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input
                                                type="date"
                                                value={newTaskDate}
                                                onChange={e => setNewTaskDate(e.target.value)}
                                                className="p-2.5 border border-borderLight rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-accentBlue focus:ring-1 focus:ring-accentBlue/20 w-full"
                                            />
                                            <select
                                                value={newTaskCategory}
                                                onChange={e => setNewTaskCategory(e.target.value as Category)}
                                                className="p-2.5 border border-borderLight rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-accentBlue focus:ring-1 focus:ring-accentBlue/20 w-full"
                                            >
                                                <option value="">Categoría (Auto: Otro)</option>
                                                {Object.keys(CATEGORY_COLORS).map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Row 2: Links Split */}
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 bg-gray-50/50 p-2 rounded-lg border border-dashed border-gray-200">
                                            <div className="grid grid-cols-3 gap-2">
                                                <input
                                                    value={newTaskL1} onChange={e => setNewTaskL1(e.target.value)}
                                                    placeholder="Link 1 (URL)"
                                                    className="col-span-2 p-2 border border-borderLight rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-accentBlue w-full"
                                                />
                                                <input
                                                    value={newTaskN1} onChange={e => setNewTaskN1(e.target.value)}
                                                    placeholder="Nombre"
                                                    className="col-span-1 p-2 border border-borderLight rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-accentBlue w-full"
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <input
                                                    value={newTaskL2} onChange={e => setNewTaskL2(e.target.value)}
                                                    placeholder="Link 2 (URL)"
                                                    className="col-span-2 p-2 border border-borderLight rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-accentBlue w-full"
                                                />
                                                <input
                                                    value={newTaskN2} onChange={e => setNewTaskN2(e.target.value)}
                                                    placeholder="Nombre"
                                                    className="col-span-1 p-2 border border-borderLight rounded-lg text-xs bg-white text-gray-900 outline-none focus:border-accentBlue w-full"
                                                />
                                            </div>
                                        </div>

                                        {/* Footer Row */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
                                            <label className="flex items-center gap-2 text-sm text-textSecondary cursor-pointer hover:bg-yellow-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-yellow-200 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={newTaskPrio}
                                                    onChange={e => setNewTaskPrio(e.target.checked)}
                                                    className="accent-accentYellow w-4 h-4 cursor-pointer"
                                                />
                                                <span className={`${newTaskPrio ? 'font-bold text-yellow-700' : ''}`}>Marcar como Crítica</span>
                                            </label>
                                            <button
                                                onClick={handleDelegateTask}
                                                disabled={!newTaskText.trim() || isAssigning}
                                                className="bg-accentBlue text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg active:scale-95"
                                            >
                                                {isAssigning ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                                {isAssigning ? "Asignando..." : "Asignar a Usuario"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. MINI DONUT CHART (MIDDLE) */}
                                <div className="bg-white border border-borderLight rounded-xl p-4 shadow-sm flex flex-col items-center justify-center relative h-[400px]">
                                    <h3 className="font-bold text-textPrimary text-[10px] uppercase tracking-wide text-center absolute top-5 w-full text-slate-400">
                                        Estado General
                                    </h3>
                                    
                                    {(() => {
                                        const activeDel = assignedHistory.filter(t => t.status === 'active' || t.status === 'standby').length;
                                        const compDel = assignedHistory.filter(t => t.status === 'completed').length;
                                        const delDel = assignedHistory.filter(t => t.status === 'deleted').length;
                                        const totalDel = activeDel + compDel + delDel;
                                        
                                        if (totalDel === 0) {
                                            return <div className="text-[10px] text-gray-400 italic mt-8">Sin historial</div>;
                                        }

                                        const r = 38;
                                        const c = 2 * Math.PI * r;
                                        
                                        const activeDash = (activeDel / totalDel) * c;
                                        const compDash = (compDel / totalDel) * c;
                                        const delDash = (delDel / totalDel) * c;
                                        
                                        return (
                                            <div className="flex flex-col items-center w-full mt-4">
                                                <div className="relative w-28 h-28">
                                                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                                        {totalDel === 0 && (
                                                            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                                                        )}
                                                        {activeDel > 0 && (
                                                            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#bae6fd" strokeWidth="14" 
                                                                    strokeDasharray={`${activeDash} ${c}`} strokeDashoffset={0} />
                                                        )}
                                                        {compDel > 0 && (
                                                            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#bbf7d0" strokeWidth="14" 
                                                                    strokeDasharray={`${compDash} ${c}`} strokeDashoffset={-activeDash} />
                                                        )}
                                                        {delDel > 0 && (
                                                            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#fecaca" strokeWidth="14" 
                                                                    strokeDasharray={`${delDash} ${c}`} strokeDashoffset={-(activeDash + compDash)} />
                                                        )}
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                        <span className="text-2xl font-light text-slate-700">{totalDel}</span>
                                                        <span className="text-[8px] uppercase text-slate-400 font-bold tracking-wider -mt-1">Total</span>
                                                    </div>
                                                </div>

                                                <div className="w-full mt-8 space-y-3 flex flex-col items-center justify-center">
                                                    <div className="flex items-center justify-between w-[85%] text-[11px]">
                                                        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-sky-200"></span><span className="text-slate-600 font-medium tracking-wide">Activas</span></div>
                                                        <span className="font-bold text-sky-700 bg-sky-50 px-1.5 rounded">{activeDel}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between w-[85%] text-[11px]">
                                                        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-green-200"></span><span className="text-slate-600 font-medium tracking-wide">Terminadas</span></div>
                                                        <span className="font-bold text-green-700 bg-green-50 px-1.5 rounded">{compDel}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between w-[85%] text-[11px]">
                                                        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-red-200"></span><span className="text-slate-600 font-medium tracking-wide">Eliminadas</span></div>
                                                        <span className="font-bold text-red-700 bg-red-50 px-1.5 rounded">{delDel}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* 3. ASSIGNED HISTORY PANEL (NARROW) */}
                                <div className="bg-white border border-borderLight rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-textPrimary flex items-center gap-2 text-xs uppercase tracking-wide">
                                            <ClipboardList size={16} className="text-purple-500" /> Tareas Delegadas
                                        </h3>
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            <button
                                                onClick={() => setAssignedHistoryFilter('all')}
                                                className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${assignedHistoryFilter === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Todas
                                            </button>
                                            <button
                                                onClick={() => setAssignedHistoryFilter('active')}
                                                className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${assignedHistoryFilter === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Activas
                                            </button>
                                            <button
                                                onClick={() => setAssignedHistoryFilter('inactive')}
                                                className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${assignedHistoryFilter === 'inactive' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Cerradas
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                                        {assignedHistory.length === 0 && <p className="text-[11px] text-gray-400 italic text-center py-6">Sin historial de delegación reciente.</p>}
                                        {assignedHistory.map(t => {
                                            const isExpanded = expandedAssignedIds.has(t.id);
                                            return (
                                            <div 
                                                key={t.id} 
                                                onClick={() => {
                                                    setExpandedAssignedIds(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(t.id)) next.delete(t.id);
                                                        else next.add(t.id);
                                                        return next;
                                                    });
                                                }}
                                                className="border border-gray-100 rounded-lg p-3 bg-gray-50 hover:bg-white hover:shadow-sm hover:border-blue-100 transition-all text-left flex flex-col cursor-pointer group"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-1.5 flex-wrap flex-1 mr-2">
                                                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${t.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                t.status === 'standby' ? 'bg-gray-200 text-gray-600' :
                                                                    t.status === 'deleted' ? 'bg-red-100 text-red-700' :
                                                                        'bg-sky-100 text-sky-700'
                                                            }`}>
                                                            {t.status === 'completed' ? 'CERRADA' : t.status === 'standby' ? 'STANDBY' : t.status === 'deleted' ? 'ELIMINADA' : 'ACTIVA'}
                                                        </span>
                                                        {t.prio && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-yellow-100 text-yellow-800 flex items-center gap-1 shadow-sm" title="Alta Prioridad">
                                                                <AlertTriangle size={10} /> CRÍTICA
                                                            </span>
                                                        )}
                                                        {t.cat && t.cat !== 'Otro' && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold border bg-white" style={{ borderColor: CATEGORY_COLORS[t.cat] + '40', color: CATEGORY_COLORS[t.cat] }}>
                                                                {t.cat}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className="text-[9px] text-gray-400 font-mono">{new Date(t.id).toLocaleDateString()}</span>
                                                        {/* Acknowledgment badge — only for active tasks */}
                                                        {t.status === 'active' && (
                                                            t.acknowledged
                                                                ? <span className="text-[9px] bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded-full font-bold" title="El usuario confirmó recepción">✅ Recibido</span>
                                                                : <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold" title="Esperando confirmación del usuario">⏳ Pendiente</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className={`text-[11px] font-normal mb-1.5 leading-snug ${t.status === 'completed' || t.status === 'deleted' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                                    {t.text}
                                                </p>
                                                {/* Meta & Notes Action */}
                                                <div className="mt-1.5 pt-1.5 border-t border-gray-200/60 w-full">
                                                    {t.status === 'completed' && t.closingNote && (
                                                        <div className="text-[10px] text-green-700 italic truncate mb-1.5">✅ Cerró con: {t.closingNote}</div>
                                                    )}
                                                    <div className="flex justify-between items-center w-full">
                                                        <div className="flex gap-2 items-center">
                                                            {t.date && <span className="text-[9px] text-gray-500 font-medium">📅 Vence: {t.date}</span>}
                                                        </div>
                                                        {t.note && t.note.trim() !== '' && (
                                                            <div className="text-[9px] text-blue-500 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                                <Info size={10} /> {isExpanded ? 'Ocultar' : 'Ver detalle'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Expandable info */}
                                                    {isExpanded && t.note && t.note.trim() !== '' && (
                                                        <div className="text-[11px] text-gray-700 bg-white border border-gray-100 p-2.5 rounded-lg mt-2.5 shadow-sm whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-top-1">
                                                            {t.note}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    </div>
                                </div>
                            </div>

                            {/* NEW LAYOUT: BOTTOM ZONE (GENERAL SUMMARY COMPACTED) */}
                            <div className="bg-white border border-borderLight rounded-xl p-5 shadow-sm flex flex-col mb-4">
                                <h3 className="font-bold text-textPrimary mb-4 flex items-center gap-2 text-sm uppercase">
                                    <Users size={16} className="text-gray-400" /> Vista Rápida del Usuario
                                </h3>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* VENCIDAS (Col 1) */}
                                    <div className="flex flex-col h-full bg-red-50/10 rounded-lg p-2 border border-transparent hover:border-red-50 transition-colors">
                                        <h4 className="text-[11px] font-bold text-red-700 uppercase mb-3 flex justify-between items-center border-b border-red-100 pb-2">
                                            <span className="flex items-center gap-1.5"><AlertCircle size={14} /> Vencidas</span>
                                            <span className="bg-red-100 text-red-800 px-2 rounded-full shadow-inner">{groupedTasks.overdue.length}</span>
                                        </h4>
                                        <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                                            {groupedTasks.overdue.length === 0 && <p className="text-[11px] text-gray-400 italic">Sin tareas vencidas.</p>}
                                            {groupedTasks.overdue.map(t => renderTaskWithDetails(t))}
                                        </div>
                                    </div>

                                    {/* PARA HOY (Col 2) */}
                                    <div className="flex flex-col h-full bg-blue-50/10 rounded-lg p-2 border border-transparent hover:border-blue-50 transition-colors">
                                        <h4 className="text-[11px] font-bold text-blue-700 uppercase mb-3 flex justify-between items-center border-b border-blue-100 pb-2">
                                            <span className="flex items-center gap-1.5"><Calendar size={14} /> Para Hoy</span>
                                            <span className="bg-blue-100 text-blue-800 px-2 rounded-full shadow-inner">{groupedTasks.today.length}</span>
                                        </h4>
                                        <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                                            {groupedTasks.today.length === 0 && <p className="text-[11px] text-gray-400 italic">Todo listo por hoy.</p>}
                                            {groupedTasks.today.map(t => renderTaskWithDetails(t))}
                                        </div>
                                    </div>

                                    {/* BACKLOG (Col 3) */}
                                    <div className="flex flex-col h-full bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                                        <h4 className="text-[11px] font-bold text-gray-600 uppercase mb-3 flex justify-between items-center pb-2 border-b border-gray-200">
                                            <span className="flex items-center gap-1.5">📥 Bandeja Backlog</span>
                                            <span className="bg-gray-200 text-gray-800 px-2 rounded-full shadow-inner">{groupedTasks.backlog.length}</span>
                                        </h4>
                                        <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                                            {groupedTasks.backlog.length === 0 && <p className="text-[11px] text-gray-400 italic">Bandeja vacía.</p>}
                                            {groupedTasks.backlog.map(t => renderTaskWithDetails(t))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-textSecondary">
                        <Users size={48} className="mb-4 opacity-20" />
                        <p>Selecciona un miembro del equipo para ver sus métricas.</p>
                    </div>
                )}

                <div className="fixed bottom-2 right-4 text-[10px] text-gray-500 font-mono pointer-events-none select-none z-[40] text-right leading-tight">
                    <div>APP Gestor de tareas (creada por Nicolas Andreola)</div>
                    <div>Última modificación: {LAST_UPDATE}</div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;