"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, List, Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";

export interface CalendarSlot {
  id: string;
  title: string;
  visibility: "public_event" | "appointment";
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_occupancy: number;
}

interface CalendarViewProps {
  slots: CalendarSlot[];
  showBookingLinks?: boolean;
  className?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function slotDayKey(slot: CalendarSlot) {
  return new Date(slot.start_time).toDateString();
}

export function CalendarView({ slots, showBookingLinks = true, className }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const slotsByDay = useMemo(() => {
    const map = new Map<string, CalendarSlot[]>();
    for (const slot of slots) {
      const key = slotDayKey(slot);
      const existing = map.get(key) ?? [];
      existing.push(slot);
      map.set(key, existing);
    }
    return map;
  }, [slots]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const days: Date[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= end || cursor.getDay() !== 0) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
      if (days.length > 42) break;
    }
    return days;
  }, [currentMonth]);

  const selectedDaySlots = useMemo(() => {
    if (!selectedDay) return [];
    return slotsByDay.get(selectedDay.toDateString()) ?? [];
  }, [selectedDay, slotsByDay]);

  const monthLabel = currentMonth.toLocaleDateString("en", { month: "long", year: "numeric" });

  const sortedSlots = useMemo(
    () => [...slots].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [slots]
  );

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border transition",
              viewMode === "grid" ? "border-brass bg-brass/5 text-brass" : "border-slate-200 text-slate-500 hover:text-slate-700"
            )}
          >
            <CalendarDays size={14} />
            Calendar Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border transition",
              viewMode === "list" ? "border-brass bg-brass/5 text-brass" : "border-slate-200 text-slate-500 hover:text-slate-700"
            )}
          >
            <List size={14} />
            List View
          </button>
        </div>
        {viewMode === "grid" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-slate-800 min-w-[140px] text-center">{monthLabel}</span>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {viewMode === "grid" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 glass rounded-2xl border border-slate-100/80 p-4 sm:p-6 shadow-sm">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const inMonth = day.getMonth() === currentMonth.getMonth();
                const daySlots = slotsByDay.get(day.toDateString()) ?? [];
                const isSelected = selectedDay && sameDay(day, selectedDay);
                const isToday = sameDay(day, new Date());

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "min-h-[72px] rounded-xl border p-2 text-left transition",
                      inMonth ? "bg-white" : "bg-slate-50/50",
                      isSelected ? "border-brass ring-2 ring-brass/20" : "border-slate-100 hover:border-slate-200",
                      !inMonth && "opacity-50"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-bold",
                      isToday ? "text-brass" : inMonth ? "text-slate-700" : "text-slate-400"
                    )}>
                      {day.getDate()}
                    </span>
                    {daySlots.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {daySlots.slice(0, 2).map((slot) => (
                          <div
                            key={slot.id}
                            className={cn(
                              "truncate rounded px-1 py-0.5 text-[9px] font-bold",
                              slot.visibility === "public_event" ? "bg-jade/10 text-jade" : "bg-brass/10 text-brass"
                            )}
                          >
                            {slot.title}
                          </div>
                        ))}
                        {daySlots.length > 2 && (
                          <div className="text-[9px] font-bold text-slate-400">+{daySlots.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              {selectedDay
                ? selectedDay.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })
                : "Select a date"}
            </h3>
            <div className="space-y-3">
              {selectedDaySlots.length ? (
                selectedDaySlots.map((slot) => (
                  <SlotCard key={slot.id} slot={slot} showBookingLinks={showBookingLinks} />
                ))
              ) : (
                <p className="glass rounded-xl p-4 text-xs text-slate-400 border border-slate-100 text-center">
                  No slots scheduled for this date.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSlots.length ? (
            sortedSlots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} showBookingLinks={showBookingLinks} layout="list" />
            ))
          ) : (
            <p className="glass rounded-2xl p-6 text-sm text-slate-400 text-center border border-slate-100/60">
              No upcoming calendar slots are scheduled.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SlotCard({
  slot,
  showBookingLinks,
  layout = "card"
}: {
  slot: CalendarSlot;
  showBookingLinks: boolean;
  layout?: "card" | "list";
}) {
  const isFull = slot.current_occupancy >= slot.max_capacity;
  const isPublic = slot.visibility === "public_event";

  if (layout === "list") {
    return (
      <article className="glass rounded-2xl p-5 border border-slate-100/60 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn("w-1 self-stretch rounded-full shrink-0", isPublic ? "bg-jade" : "bg-brass")} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-bold border",
                isPublic ? "bg-jade/5 text-jade border-jade/10" : "bg-brass/5 text-brass border-brass/10"
              )}>
                {slot.visibility === "public_event" ? "COMMUNITY EVENT" : "APPOINTMENT"}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {formatDateTime(slot.start_time)}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 mt-1">{slot.title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {slot.current_occupancy} / {slot.max_capacity} filled
            </p>
          </div>
        </div>
        {showBookingLinks && slot.visibility === "appointment" && (
          isFull ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-bold bg-slate-100 text-slate-400">
              <Lock size={13} />
              Full
            </span>
          ) : (
            <ButtonLink href={`/booking/${slot.id}`} className="h-9 text-xs px-4">
              Book Appointment
            </ButtonLink>
          )
        )}
      </article>
    );
  }

  return (
    <article className="glass rounded-xl p-4 border border-slate-100/60 shadow-sm space-y-2">
      <div className="flex justify-between items-start gap-2">
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[9px] font-bold border",
          isPublic ? "bg-jade/5 text-jade border-jade/10" : "bg-brass/5 text-brass border-brass/10"
        )}>
          {isPublic ? "EVENT" : "APPOINTMENT"}
        </span>
        <span className="text-[10px] font-bold text-slate-400">
          {slot.current_occupancy}/{slot.max_capacity}
        </span>
      </div>
      <h4 className="text-sm font-bold text-slate-800">{slot.title}</h4>
      <p className="text-[11px] text-slate-500">
        {formatDateTime(slot.start_time)} – {formatDateTime(slot.end_time)}
      </p>
      {showBookingLinks && slot.visibility === "appointment" && (
        isFull ? (
          <span className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-[10px] font-bold bg-slate-100 text-slate-400">
            <Lock size={12} />
            Full
          </span>
        ) : (
          <ButtonLink href={`/booking/${slot.id}`} className="h-8 text-[10px] px-3">
            Book
          </ButtonLink>
        )
      )}
    </article>
  );
}
