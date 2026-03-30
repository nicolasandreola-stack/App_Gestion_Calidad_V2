
export type Complexity = 'low' | 'med' | 'high';
export type Category = 'SGI' | 'Ingenieria' | 'Tecnologia' | 'OEA' | 'Otro';

// Nueva clasificación temporal para rutinas
export type TimeBlock = 'start' | 'mid' | 'noon' | 'end';

export interface Task {
  id: number;
  text: string;
  cat: Category;
  comp: Complexity;
  date?: string; // Format YYYY-MM-DD
  l1: string; // URL 1
  n1: string; // Name 1
  l2: string; // URL 2
  n2: string; // Name 2
  l3?: string; // URL 3 (New)
  n3?: string; // Name 3 (New)
  del: string; // Delegate name
  prio: boolean;
  note: string;
  
  // Nuevos campos para Standby
  isStandby?: boolean;
  standbyNote?: string;
  standbyL1?: string; standbyN1?: string;
  standbyL2?: string; standbyN2?: string;

  // Nuevos campos para Cierre
  closingNote?: string;
  closingL1?: string; closingN1?: string;
  closingL2?: string; closingN2?: string;
  
  completedAt?: string; // Fecha de cierre
  completed?: boolean; // For historical purposes before deletion
  deleted?: boolean; // New: For deleted tasks history
  
  // Subtasks
  subtasks?: { id: string; text: string; completed: boolean }[];
}

export interface RoutineItem {
  id: string;
  text: string;
  days: number[] | 'all'; // 0=Sunday, 1=Monday...
  block?: TimeBlock; // Nueva propiedad opcional
  l1?: string;
  n1?: string;
  l2?: string;
  n2?: string;
  l3?: string; // New
  n3?: string; // New
}

export interface RoutineState {
  [id: string]: {
    done: boolean;
    note: string;
  };
}

export interface HistoryEntry {
  t: string; // Timestamp
  txt: string; // Description
}

export interface Achievement {
  id: string;
  type: string;
  title: string;
  desc: string;
  date: string;
  icon: string;
}

export interface BackupData {
  rtM: RoutineItem[];
  rtS: RoutineState;
  tks: Task[];
  h: HistoryEntry[];
  // Agregar tareas completadas al backup si se desea
  cTks?: Task[];
  // Agregar tareas eliminadas al backup
  dTks?: Task[];
  // Logros desbloqueados
  ach?: Achievement[];
  // Historial de rendimiento de rutina por día (YYYY-MM-DD -> porcentaje)
  rtH?: Record<string, number>;
}

// Estructura Global para JSONBin (Multi-usuario)
export interface GlobalCloudData {
  users: {
    [username: string]: BackupData;
  };
  lastUpdate: string;
}

// Colores suavizados a escala de grises/neutros para reducir ruido visual
export const CATEGORY_COLORS: Record<Category, string> = {
  SGI: '#52525B',        // Zinc 600
  Ingenieria: '#475569', // Slate 600
  Tecnologia: '#64748B', // Slate 500
  OEA: '#4B5563',        // Gray 600
  Otro: '#9CA3AF'        // Gray 400
};

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  low: 'Rápida',
  med: 'Media',
  high: 'Compleja'
};

// Configuración visual de los bloques (Sin Emojis)
export const TIME_BLOCKS: Record<TimeBlock, { label: string; color: string }> = {
  start: { label: 'Inicio Jornada', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  mid: { label: 'Media Mañana', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  noon: { label: 'Mediodía', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  end: { label: 'Cierre', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' }
};