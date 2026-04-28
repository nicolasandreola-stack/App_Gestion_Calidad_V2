import React from 'react';
import { AlertTriangle, CalendarDays, PauseCircle, Activity, CheckCircle2, TrendingDown, Clock } from 'lucide-react';

interface KPIBoardProps {
  routinePercentage: number;
  tasksDoneToday: number;
  criticalTasksCount: number;
  todayLoad?: {
    total: number;
    high: number;
    med: number;
    low: number;
  };
  overdueCount?: number;
  completedBreakdown?: {
    low: number;
    med: number;
    high: number;
  };
  standbyCount?: number;
  adminAssignedCount?: number;
  onRoutineClick?: () => void;
  onProductivityClick?: () => void;
  onOverdueClick?: () => void;
  onStandbyClick?: () => void;
  onBottleneckClick?: () => void;
}

const KPIBoard: React.FC<KPIBoardProps> = ({
  routinePercentage,
  tasksDoneToday,
  criticalTasksCount,
  todayLoad,
  overdueCount = 0,
  completedBreakdown,
  standbyCount = 0,
  adminAssignedCount,
  onRoutineClick,
  onProductivityClick,
  onOverdueClick,
  onStandbyClick,
  onBottleneckClick,
}) => {
  const isRoutineComplete = routinePercentage === 100;
  const isRoutineLow = routinePercentage <= 50;
  const isBottleneckWarning = criticalTasksCount >= 5;
  const isOverdueWarning = overdueCount > 0;
  const isStandbyVisible = standbyCount > 0;

  // Productivity level
  const prodLowMed = (completedBreakdown?.low || 0) + (completedBreakdown?.med || 0);
  const prodHigh = completedBreakdown?.high || 0;
  let level = 0;
  if (prodLowMed >= 2 && prodHigh >= 1) level = 3;
  else if (prodLowMed > 6) level = 2;
  else if (prodLowMed >= 3) level = 1;

  // Routine icon color
  const routineIconBg = isRoutineComplete
    ? 'bg-emerald-100 text-emerald-600'
    : isRoutineLow
    ? 'bg-orange-100 text-orange-600'
    : 'bg-indigo-100 text-indigo-600';

  // Productivity icon color
  const prodIconBg =
    level >= 3
      ? 'bg-emerald-100 text-emerald-600'
      : level >= 1
      ? 'bg-sky-100 text-sky-600'
      : 'bg-emerald-100 text-emerald-600';

  const renderSubBadge = (label: string, color: string) => (
    <p className={`text-[9px] font-bold pb-0.5 ${color}`}>{label}</p>
  );

  const renderBreakdownDots = () => {
    const items = [];
    if ((completedBreakdown?.high || 0) > 0)
      items.push(
        <div key="h" className="flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-100">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />{completedBreakdown?.high}
        </div>
      );
    if ((completedBreakdown?.med || 0) > 0)
      items.push(
        <div key="m" className="flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />{completedBreakdown?.med}
        </div>
      );
    if ((completedBreakdown?.low || 0) > 0)
      items.push(
        <div key="l" className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{completedBreakdown?.low}
        </div>
      );
    return items.length > 0 ? <div className="flex items-center gap-1 flex-wrap mt-1">{items}</div> : null;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 w-full">

      {/* ── RUTINA ── */}
      <div
        onClick={onRoutineClick}
        className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3 transition-all ${
          onRoutineClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : ''
        }`}
      >
        <div className={`p-3 rounded-lg shrink-0 transition-colors ${routineIconBg}`}>
          <Activity size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Efectividad Rutina</p>
          <div className="flex items-end gap-2 mt-0.5">
            <p className={`text-xl font-black leading-tight ${isRoutineComplete ? 'text-emerald-700' : isRoutineLow ? 'text-orange-700' : 'text-slate-800'}`}>
              {routinePercentage}%
            </p>
          </div>
          <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isRoutineComplete ? 'bg-emerald-500' : isRoutineLow ? 'bg-orange-400' : 'bg-indigo-500'}`}
              style={{ width: `${routinePercentage}%` }}
            />
          </div>
          {renderSubBadge('Objetivo diario', isRoutineComplete ? 'text-emerald-600' : isRoutineLow ? 'text-orange-600' : 'text-slate-400')}
        </div>
      </div>

      {/* ── PRODUCTIVIDAD ── */}
      <div
        onClick={onProductivityClick}
        className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3 transition-all ${
          onProductivityClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : ''
        } ${level >= 2 ? 'border-emerald-300' : level === 1 ? 'border-sky-300' : 'border-gray-200'}`}
      >
        <div className={`p-3 rounded-lg shrink-0 ${prodIconBg}`}>
          <CheckCircle2 size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Productividad</p>
          <p className={`text-xl font-black leading-tight mt-0.5 ${level >= 2 ? 'text-emerald-700' : level === 1 ? 'text-sky-700' : 'text-slate-800'}`}>
            {tasksDoneToday}
          </p>
          {renderBreakdownDots()}
          {!renderBreakdownDots() && renderSubBadge('Hechas Hoy', 'text-slate-400')}
          {adminAssignedCount !== undefined && adminAssignedCount > 0 && (
            <div className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full inline-flex items-center w-fit font-bold border border-slate-200 mt-1">
              Admin: {adminAssignedCount}
            </div>
          )}
        </div>
      </div>

      {/* ── AGENDA HOY ── */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
        <div className="bg-blue-100 text-blue-600 p-3 rounded-lg shrink-0">
          <CalendarDays size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Agenda Hoy</p>
          <p className="text-xl font-black text-slate-800 leading-tight mt-0.5">{todayLoad?.total || 0}</p>
          <div className="flex items-center gap-1 flex-wrap mt-1">
            {(todayLoad?.high || 0) > 0 && (
              <div className="flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-100">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />{todayLoad?.high}
              </div>
            )}
            {(todayLoad?.med || 0) > 0 && (
              <div className="flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />{todayLoad?.med}
              </div>
            )}
            {(todayLoad?.low || 0) > 0 && (
              <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{todayLoad?.low}
              </div>
            )}
            {(todayLoad?.total === 0) && <span className="text-[9px] text-slate-400 font-medium">Sin tareas</span>}
          </div>
        </div>
      </div>

      {/* ── VENCIDAS ── */}
      <div
        onClick={onOverdueClick}
        className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3 transition-all ${
          onOverdueClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : ''
        }`}
      >
        <div className={`p-3 rounded-lg shrink-0 transition-colors ${isOverdueWarning ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
          {isOverdueWarning ? <AlertTriangle size={22} /> : <Clock size={22} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Vencidas</p>
          <p className={`text-xl font-black leading-tight mt-0.5 ${isOverdueWarning ? 'text-red-600' : 'text-slate-800'}`}>
            {overdueCount}
          </p>
          {renderSubBadge(isOverdueWarning ? 'Reprogramar' : 'Al día', isOverdueWarning ? 'text-red-500' : 'text-slate-400')}
        </div>
        {isOverdueWarning && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />}
      </div>

      {/* ── STANDBY ── */}
      <div
        onClick={onStandbyClick}
        className={`bg-white rounded-xl p-4 border shadow-sm flex items-center gap-3 transition-all ${
          onStandbyClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : ''
        } ${isStandbyVisible ? 'border-amber-300' : 'border-gray-200'}`}
      >
        <div className={`p-3 rounded-lg shrink-0 ${isStandbyVisible ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
          <PauseCircle size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Standby</p>
          <p className={`text-xl font-black leading-tight mt-0.5 ${isStandbyVisible ? 'text-amber-700' : 'text-slate-800'}`}>
            {standbyCount}
          </p>
          {renderSubBadge('En espera', isStandbyVisible ? 'text-amber-500' : 'text-slate-400')}
        </div>
      </div>

      {/* ── CUELLO DE BOTELLA ── */}
      <div
        onClick={onBottleneckClick}
        className={`bg-white rounded-xl p-4 border shadow-sm flex items-center gap-3 transition-all ${
          onBottleneckClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : ''
        } ${isBottleneckWarning ? 'border-rose-300' : 'border-gray-200'}`}
      >
        <div className={`p-3 rounded-lg shrink-0 ${isBottleneckWarning ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
          <TrendingDown size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Cuello B.</p>
          <p className={`text-xl font-black leading-tight mt-0.5 ${isBottleneckWarning ? 'text-rose-600' : 'text-slate-800'}`}>
            {criticalTasksCount}
          </p>
          {renderSubBadge('Complejas', isBottleneckWarning ? 'text-rose-500' : 'text-slate-400')}
        </div>
        {isBottleneckWarning && <AlertTriangle size={14} className="text-rose-500 shrink-0 animate-pulse" />}
      </div>

    </div>
  );
};

export default KPIBoard;