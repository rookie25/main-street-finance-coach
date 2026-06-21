import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// ── Public types ──────────────────────────────────────────────────────────────

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  defaultPreset?: "this_month" | "last_month" | "this_year";
}

type PresetKey =
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "pay_period"
  | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "yesterday",  label: "Yesterday"  },
  { key: "this_week",  label: "This week"  },
  { key: "last_week",  label: "Last week"  },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_year",  label: "This year"  },
  { key: "last_year",  label: "Last year"  },
  { key: "pay_period", label: "Pay period" },
  { key: "custom",     label: "Custom"     },
];

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ── Date helpers ──────────────────────────────────────────────────────────────

function dayFloor(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function monthEnd(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toISODate(d: Date): string {
  return (
    d.getFullYear() +
    "-" + String(d.getMonth() + 1).padStart(2, "0") +
    "-" + String(d.getDate()).padStart(2, "0")
  );
}

export function computePreset(key: Exclude<PresetKey, "custom">): DateRange {
  const today = dayFloor(new Date());
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  switch (key) {
    case "yesterday": {
      const yd = new Date(y, m, d - 1);
      return { start: yd, end: yd };
    }
    case "this_week": {
      const dow = today.getDay();
      const mon = new Date(y, m, d - (dow === 0 ? 6 : dow - 1));
      return { start: mon, end: today };
    }
    case "last_week": {
      const dow = today.getDay();
      const lastMon = new Date(y, m, d - (dow === 0 ? 13 : dow + 6));
      return { start: lastMon, end: new Date(lastMon.getFullYear(), lastMon.getMonth(), lastMon.getDate() + 6) };
    }
    case "this_month":
      return { start: new Date(y, m, 1), end: new Date(y, m, monthEnd(y, m)) };
    case "last_month": {
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      return { start: new Date(py, pm, 1), end: new Date(py, pm, monthEnd(py, pm)) };
    }
    case "this_year":
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
    case "last_year":
      return { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31) };
    case "pay_period":
      return d <= 15
        ? { start: new Date(y, m, 1),  end: new Date(y, m, 15) }
        : { start: new Date(y, m, 16), end: new Date(y, m, monthEnd(y, m)) };
  }
}

function rangeLabel(range: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = range.start.toLocaleDateString("en-US", opts);
  if (sameDay(range.start, range.end)) {
    return range.start.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  }
  const e = range.end.toLocaleDateString("en-US", opts);
  return `${s} – ${e}, ${range.end.getFullYear()}`;
}

function fmtFull(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Calendar grid ─────────────────────────────────────────────────────────────

function CalendarGrid({
  year,
  month,
  pendingStart,
  pendingEnd,
  hoverDate,
  pickingEnd,
  onDayClick,
  onDayHover,
}: {
  year: number;
  month: number;
  pendingStart: Date | null;
  pendingEnd: Date | null;
  hoverDate: Date | null;
  pickingEnd: boolean;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date | null) => void;
}) {
  // Resolve effective range for highlighting
  let effStart = pendingStart;
  let effEnd   = pendingEnd;
  if (pickingEnd && pendingStart && hoverDate) {
    const [a, b] = hoverDate >= pendingStart
      ? [pendingStart, hoverDate]
      : [hoverDate, pendingStart];
    effStart = a;
    effEnd   = b;
  }

  const isSingleDay = effStart && effEnd && sameDay(effStart, effEnd);
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = monthEnd(year, month);
  const today       = dayFloor(new Date());

  const cells: (Date | null)[] = Array(firstDow).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const w = cells.slice(i, i + 7);
    while (w.length < 7) w.push(null);
    weeks.push(w);
  }

  return (
    <div className="select-none w-full">
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="text-center text-[11px] font-medium text-muted-foreground py-1">
            {h}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            if (!day) return <div key={di} className="h-8" />;

            const isStart    = effStart && sameDay(day, effStart);
            const isEnd      = effEnd   && sameDay(day, effEnd);
            const isEdge     = isStart || isEnd;
            const inRange    = effStart && effEnd && !isSingleDay &&
                               day > effStart && day < effEnd;
            const showLeftStrip  = inRange || (isEnd   && effStart && !isSingleDay);
            const showRightStrip = inRange || (isStart && effEnd   && !isSingleDay);
            const isToday    = sameDay(day, today);

            return (
              <div
                key={di}
                className="relative h-8 flex items-center justify-center cursor-pointer"
                onClick={() => onDayClick(day)}
                onMouseEnter={() => onDayHover(day)}
                onMouseLeave={() => onDayHover(null)}
              >
                {/* Range connector strip */}
                {(showLeftStrip || showRightStrip) && (
                  <div
                    className={`absolute inset-y-1 bg-indigo-50 ${
                      showLeftStrip && showRightStrip
                        ? "inset-x-0"
                        : showLeftStrip
                        ? "left-0 right-1/2"
                        : "left-1/2 right-0"
                    }`}
                  />
                )}

                {/* Day circle */}
                <div
                  className={`relative z-10 h-7 w-7 flex items-center justify-center rounded-full text-sm transition-colors ${
                    isEdge
                      ? "bg-indigo-600 text-white font-medium"
                      : inRange
                      ? `text-indigo-800 ${isToday ? "font-semibold" : ""}`
                      : isToday
                      ? "text-indigo-600 font-semibold hover:bg-indigo-50"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DateRangePicker({
  value,
  onChange,
  defaultPreset = "this_month",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  // Panel state (separate from committed value)
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [pendingEnd,   setPendingEnd]   = useState<Date | null>(null);
  const [pickingEnd,   setPickingEnd]   = useState(false);
  const [hoverDate,    setHoverDate]    = useState<Date | null>(null);
  const [calYear,  setCalYear]  = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  const panelRef   = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Position panel via fixed coordinates, close on scroll/resize
  useEffect(() => {
    if (!open) return;

    function position() {
      const rect = triggerRef.current?.getBoundingClientRect();
      const el   = panelRef.current;
      if (!rect || !el) return;
      const panelW = Math.min(520, window.innerWidth * 0.95);
      const left   = rect.left + panelW > window.innerWidth
        ? Math.max(8, rect.right - panelW)
        : rect.left;
      el.style.top        = `${rect.bottom + 4}px`;
      el.style.left       = `${Math.max(8, left)}px`;
      el.style.maxWidth   = `${panelW}px`;
      el.style.visibility = "visible";
    }

    // Run after paint so the panel element exists in the DOM
    const raf = requestAnimationFrame(position);

    function onScrollOrResize() { setOpen(false); }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    function onDown(e: MouseEvent) {
      if (
        panelRef.current   && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // When panel opens, initialize panel state from current value
  useEffect(() => {
    if (!open) return;
    const ref = value ?? computePreset(defaultPreset);
    setPendingStart(ref.start);
    setPendingEnd(ref.end);
    setPickingEnd(false);
    setHoverDate(null);
    setCalYear(ref.start.getFullYear());
    setCalMonth(ref.start.getMonth());
    // Detect which preset this matches (best-effort)
    if (!value) {
      setActivePreset(defaultPreset);
    } else {
      setActivePreset(null);
    }
  }, [open]);

  function selectPreset(key: PresetKey) {
    setActivePreset(key);
    if (key === "custom") {
      setPendingStart(null);
      setPendingEnd(null);
      setPickingEnd(false);
      return;
    }
    const r = computePreset(key);
    setPendingStart(r.start);
    setPendingEnd(r.end);
    setPickingEnd(false);
    setCalYear(r.start.getFullYear());
    setCalMonth(r.start.getMonth());
  }

  function handleDayClick(day: Date) {
    if (!pickingEnd) {
      setActivePreset("custom");
      setPendingStart(dayFloor(day));
      setPendingEnd(null);
      setPickingEnd(true);
    } else {
      const s = pendingStart!;
      if (dayFloor(day) < s) {
        setPendingStart(dayFloor(day));
        setPendingEnd(s);
      } else {
        setPendingEnd(dayFloor(day));
      }
      setPickingEnd(false);
    }
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  }

  function applyRange() {
    if (pendingStart && pendingEnd) {
      onChange({ start: pendingStart, end: pendingEnd });
      setOpen(false);
    }
  }

  const displayRange = value ?? null;

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-white border border-border rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
      >
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate max-w-[200px]">
          {displayRange ? rangeLabel(displayRange) : "Select range"}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Panel — fixed so it escapes overflow:hidden parents */}
      {open && (
        <div
          ref={panelRef}
          className="fixed flex bg-white border border-border rounded-lg shadow-lg overflow-hidden"
          style={{ zIndex: 9999, minWidth: 320, top: 0, left: 0, visibility: "hidden" }}
        >
          {/* Preset sidebar */}
          <div className="w-36 shrink-0 border-r border-border p-2 space-y-0.5">
            {PRESETS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => selectPreset(key)}
                className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activePreset === key
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Calendar + footer */}
          <div className="flex flex-col p-3 flex-1 min-w-0">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium">
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Calendar grid */}
            <CalendarGrid
              year={calYear}
              month={calMonth}
              pendingStart={pendingStart}
              pendingEnd={pendingEnd}
              hoverDate={hoverDate}
              pickingEnd={pickingEnd}
              onDayClick={handleDayClick}
              onDayHover={setHoverDate}
            />

            {/* Footer — wraps on narrow (mobile) widths so End + Apply never clip */}
            <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Start</span>
                <span className="font-medium border border-border rounded px-2 py-0.5 text-xs bg-muted/30 min-w-[90px]">
                  {pendingStart ? fmtFull(pendingStart) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">End</span>
                <span className="font-medium border border-border rounded px-2 py-0.5 text-xs bg-muted/30 min-w-[90px]">
                  {pendingEnd ? fmtFull(pendingEnd) : "—"}
                </span>
              </div>
              <div className="w-full sm:w-auto sm:ml-auto">
                <button
                  type="button"
                  disabled={!pendingStart || !pendingEnd || pickingEnd}
                  onClick={applyRange}
                  className="w-full sm:w-auto px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
