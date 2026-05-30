import React, { useState } from "react";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, Sparkles } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { motion, AnimatePresence } from "motion/react";

interface WorkCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: string[];
  onSaveSchedule: (newSchedule: string[]) => Promise<void>;
  name: string;
  role?: string;
}

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const getDayName = (date: Date): string => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
};

export default function WorkCalendarModal({
  isOpen,
  onClose,
  schedule = [],
  onSaveSchedule,
  name,
  role
}: WorkCalendarModalProps) {
  const { t, language } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (!isOpen) return null;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0 - 11

  // Navigation helpers
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // First day of the month
  const firstDayOfMonth = new Date(year, month, 1);
  // Total days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Day of the week of the first day (0 = Sunday, 1 = Monday, etc.)
  const startDayOfWeek = firstDayOfMonth.getDay(); 

  // Align week to start on Monday
  // Monday = 1, Sunday = 0.
  const paddingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  // Build grid of days
  const calendarCells: { date: Date; isCurrentMonth: boolean }[] = [];

  // Add padding days from the previous month
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = paddingDays - 1; i >= 0; i--) {
    const dayVal = prevMonthDays - i;
    calendarCells.push({
      date: new Date(year, month - 1, dayVal),
      isCurrentMonth: false,
    });
  }

  // Add days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Add padding days from the next month to make complete 7-day rows
  const remainingCells = calendarCells.length % 7;
  if (remainingCells !== 0) {
    const extraNeeded = 7 - remainingCells;
    for (let i = 1; i <= extraNeeded; i++) {
      calendarCells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
  }

  const formatDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const isDateSelected = (date: Date): boolean => {
    const dateStr = formatDateKey(date);
    const dayName = getDayName(date);
    return schedule.includes(dateStr) || schedule.includes(dayName);
  };

  const isTodayDate = (date: Date): boolean => {
    const today = new Date();
    return today.getFullYear() === date.getFullYear() &&
           today.getMonth() === date.getMonth() &&
           today.getDate() === date.getDate();
  };

  const handleToggleCell = async (date: Date) => {
    const dateStr = formatDateKey(date);
    let updated = [...schedule];

    // Convert legacy weekdays to date arrays to initialize individual days toggling naturally
    const weekdaysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const hasLegacy = updated.some(item => weekdaysList.includes(item));

    if (hasLegacy) {
      const expandedDates: string[] = [];
      const baseMonths = [-2, -1, 0, 1, 2, 3];
      
      baseMonths.forEach(offset => {
        const targetYear = year + Math.floor((month + offset) / 12);
        const targetMonth = (month + offset + 12) % 12;
        const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
        for (let d = 1; d <= maxDays; d++) {
          const dObj = new Date(targetYear, targetMonth, d);
          const dayName = getDayName(dObj);
          if (updated.includes(dayName)) {
            expandedDates.push(formatDateKey(dObj));
          }
        }
      });

      // Erase legacy strings & replace with concrete expanded dates
      updated = updated.filter(item => !weekdaysList.includes(item));
      updated = Array.from(new Set([...updated, ...expandedDates]));
    }

    // Toggle specific day
    if (updated.includes(dateStr)) {
      updated = updated.filter(d => d !== dateStr);
    } else {
      updated.push(dateStr);
    }

    await onSaveSchedule(updated);
  };

  const handlePresetWeekdays = async () => {
    let updated = [...schedule];
    const weekdaysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    // Remove legacy weekdays if present
    updated = updated.filter(item => !weekdaysList.includes(item));

    // Gather all Mon-Fri dates in the currently visible month
    const newDates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dObj = new Date(year, month, d);
      const dayOfWeek = dObj.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sat (6) and not Sun (0)
        newDates.push(formatDateKey(dObj));
      }
    }

    const finalSchedule = Array.from(new Set([...updated, ...newDates]));
    await onSaveSchedule(finalSchedule);
  };

  const handleClearMonth = async () => {
    let updated = [...schedule];
    const weekdaysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    // Remove legacy weekdays
    updated = updated.filter(item => !weekdaysList.includes(item));

    // Filter out date strings representing the current visible month
    updated = updated.filter(dateStr => {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const itemYear = parseInt(parts[0]);
        const itemMonth = parseInt(parts[1]) - 1;
        return !(itemYear === year && itemMonth === month);
      }
      return true;
    });

    await onSaveSchedule(updated);
  };

  // Calc metrics
  const totalDaysScheduled = schedule.filter(item => {
    const isDate = item.includes("-");
    return isDate;
  }).length;

  const currentMonthScheduledCount = schedule.filter(item => {
    const parts = item.split('-');
    if (parts.length === 3) {
      const itemYear = parseInt(parts[0]);
      const itemMonth = parseInt(parts[1]) - 1;
      return itemYear === year && itemMonth === month;
    }
    return false;
  }).length;

  const monthLabel = language === 'fr' ? MONTHS_FR[month] : MONTHS_EN[month];
  const weekdaysHeader = language === 'fr' ? WEEKDAYS_FR : WEEKDAYS_EN;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide text-slate-800 uppercase font-mono">
                  {language === 'fr' ? "Calendrier de garde" : "Duty Schedule Calendar"}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  {name} <span className="opacity-60">({role || "Staff"})</span>
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Body */}
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
            
            {/* Header controls */}
            <div className="flex items-center justify-between border border-slate-100 p-2 bg-slate-50/50">
              <button 
                onClick={handlePrevMonth}
                className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold font-serif italic text-sm text-slate-800 tracking-wide">
                {monthLabel} {year}
              </span>
              <button 
                onClick={handleNextMonth}
                className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Presets Row */}
            <div className="flex gap-2 justify-end">
              <button 
                onClick={handlePresetWeekdays}
                className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[9px] uppercase font-bold tracking-wider hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                {language === 'fr' ? "Auto Lun-Ven" : "Preset Mon-Fri"}
              </button>
              <button 
                onClick={handleClearMonth}
                className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[9px] uppercase font-bold tracking-wider hover:bg-rose-100 transition-colors cursor-pointer"
              >
                {language === 'fr' ? "Vider le mois" : "Clear Month"}
              </button>
            </div>

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] uppercase font-mono text-slate-400 py-1 border-b border-slate-100">
              {weekdaysHeader.map((day, idx) => (
                <div key={idx}>{day}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                const isSelected = isDateSelected(cell.date);
                const isCurrent = cell.isCurrentMonth;
                const isToday = isTodayDate(cell.date);
                return (
                  <button
                    key={idx}
                    onClick={() => handleToggleCell(cell.date)}
                    className={`h-11 sm:h-12 relative flex flex-col items-center justify-center transition-all border font-mono text-xs cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 font-black shadow-inner"
                        : isCurrent
                        ? "bg-white text-slate-800 border-slate-100 hover:bg-slate-50"
                        : "bg-slate-50/50 text-slate-300 border-slate-50 hover:bg-slate-100"
                    } ${isToday ? "ring-2 ring-blue-500/80 ring-offset-1" : ""}`}
                  >
                    <span>{cell.date.getDate()}</span>
                    {isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 leading-relaxed">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs inline-block shadow-sm"></span>
              {language === 'fr' ? "Zones vertes : jours de travail programmés." : "Green zones: scheduled working days."}
            </div>

          </div>

          {/* Footer stats */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600">
            <div className="flex gap-4 font-mono text-[10px]">
              <div>
                <span className="text-slate-400 block uppercase tracking-wider">{language === 'fr' ? "Ce mois" : "This Month"}</span>
                <span className="font-bold text-slate-800 text-xs">{currentMonthScheduledCount} {language === 'fr' ? "jours" : "days"}</span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-slate-400 block uppercase tracking-wider">{language === 'fr' ? "Total planifié" : "Total Scheduled"}</span>
                <span className="font-bold text-slate-800 text-xs">{totalDaysScheduled} {language === 'fr' ? "jours" : "days"}</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-full sm:w-auto px-8 py-2 bg-slate-900 text-white font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-slate-800 transition-all cursor-pointer"
            >
              {language === 'fr' ? "TERMINER" : "DONE"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
