import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";

interface MiniAuditedCalendarProps {
  schedule: string[];
  onChangeSchedule?: (newSchedule: string[]) => Promise<void> | void;
}

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const MONTHS_FR = [
  "Janv", "Févr", "Mars", "Avril", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc"
];

const WEEKDAYS_EN = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];

const getDayName = (date: Date): string => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
};

const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function MiniAuditedCalendar({ schedule = [], onChangeSchedule }: MiniAuditedCalendarProps) {
  const { language } = useLanguage();
  const [currentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon, ...
  const paddingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = paddingDays - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Next month padding to align to grid
  const remaining = cells.length % 7;
  if (remaining !== 0) {
    const extra = 7 - remaining;
    for (let i = 1; i <= extra; i++) {
      cells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
  }

  const isSelected = (date: Date): boolean => {
    const dateStr = formatDateKey(date);
    const dayName = getDayName(date);
    return schedule.includes(dateStr) || schedule.includes(dayName);
  };

  const handleToggleCell = async (date: Date) => {
    if (!onChangeSchedule) return;
    const dateStr = formatDateKey(date);
    let updated = [...schedule];

    // Check if contains legacy weekdays
    const weekdaysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const hasLegacy = updated.some(item => weekdaysList.includes(item));

    if (hasLegacy) {
      // Expand legacy weekdays to individual dates
      const expandedDates: string[] = [];
      const baseMonths = [-1, 0, 1];
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
      updated = updated.filter(item => !weekdaysList.includes(item));
      updated = Array.from(new Set([...updated, ...expandedDates]));
    }

    if (updated.includes(dateStr)) {
      updated = updated.filter(d => d !== dateStr);
    } else {
      updated.push(dateStr);
    }

    await onChangeSchedule(updated);
  };

  const monthLabel = language === "fr" ? MONTHS_FR[month] : MONTHS_EN[month];
  const weekdaysHeader = language === "fr" ? WEEKDAYS_FR : WEEKDAYS_EN;

  return (
    <div className="bg-white border border-slate-100 rounded-lg p-2 shadow-xs select-none">
      <div className="flex items-center justify-between pl-0.5 pr-0.5 pb-1 mb-1 border-b border-slate-100">
        <span className="font-bold font-mono text-[9px] text-slate-600 uppercase tracking-wider">
          {monthLabel} {year}
        </span>
        <div className="flex gap-1 items-center">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
            {language === "fr" ? "Actif" : "Active"}
          </span>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-0.5 text-center font-mono text-[7px] text-slate-400 font-bold uppercase pb-0.5">
        {weekdaysHeader.map((day, dIdx) => (
          <div key={dIdx}>{day}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, cIdx) => {
          const active = isSelected(cell.date);
          const isToday = new Date().toDateString() === cell.date.toDateString();
          return (
            <button
              key={cIdx}
              type="button"
              disabled={!onChangeSchedule}
              onClick={() => handleToggleCell(cell.date)}
              className={`h-5 w-auto flex items-center justify-center font-mono text-[9px] rounded-xs transition-all ${
                active
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-sm"
                  : cell.isCurrentMonth
                  ? "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  : "bg-white text-slate-200"
              } ${isToday ? "ring-1 ring-blue-400" : ""} ${
                onChangeSchedule ? "cursor-pointer" : "cursor-default"
              }`}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
