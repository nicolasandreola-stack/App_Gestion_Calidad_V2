import React from 'react';
import { AlertTriangle, CalendarDays, AlertCircle, PauseCircle } from 'lucide-react';

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
  // New props for Admin View / Interactivity
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
    onBottleneckClick
}) => {
  const isRoutineComplete = routinePercentage === 100;
  const isRoutineLow = routinePercentage <= 50; 

  const isBottleneckWarning = criticalTasksCount >= 5;
  const isOverdueWarning = overdueCount > 0;
  const isStandbyVisible = standbyCount > 0;
  
  // LOGICA DE PRODUCTIVIDAD (Gamification)
  const prodLowMed = (completedBreakdown?.low || 0) + (completedBreakdown?.med || 0);
  const prodHigh = completedBreakdown?.high || 0;

  // Level Logic
  let level = 0;
  if (prodLowMed >= 2 && prodHigh >= 1) level = 3;
  else if (prodLowMed > 6) level = 2;
  else if (prodLowMed >= 3) level = 1;

  // Clases dinámicas PRODUCTIVIDAD
  let cardClass = 'bg-white border-borderLight';
  let titleClass = 'text-textSecondary';
  let numberClass = 'text-textPrimary';
  
  if (level === 1) {
      cardClass = 'bg-sky-50 border-sky-400';
      titleClass = 'text-sky-800';
      numberClass = 'text-sky-700 font-semibold';
  } else if (level === 2) {
      cardClass = 'bg-green-50 border-green-600';
      titleClass = 'text-green-800';
      numberClass = 'text-green-700 font-semibold';
  } else if (level === 3) {
      cardClass = 'bg-green-50 border-green-600 shadow-[0_0_15px_rgba(22,163,74,0.4)] animate-pulse border-2';
      titleClass = 'text-green-800';
      numberClass = 'text-green-700 font-bold';
  }

  // Clases dinámicas RUTINA
  let routineCardClass = 'bg-white border-borderLight';
  let routineProgressColor = 'bg-green-50'; 
  let routineTextColor = 'text-textPrimary';

  if (isRoutineComplete) {
      routineCardClass = 'bg-green-50 border-green-600';
      routineTextColor = 'text-green-700 font-semibold';
  } else if (isRoutineLow) {
      routineCardClass = 'bg-orange-50 border-orange-300';
      routineProgressColor = 'bg-orange-200';
      routineTextColor = 'text-orange-800 font-semibold';
  }

  const renderChecks = () => {
      if (level === 0) return null;
      const checkIcon = (colorClass: string, key: number) => (
        <svg key={key} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      );
      if (level === 1) return <div className="flex animate-in zoom-in">{checkIcon("text-sky-500", 1)}</div>;
      if (level === 2) return <div className="flex gap-0.5 animate-in zoom-in">{checkIcon("text-green-600", 1)}{checkIcon("text-green-600", 2)}</div>;
      if (level === 3) return <div className="flex gap-0.5 animate-in zoom-in">{checkIcon("text-green-600", 1)}{checkIcon("text-green-600", 2)}{checkIcon("text-green-600", 3)}</div>;
      return null;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 shrink-0 relative z-10 w-full">
      <div className="flex gap-4 flex-1">
        {/* Routine KPI */}
        <div 
            onClick={onRoutineClick}
            className={`flex-1 border rounded-lg p-3 flex flex-col shadow-sm transition-all duration-300 relative overflow-hidden ${routineCardClass} ${onRoutineClick ? 'cursor-pointer hover:shadow-md' : ''}`}
        >
            {!isRoutineComplete && (
                <div 
                    className={`absolute top-0 left-0 bottom-0 transition-all duration-700 ease-out z-0 ${routineProgressColor}`}
                    style={{ width: `${routinePercentage}%` }}
                ></div>
            )}

            <div className="relative z-10">
                <div className={`text-[11px] font-bold uppercase mb-0.5 ${isRoutineLow ? 'text-orange-800' : 'text-textSecondary'}`}>
                    Efectividad Rutina
                </div>
                <div className={`text-[26px] font-light leading-tight ${routineTextColor}`}>
                    {routinePercentage}%
                </div>
                <div className={`text-[11px] mt-0.5 ${isRoutineLow ? 'text-orange-700' : 'text-textSecondary'}`}>
                    Objetivo diario
                </div>
            </div>
            
            {isRoutineComplete && (
                <div className="absolute right-3 top-3 text-green-600 animate-in fade-in zoom-in">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
            )}
            {!isRoutineComplete && isRoutineLow && (
                 <div className="absolute right-3 top-3 text-orange-500 animate-pulse">
                    <AlertCircle size={20} />
                 </div>
            )}
        </div>

        {/* Productivity KPI */}
        <div 
            onClick={onProductivityClick}
            className={`flex-1 border rounded-lg p-3 flex flex-col shadow-sm transition-all duration-500 relative overflow-hidden ${cardClass} ${onProductivityClick ? 'cursor-pointer hover:shadow-md' : ''}`}
        >
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                    <div className={`text-[11px] font-bold uppercase mb-0.5 ${titleClass}`}>Productividad</div>
                    <div className={`text-[26px] font-light leading-tight ${numberClass}`}>
                    {tasksDoneToday}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${level === 1 ? 'text-sky-600' : level >= 2 ? 'text-green-600' : 'text-textSecondary'}`}>
                        Hechas Hoy
                    </div>
                </div>

                <div className="flex flex-col items-start gap-1 mt-1">
                    <div className="flex items-center gap-1">
                        {(completedBreakdown?.high || 0) > 0 && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-100/80 px-1.5 py-0.5 rounded-full" title="Complejas Hechas">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {completedBreakdown?.high}
                            </div>
                        )}
                        {(completedBreakdown?.med || 0) > 0 && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-100/80 px-1.5 py-0.5 rounded-full" title="Medias Hechas">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> {completedBreakdown?.med}
                            </div>
                        )}
                        {(completedBreakdown?.low || 0) > 0 && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded-full" title="Rápidas Hechas">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {completedBreakdown?.low}
                            </div>
                        )}
                    </div>
                    
                    {/* Admin Assigned Counter */}
                    {adminAssignedCount !== undefined && adminAssignedCount > 0 && (
                        <div className="text-[9px] bg-gray-200/80 text-gray-700 px-1.5 py-0.5 rounded-full inline-flex items-center w-fit font-bold border border-gray-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600 mr-1"></span>
                            Admin: {adminAssignedCount}
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute right-3 top-3 z-20">
                {renderChecks()}
            </div>
        </div>
      </div>

      <div className="flex gap-4 flex-[1.5]">
         {/* Agenda Hoy KPI */}
         <div className="flex-[1.3] bg-white border border-borderLight rounded-lg p-3 flex flex-col shadow-sm">
            <div className="flex justify-between items-start mb-0.5">
                <div className="text-[11px] text-textSecondary font-bold uppercase">Agenda Hoy</div>
                <CalendarDays size={20} className="text-accentBlue opacity-60" />
            </div>
            <div className="text-[26px] font-light leading-tight text-textPrimary">
                {todayLoad?.total || 0}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
               {(todayLoad?.high || 0) > 0 && (
                   <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {todayLoad?.high}
                   </div>
               )}
               {(todayLoad?.med || 0) > 0 && (
                   <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> {todayLoad?.med}
                   </div>
               )}
               {(todayLoad?.low || 0) > 0 && (
                   <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {todayLoad?.low}
                   </div>
               )}
               {(todayLoad?.total === 0) && <span className="text-[10px] text-gray-400">Sin tareas</span>}
            </div>
        </div>

         {/* Vencidas KPI */}
         <div 
            onClick={onOverdueClick}
            className={`flex-1 border rounded-lg p-3 flex flex-col shadow-sm transition-all duration-300 ${
             isOverdueWarning ? 'bg-red-50 border-red-300' : 'bg-white border-borderLight'
            } ${onOverdueClick ? 'cursor-pointer hover:shadow-md' : ''}`}
         >
             <div className="flex justify-between items-start mb-0.5">
                <div className={`text-[11px] font-bold uppercase ${isOverdueWarning ? 'text-red-800' : 'text-textSecondary'}`}>
                    Vencidas
                </div>
                {isOverdueWarning && <AlertCircle size={20} className="text-red-600 animate-pulse" />}
             </div>
             <div className={`text-[26px] font-light leading-tight ${isOverdueWarning ? 'text-red-700 font-semibold' : 'text-textPrimary'}`}>
                 {overdueCount}
             </div>
             <div className="text-[11px] text-textSecondary mt-0.5 truncate">
                 {isOverdueWarning ? 'Reprogramar' : 'Al día'}
             </div>
         </div>

         {/* Standby KPI */}
         <div 
            onClick={onStandbyClick}
            className={`flex-1 border border-borderLight bg-slate-50 rounded-lg p-3 flex flex-col shadow-sm ${onStandbyClick ? 'cursor-pointer hover:shadow-md' : ''}`}
         >
             <div className="flex justify-between items-start mb-0.5">
                <div className="text-[11px] font-bold uppercase text-slate-700">
                    Standby
                </div>
                {isStandbyVisible && <PauseCircle size={20} className="text-slate-400" />}
             </div>
             <div className="text-[26px] font-light leading-tight text-slate-700">
                 {standbyCount}
             </div>
             <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                 En espera
             </div>
         </div>

        {/* Bottleneck KPI */}
        <div 
            onClick={onBottleneckClick}
            className={`flex-1 border rounded-lg p-3 flex flex-col shadow-sm transition-all duration-300 ${
                isBottleneckWarning 
                    ? 'bg-amber-50 border-amber-300' 
                    : 'bg-white border-borderLight'
            } ${onBottleneckClick ? 'cursor-pointer hover:shadow-md' : ''}`}
        >
            <div className="flex justify-between items-start mb-0.5">
                <div className={`text-[11px] font-bold uppercase ${isBottleneckWarning ? 'text-amber-800' : 'text-textSecondary'}`}>
                    Cuello B.
                </div>
                {isBottleneckWarning && <AlertTriangle size={20} className="text-amber-600" />}
            </div>
            
            <div className={`text-[26px] font-light leading-tight ${isBottleneckWarning ? 'text-amber-700 font-semibold' : 'text-textPrimary'}`}>
            {criticalTasksCount}
            </div>
            
            <div className="text-[11px] text-textSecondary mt-0.5 truncate">
                Complejas
            </div>
        </div>
      </div>
    </div>
  );
};

export default KPIBoard;