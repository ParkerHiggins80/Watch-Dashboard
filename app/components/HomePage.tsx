"use client";
import { useState, useEffect } from "react";
import {
  COLORS,
  DAYS,
  TODAY_INDEX,
  getToday,
  getFormattedDate,
} from "../constants";

interface HomePageProps {
  todayDay: string;
  todayTemplate: any;
  schedule: Record<string, string>;
  templates: any[];
  history: any[];
  onStartWorkout: (template: any, editingCompleted?: any, dateStr?: string) => void;
  tasks: string[];
  taskCompletions: Record<string, boolean[]>;
  setTaskCompletions: (completions: Record<string, boolean[]>) => void;
  onScheduleChange: (schedule: Record<string, string>) => void;
  dayOverrides: Record<string, string>;
  setDayOverrides: (overrides: Record<string, string>) => void;
  activeSessions: any[];
  activeSessionIndex: number;
  onContinueWorkout: (idx: number) => void;
  onUpdatePendingSession: (sessionId: string, templateId: string) => void;
  onAddNewSession: (template: any) => void;
  onFinishAndSwitch: (templateId: string) => void;
  onDeleteAndSwitch: (templateId: string) => void;
}

export default function HomePage({
  todayDay,
  todayTemplate,
  schedule,
  templates,
  history,
  onStartWorkout,
  tasks,
  taskCompletions,
  setTaskCompletions,
  onScheduleChange,
  dayOverrides,
  setDayOverrides,
  activeSessions,
  activeSessionIndex,
  onContinueWorkout,
  onUpdatePendingSession,
  onAddNewSession,
  onFinishAndSwitch,
  onDeleteAndSwitch,
}: HomePageProps) {
  const today = getToday();

  const [windowWidth, setWindowWidth] = useState(1200);
  const [windowHeight, setWindowHeight] = useState(800);
  const [mobileTab, setMobileTab] = useState("workout");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [popupDay, setPopupDay] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<any>(null);
  const [showScheduleInfo, setShowScheduleInfo] = useState(false);
  const [showWeekCalendar, setShowWeekCalendar] = useState(false);
  const [showDateTooltip, setShowDateTooltip] = useState(false);
  const [showWeekTooltip, setShowWeekTooltip] = useState(false);
  const [pendingWeekStart, setPendingWeekStart] = useState<string | null>(null);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [showWorkoutTooltip, setShowWorkoutTooltip] = useState(false);
  const [showLogTooltip, setShowLogTooltip] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null,
  );
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(
    null,
  );
  const [showScheduleDayTooltip, setShowScheduleDayTooltip] = useState<
    string | null
  >(null);
  const [showPendingPicker, setShowPendingPicker] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Calculate available height: window height minus navbar (~56px), title (~60px), padding
  const availableHeight = windowHeight - 220;
  const selectedDayIndex = (selectedDate.getDay() + 6) % 7;
  const selectedDay = DAYS[selectedDayIndex];
  const selectedTemplateId = schedule[selectedDay];
  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  const overrideTemplateId = dayOverrides[selectedDateStr];
  const effectiveTemplateId = overrideTemplateId || selectedTemplateId;
  const selectedTemplate = templates.find(
    (t) => t.id === effectiveTemplateId,
  ) || { name: "Rest", exercises: [] };
  const hasOverride = !!dayOverrides[selectedDateStr];
  const selectedCompleted = history.some((w) => w.date === selectedDateStr);
  const selectedDateWorkouts = history.filter(
    (w) => w.date === selectedDateStr,
  );
  const inProgressSession = activeSessions.find(
    (s) => !s._completed && !s._editing && !s._pending,
  );
  const completedSessions = activeSessions.filter((s) => s._completed);
  const isToday = selectedDateStr === getToday();
  const canAddSession =
    isToday &&
    activeSessions.length < 5 &&
    !activeSessions.some((s) => s._pending) &&
    selectedCompleted &&
    !activeSessions.some((s) => s._editing);

  const getSelectedFormattedDate = () => {
    const day = selectedDate.getDate();
    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
          ? "nd"
          : day % 10 === 3 && day !== 13
            ? "rd"
            : "th";
    const weekday = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const month = selectedDate.toLocaleDateString("en-US", { month: "long" });
    const year = selectedDate.getFullYear();
    return `${weekday}, ${month} ${day}${suffix}, ${year}`;
  };

  const getWeekDates = () => {
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() - ((selectedDate.getDay() + 6) % 7));
    return DAYS.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  };

  const weekDates = getWeekDates();

  const cycleTemplate = (day: string) => {
    const currentId = schedule[day];
    const templateIds = templates.map((t) => t.id);
    const currentIndex = templateIds.indexOf(currentId);
    const nextIndex = (currentIndex + 1) % templateIds.length;
    onScheduleChange({ ...schedule, [day]: templateIds[nextIndex] });
  };

  const handlePointerDown = (day: string) => {
    const timer = setTimeout(() => {
      setPopupDay(day);
      setLongPressTimer(null);
    }, 500);
    setLongPressTimer(timer);
  };

  const handlePointerUp = (day: string) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      cycleTemplate(day);
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const toggleTask = (date: string, taskIndex: number) => {
    const current =
      taskCompletions[date] || new Array(tasks.length).fill(false);
    const updated = [...current];
    updated[taskIndex] = !updated[taskIndex];
    setTaskCompletions({ ...taskCompletions, [date]: updated });
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear().toString().slice(2);
    return `${month}/${day}/${year}`;
  };

  const cardStyle = {
    background: COLORS.card,
    borderRadius: 12,
    padding: 16,
    border: `1px solid ${COLORS.border}`,
  };

  const activeTasks = tasks
    .map((name, index) => ({ name, index }))
    .filter((t) => t.name.trim() !== "");

  // Heatmap: build a year's worth of data
  const getHeatmapData = () => {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const days: { date: string; gym: boolean }[] = [];
    const cursor = new Date(yearStart);
    while (cursor <= today) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const gymDone = history.some((w) => w.date === dateStr);
      days.push({ date: dateStr, gym: gymDone });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  };

  const heatmapDays = getHeatmapData();

  const getWorkoutColor = (dateStr: string) => {
    const workoutsOnDay = history.filter((w) => w.date === dateStr);
    if (workoutsOnDay.length === 0) return null;

    const getVolume = (w: any) =>
      (w.exercises || []).reduce((total: number, ex: any) => {
        const template = templates.find((t) =>
          t.exercises?.some((te: any) => te.name === ex.name)
        );
        const templateEx = template?.exercises?.find((te: any) => te.name === ex.name);
        const repRange = templateEx?.repRange || "8-12";
        const [minRep, maxRep] = repRange.split("-").map(Number);
        const validSets = (ex.sets || []).filter((s: any) => {
          const r = Number(s.reps);
          return r >= (minRep || 1) && r <= (maxRep || 999);
        });
        return total + validSets.reduce((st: number, s: any) => st + Number(s.weight) * Number(s.reps), 0);
      }, 0);

    const dayVolume = workoutsOnDay.reduce((sum: number, w: any) => sum + getVolume(w), 0);

    // Find previous workout(s) with same name for comparison
    const prevWorkouts = workoutsOnDay.flatMap((w: any) => {
      const same = history
        .filter((h) => h.name === w.name && h.date < dateStr)
        .sort((a, b) => b.date.localeCompare(a.date));
      return same.length > 0 ? [same[0]] : [];
    });

    let prevVolume: number;
    if (prevWorkouts.length > 0) {
      prevVolume = prevWorkouts.reduce((sum: number, w: any) => sum + getVolume(w), 0) / prevWorkouts.length;
    } else {
      // No matching previous — compare against global average
      const allVolumes = history
        .filter((h) => h.date !== dateStr)
        .map((h) => getVolume(h))
        .filter((v) => v > 0);
      prevVolume = allVolumes.length > 0
        ? allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length
        : dayVolume;
    }

    if (prevVolume === 0) return "#1e3a5f";
    const pct = (dayVolume - prevVolume) / prevVolume;

    // 4 levels
    if (pct >= 0.1)  return "#2563eb"; // much better  - bright blue
    if (pct >= 0)    return "#1d4ed8"; // better        - medium blue
    if (pct >= -0.1) return "#1e3a5f"; // worse         - dark blue
    return "#162d4a";                  // much worse    - very dark blue
  };

  const getFullYearGrid = () => {
    const year = new Date().getFullYear();
    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    const startDow = jan1.getDay(); // 0=Sun
    const padStart = Array(startDow).fill(null);
    const endDow = dec31.getDay();
    const padEnd = Array(endDow < 6 ? 6 - endDow : 0).fill(null);
    // Build full year days (Sun-Sat)
    const allDays: { date: string; gym: boolean }[] = [];
    const cursor = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    while (cursor <= end) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const found = heatmapDays.find(d => d.date === dateStr);
      allDays.push(found || { date: dateStr, gym: false });
      cursor.setDate(cursor.getDate() + 1);
    }
    return [...padStart, ...allDays, ...padEnd];
  };

  const HEATMAP_MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div
      onClick={() => {
        showCalendar && setShowCalendar(false);
        showWeekCalendar && setShowWeekCalendar(false);
        showWorkoutPicker && setShowWorkoutPicker(false);
      }}
    >
      {isMobile && (
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          <button
            onClick={() => setMobileTab("workout")}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: mobileTab === "workout" ? COLORS.accent : COLORS.card,
              color: mobileTab === "workout" ? COLORS.text : COLORS.dim,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Day
          </button>
          <button
            onClick={() => setMobileTab("weekly")}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: mobileTab === "weekly" ? COLORS.accent : COLORS.card,
              color: mobileTab === "weekly" ? COLORS.text : COLORS.dim,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Week
          </button>
        </div>
      )}

      {(!isMobile || mobileTab !== "weekly") && (
        <div style={{ position: "relative", marginBottom: 20 }}>
          <h1
            onClick={() => setShowCalendar(!showCalendar)}
            onMouseEnter={() => setShowDateTooltip(true)}
            onMouseLeave={() => setShowDateTooltip(false)}
            style={{
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
              cursor: "pointer",
              userSelect: "none",
              display: "inline",
              position: "relative",
            }}
          >
            {getSelectedFormattedDate()}{" "}
            <span style={{ fontSize: 16, color: COLORS.dim }}>▼</span>
            {showDateTooltip && !showCalendar && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  background: COLORS.inner,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 13,
                  fontWeight: 400,
                  color: COLORS.dim,
                  whiteSpace: "nowrap",
                  zIndex: 10,
                }}
              >
                Click to change date
              </div>
            )}
          </h1>

          {showCalendar && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 8,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: 16,
                zIndex: 1000,
                minWidth: 380,
              }}
            >
              {(() => {
                // Calendar month is based on selectedDate
                const calYear = selectedDate.getFullYear();
                const calMonth = selectedDate.getMonth();

                const monthStart = new Date(calYear, calMonth, 1);
                const gridStart = new Date(monthStart);
                gridStart.setDate(
                  monthStart.getDate() - ((monthStart.getDay() + 6) % 7),
                );

                const monthName = selectedDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                });

                const days: Date[] = [];
                const cursor = new Date(gridStart);
                for (let i = 0; i < 42; i++) {
                  days.push(new Date(cursor));
                  cursor.setDate(cursor.getDate() + 1);
                }

                const currentWeekDates = weekDates;

                const toDateStr = (d: Date) =>
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

                return (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <button
                        onClick={() => {
                          const d = new Date(selectedDate);
                          d.setMonth(d.getMonth() - 1);
                          setSelectedDate(d);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: COLORS.accent,
                          cursor: "pointer",
                          fontSize: 18,
                          padding: "4px 8px",
                        }}
                      >
                        ◀
                      </button>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>
                        {monthName}
                      </span>
                      <button
                        onClick={() => {
                          const d = new Date(selectedDate);
                          d.setMonth(d.getMonth() + 1);
                          setSelectedDate(d);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: COLORS.accent,
                          cursor: "pointer",
                          fontSize: 18,
                          padding: "4px 8px",
                        }}
                      >
                        ▶
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gap: 2,
                        marginBottom: 4,
                      }}
                    >
                      {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                        <div
                          key={d}
                          style={{
                            textAlign: "center",
                            fontSize: 12,
                            color: COLORS.dim,
                            fontWeight: 600,
                            padding: 4,
                          }}
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gap: 2,
                      }}
                    >
                      {days.map((d, i) => {
                        const dateStr = toDateStr(d);
                        const isCurrentMonth = d.getMonth() === calMonth;
                        const isSelected = dateStr === selectedDateStr;
                        const isInWeek = currentWeekDates.includes(dateStr);
                        const isToday = dateStr === today;
                        const hasWorkout = history.some(
                          (w) => w.date === dateStr,
                        );

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (isSelected) {
                                setShowCalendar(false);
                              } else {
                                setSelectedDate(new Date(d));
                              }
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              border: isToday
                                ? `2px solid ${COLORS.accent}`
                                : "none",
                              background: isSelected
                                ? COLORS.accent
                                : isInWeek
                                  ? COLORS.accent + "22"
                                  : "transparent",
                              color: isSelected
                                ? COLORS.text
                                : !isCurrentMonth
                                  ? COLORS.border
                                  : COLORS.text,
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: isSelected ? 700 : 400,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              position: "relative",
                              margin: "0 auto",
                            }}
                          >
                            {d.getDate()}
                            {hasWorkout && (
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: 2,
                                  width: 4,
                                  height: 4,
                                  borderRadius: "50%",
                                  background: isSelected
                                    ? COLORS.text
                                    : COLORS.green,
                                }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDate(new Date());
                        setShowCalendar(false);
                      }}
                      style={{
                        width: "100%",
                        marginTop: 12,
                        padding: "8px",
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.inner,
                        color: COLORS.accent,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Today
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
          height: isMobile ? "auto" : availableHeight,
        }}
      >
        {/* ===== LEFT COLUMN ===== */}
        {(!isMobile || mobileTab === "workout") && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 530,
              overflow: "hidden",
            }}
          >
            {/* ===== WORKOUT CARD ===== */}
            <div
              style={{
                ...cardStyle,
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* ── Header row ── */}
              {!selectedCompleted && !inProgressSession && selectedTemplate.name !== "Rest" && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      position: "relative",
                    }}
                  >
                    {/* Only show template picker when NOT completed */}
                    {!selectedCompleted &&
                    !activeSessions.filter((s) => !s._completed && !s._editing)
                      .length ? (
                      <h2
                        onClick={() => setShowWorkoutPicker(!showWorkoutPicker)}
                        onMouseEnter={() => setShowWorkoutTooltip(true)}
                        onMouseLeave={() => setShowWorkoutTooltip(false)}
                        style={{
                          fontSize: 20,
                          fontWeight: 600,
                          margin: 0,
                          cursor: "pointer",
                          userSelect: "none" as const,
                        }}
                      >
                        {selectedTemplate.name}{" "}
                        <span style={{ fontSize: 12, color: COLORS.dim }}>
                          ▼
                        </span>
                        {showWorkoutTooltip && !showWorkoutPicker && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              marginTop: 4,
                              background: COLORS.inner,
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: 8,
                              padding: "6px 10px",
                              fontSize: 13,
                              fontWeight: 400,
                              color: COLORS.dim,
                              whiteSpace: "nowrap",
                              zIndex: 10,
                            }}
                          >
                            Click to change template for today
                          </div>
                        )}
                      </h2>
                    ) : (
                      <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
                        {selectedTemplate.name}
                      </h2>
                    )}

                    {/* Revert only when not completed */}
                    {hasOverride && !selectedCompleted && (
                      <button
                        onClick={() => {
                          const u = { ...dayOverrides };
                          delete u[selectedDateStr];
                          setDayOverrides(u);
                        }}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "none",
                          background: "#e8870e",
                          color: "#fff",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        Revert
                      </button>
                    )}

                    {/* Template picker dropdown */}
                    {showWorkoutPicker && !selectedCompleted && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          marginTop: 8,
                          background: COLORS.card,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 12,
                          padding: 12,
                          zIndex: 1000,
                          minWidth: 200,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {templates.map((t) => {
                          const isCurrent = t.id === effectiveTemplateId;
                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                if (t.id === effectiveTemplateId) {
                                  setShowWorkoutPicker(false);
                                  return;
                                }
                                if (
                                  inProgressSession &&
                                  inProgressSession.date === today
                                ) {
                                  setPendingTemplateId(t.id);
                                  setShowSessionWarning(true);
                                  setShowWorkoutPicker(false);
                                  return;
                                }
                                if (t.id === selectedTemplateId) {
                                  const u = { ...dayOverrides };
                                  delete u[selectedDateStr];
                                  setDayOverrides(u);
                                } else {
                                  setDayOverrides({
                                    ...dayOverrides,
                                    [selectedDateStr]: t.id,
                                  });
                                }
                                setShowWorkoutPicker(false);
                              }}
                              style={{
                                padding: "8px 12px",
                                borderRadius: 8,
                                border: isCurrent
                                  ? `2px solid ${COLORS.accent}`
                                  : `1px solid ${COLORS.border}`,
                                background: isCurrent
                                  ? COLORS.accent + "22"
                                  : COLORS.inner,
                                color: isCurrent ? COLORS.accent : COLORS.text,
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: isCurrent ? 600 : 400,
                                textAlign: "left" as const,
                              }}
                            >
                              {t.name}
                              {isCurrent && " ✓"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right-side button */}
                  {inProgressSession && isToday ? (
                    <button
                      onClick={() =>
                        onContinueWorkout(
                          activeSessions.indexOf(inProgressSession),
                        )
                      }
                      style={{
                        padding: "10px 24px",
                        borderRadius: 8,
                        border: "none",
                        background: "#e8870e",
                        color: COLORS.text,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 15,
                      }}
                    >
                      Continue
                    </button>
                  ) : !selectedCompleted && selectedTemplate.name !== "Rest" ? (
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => onStartWorkout(selectedTemplate, undefined, selectedDateStr)}
                        onMouseEnter={() => setShowLogTooltip(true)}
                        onMouseLeave={() => setShowLogTooltip(false)}
                        style={{
                          padding: "10px 24px",
                          borderRadius: 8,
                          border: "none",
                          background: COLORS.accent,
                          color: COLORS.text,
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: 15,
                        }}
                      >
                        LOG
                      </button>
                      {showLogTooltip && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            marginTop: 4,
                            background: COLORS.inner,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: 8,
                            padding: "6px 10px",
                            fontSize: 13,
                            fontWeight: 400,
                            color: COLORS.dim,
                            whiteSpace: "nowrap",
                            zIndex: 10,
                          }}
                        >
                          Click to log your workout
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* ── Body ── */}
              {selectedTemplate.name === "Rest" && !selectedCompleted ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
                      <h2
                        onClick={() => setShowWorkoutPicker(!showWorkoutPicker)}
                        style={{ fontSize: 20, fontWeight: 600, margin: 0, cursor: "pointer", userSelect: "none" as const }}
                      >
                        {selectedTemplate.name} <span style={{ fontSize: 12, color: COLORS.dim }}>▼</span>
                      </h2>
                      {showWorkoutPicker && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: "absolute", top: "100%", left: 0, marginTop: 8, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12, zIndex: 1000, minWidth: 200, display: "flex", flexDirection: "column", gap: 4 }}
                        >
                          {templates.map((t) => {
                            const isCurrent = t.id === effectiveTemplateId;
                            return (
                              <button
                                key={t.id}
                                onClick={() => {
                                  if (t.id === selectedTemplateId) {
                                    const u = { ...dayOverrides }; delete u[selectedDateStr]; setDayOverrides(u);
                                  } else {
                                    setDayOverrides({ ...dayOverrides, [selectedDateStr]: t.id });
                                  }
                                  setShowWorkoutPicker(false);
                                }}
                                style={{ padding: "8px 12px", borderRadius: 8, border: isCurrent ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`, background: isCurrent ? COLORS.accent + "22" : COLORS.inner, color: isCurrent ? COLORS.accent : COLORS.text, cursor: "pointer", fontSize: 14, fontWeight: isCurrent ? 600 : 400, textAlign: "left" as const }}
                              >
                                {t.name}{isCurrent && " ✓"}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <p style={{ color: COLORS.dim, margin: 0 }}>
                    Rest day — recovery is part of the process
                  </p>
                </>
              ) : !selectedCompleted ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: `1px solid ${COLORS.border}`,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        color: COLORS.dim,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "uppercase" as const,
                      }}
                    >
                      Exercise
                    </span>
                    <span
                      style={{
                        color: COLORS.dim,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "uppercase" as const,
                      }}
                    >
                      Sets × Reps
                    </span>
                  </div>
                  {selectedTemplate.exercises.map((ex: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom:
                          i < selectedTemplate.exercises.length - 1
                            ? `1px solid ${COLORS.border}`
                            : "none",
                      }}
                    >
                      <span style={{ fontSize: 15 }}>{ex.name}</span>
                      <span style={{ color: COLORS.dim, fontSize: 14 }}>
                        {ex.sets} × {ex.repRange || "8-12"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                /* ── Completed state ── */
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    justifyContent: "space-between",
                    minHeight: 0,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div>
                      {/* Pending new session */}
                      {isToday &&
                        activeSessions
                          .filter((s) => s._pending)
                          .map((s) => {
                            const pendingTemplate =
                              templates.find((t) => t.id === s.templateId) ||
                              selectedTemplate;
                            return (
                              <div key={s.id}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    paddingBottom: 10,
                                  }}
                                >
                                  <div style={{ position: "relative" }}>
                                    <h2
                                      onClick={() =>
                                        setShowWorkoutPicker(!showWorkoutPicker)
                                      }
                                      onMouseEnter={() =>
                                        setShowWorkoutTooltip(true)
                                      }
                                      onMouseLeave={() =>
                                        setShowWorkoutTooltip(false)
                                      }
                                      style={{
                                        fontSize: 20,
                                        fontWeight: 600,
                                        margin: 0,
                                        cursor: "pointer",
                                        userSelect: "none" as const,
                                      }}
                                    >
                                      {pendingTemplate.name}{" "}
                                      <span
                                        style={{
                                          fontSize: 12,
                                          color: COLORS.dim,
                                        }}
                                      >
                                        ▼
                                      </span>
                                    </h2>
                                    {showWorkoutPicker && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                          position: "absolute",
                                          top: "100%",
                                          left: 0,
                                          marginTop: 8,
                                          background: COLORS.card,
                                          border: `1px solid ${COLORS.border}`,
                                          borderRadius: 12,
                                          padding: 12,
                                          zIndex: 1000,
                                          minWidth: 200,
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 4,
                                        }}
                                      >
                                        {templates.map((t) => {
                                          const isCurrent =
                                            t.id === s.templateId;
                                          return (
                                            <button
                                              key={t.id}
                                              onClick={() => {
                                                onUpdatePendingSession(
                                                  s.id,
                                                  t.id,
                                                );
                                                setShowWorkoutPicker(false);
                                              }}
                                              style={{
                                                padding: "8px 12px",
                                                borderRadius: 8,
                                                border: isCurrent
                                                  ? `2px solid ${COLORS.accent}`
                                                  : `1px solid ${COLORS.border}`,
                                                background: isCurrent
                                                  ? COLORS.accent + "22"
                                                  : COLORS.inner,
                                                color: isCurrent
                                                  ? COLORS.accent
                                                  : COLORS.text,
                                                cursor: "pointer",
                                                fontSize: 14,
                                                fontWeight: isCurrent
                                                  ? 600
                                                  : 400,
                                                textAlign: "left" as const,
                                              }}
                                            >
                                              {t.name}
                                              {isCurrent && " ✓"}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {false && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                          position: "absolute",
                                          top: "100%",
                                          left: 0,
                                          marginTop: 8,
                                          background: COLORS.card,
                                          border: `1px solid ${COLORS.border}`,
                                          borderRadius: 12,
                                          padding: 12,
                                          zIndex: 1000,
                                          minWidth: 200,
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 4,
                                        }}
                                      >
                                        {templates.map((t) => {
                                          const isCurrent =
                                            t.id === s.templateId;
                                          return (
                                            <button
                                              key={t.id}
                                              onClick={() => {
                                                const updated =
                                                  activeSessions.map((sess) =>
                                                    sess.id === s.id
                                                      ? {
                                                          ...sess,
                                                          templateId: t.id,
                                                          name: t.name,
                                                        }
                                                      : sess,
                                                  );
                                                activeSessions;
                                                setShowPendingPicker(false);
                                              }}
                                              style={{
                                                padding: "8px 12px",
                                                borderRadius: 8,
                                                border: isCurrent
                                                  ? `2px solid ${COLORS.accent}`
                                                  : `1px solid ${COLORS.border}`,
                                                background: isCurrent
                                                  ? COLORS.accent + "22"
                                                  : COLORS.inner,
                                                color: isCurrent
                                                  ? COLORS.accent
                                                  : COLORS.text,
                                                cursor: "pointer",
                                                fontSize: 14,
                                                fontWeight: isCurrent
                                                  ? 600
                                                  : 400,
                                                textAlign: "left" as const,
                                              }}
                                            >
                                              {t.name}
                                              {isCurrent && " ✓"}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() =>
                                      onContinueWorkout(
                                        activeSessions.indexOf(s),
                                      )
                                    }
                                    style={{
                                      padding: "10px 24px",
                                      borderRadius: 8,
                                      border: "none",
                                      background: COLORS.accent,
                                      color: COLORS.text,
                                      cursor: "pointer",
                                      fontWeight: 700,
                                      fontSize: 15,
                                    }}
                                  >
                                    LOG
                                  </button>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    padding: "6px 0",
                                    borderTop: `1px solid ${COLORS.border}`,
                                    borderBottom: `1px solid ${COLORS.border}`,
                                    marginBottom: 4,
                                  }}
                                >
                                  <span
                                    style={{
                                      color: COLORS.dim,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      textTransform: "uppercase" as const,
                                    }}
                                  >
                                    Exercise
                                  </span>
                                  <span
                                    style={{
                                      color: COLORS.dim,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      textTransform: "uppercase" as const,
                                    }}
                                  >
                                    Sets × Reps
                                  </span>
                                </div>
                                {pendingTemplate.exercises.map(
                                  (ex: any, ei: number) => (
                                    <div
                                      key={ei}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "8px 0",
                                        borderBottom: `1px solid ${COLORS.border}`,
                                        fontSize: 14,
                                      }}
                                    >
                                      <span>{ex.name}</span>
                                      <span style={{ color: COLORS.dim }}>
                                        {ex.sets} × {ex.repRange || "8-12"}
                                      </span>
                                    </div>
                                  ),
                                )}
                                <div
                                  style={{
                                    borderBottom: `1px solid ${COLORS.border}`,
                                    margin: "12px 0",
                                  }}
                                />
                              </div>
                            );
                          })}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: activeSessions.some((s) => s._pending)
                          ? "flex-end"
                          : "flex-start",
                      }}
                    >
                      {/* Completed sessions */}
                      {[...selectedDateWorkouts].reverse().map((w, i) => {
                        const isExpanded =
                          expandedSessionId === w.id ||
                          (expandedSessionId === null &&
                            i === 0 &&
                            activeSessions.filter(
                              (s) => !s._completed && !s._editing,
                            ).length === 0);
                        return (
                          <div key={w.id}>
                            {/* Session header — full width, acts as the card title */}
                            <div
                              onClick={() =>
                                setExpandedSessionId(
                                  isExpanded ? "__none__" : w.id,
                                )
                              }
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 0",
                                cursor: "pointer",
                                userSelect: "none" as const,
                              }}
                            >
                              <span style={{ fontWeight: 700, fontSize: 18 }}>
                                {w.name}
                                <span
                                  style={{
                                    color: COLORS.dim,
                                    fontWeight: 400,
                                    marginLeft: 8,
                                    fontSize: 13,
                                  }}
                                >
                                  {isExpanded ? "▲" : "▼"}
                                </span>
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartWorkout(selectedTemplate, w);
                                }}
                                style={{
                                  padding: "8px 16px",
                                  borderRadius: 8,
                                  border: `1px solid ${COLORS.green}`,
                                  background: "transparent",
                                  color: COLORS.green,
                                  cursor: "pointer",
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                Edit Completed
                              </button>
                            </div>
                            {/* Expanded exercise list */}
                            {isExpanded && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    padding: "6px 0",
                                    borderTop: `1px solid ${COLORS.border}`,
                                    borderBottom: `1px solid ${COLORS.border}`,
                                  }}
                                >
                                  <span
                                    style={{
                                      color: COLORS.dim,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      textTransform: "uppercase" as const,
                                    }}
                                  >
                                    Exercise
                                  </span>
                                  <span
                                    style={{
                                      color: COLORS.dim,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      textTransform: "uppercase" as const,
                                    }}
                                  >
                                    Sets logged
                                  </span>
                                </div>
                                {w.exercises.map((ex: any, ei: number) => (
                                  <div
                                    key={ei}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      padding: "8px 0",
                                      borderBottom: `1px solid ${COLORS.border}`,
                                      fontSize: 14,
                                    }}
                                  >
                                    <span>{ex.name}</span>
                                    <span style={{ color: COLORS.dim }}>
                                      {ex.sets.length}{" "}
                                      {ex.sets.length === 1 ? "set" : "sets"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Separator between sessions */}
                            {i < selectedDateWorkouts.length - 1 && (
                              <div
                                style={{
                                  borderBottom: `1px solid ${COLORS.border}`,
                                  margin: "4px 0",
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      paddingTop: 8,
                    }}
                  >
                    {/* Create New Session button */}
                    {isToday && canAddSession && (
                      <button
                        onClick={() => onAddNewSession(selectedTemplate)}
                        style={{
                          width: "100%",
                          padding: "8px 0",
                          borderRadius: 8,
                          border: `1px dashed ${COLORS.accent}`,
                          background: "transparent",
                          color: COLORS.accent,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 13,
                          marginTop: 8,
                        }}
                      >
                        + Create New Session
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Fade overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 60,
                  background: `linear-gradient(transparent, ${COLORS.card})`,
                  pointerEvents: "none",
                  borderRadius: "0 0 12px 12px",
                }}
              />
            </div>
            {/* Schedule - fixed height at bottom */}
            <div style={{ ...cardStyle, flexShrink: 0, padding: "20px 16px" }}>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  margin: "0 0 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  position: "relative",
                }}
              >
                Schedule
                <span
                  onClick={() => setShowScheduleInfo(!showScheduleInfo)}
                  onMouseEnter={() => setShowScheduleInfo(true)}
                  onMouseLeave={() => setShowScheduleInfo(false)}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: `1px solid ${COLORS.dim}`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: COLORS.dim,
                    cursor: "pointer",
                    fontWeight: 400,
                  }}
                >
                  i
                </span>
                {showScheduleInfo && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: 4,
                      background: COLORS.inner,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 400,
                      color: COLORS.dim,
                      whiteSpace: "nowrap",
                      zIndex: 10,
                    }}
                  >
                    Tap to cycle templates · Long press for dropdown
                  </div>
                )}
              </h3>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {DAYS.map((day, i) => {
                  const templateId = schedule[day];
                  const template = templates.find((t) => t.id === templateId);
                  const isTodayDay = i === selectedDayIndex;
                  return (
                    <div key={day} style={{ textAlign: "center", flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: isTodayDay ? COLORS.accent : COLORS.text,
                          fontWeight: isTodayDay ? 700 : 400,
                          marginBottom: 4,
                        }}
                      >
                        {day.slice(0, 3)}
                      </div>
                      <div
                        onPointerDown={() => handlePointerDown(day)}
                        onPointerUp={() => handlePointerUp(day)}
                        onPointerLeave={() => {
                          handlePointerLeave();
                          setShowScheduleDayTooltip(null);
                        }}
                        onMouseEnter={() => setShowScheduleDayTooltip(day)}
                        onMouseLeave={() => setShowScheduleDayTooltip(null)}
                        style={{
                          fontSize: 11,
                          color: isTodayDay ? COLORS.accent : COLORS.dim,
                          background: isTodayDay
                            ? COLORS.accent + "22"
                            : COLORS.inner,
                          borderRadius: 6,
                          padding: "6px 2px",
                          cursor: "pointer",
                          userSelect: "none",
                          transition: "background 0.15s",
                          position: "relative",
                        }}
                      >
                        {template ? template.name.replace(" Day", "") : "Rest"}
                        {showScheduleDayTooltip === day && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: "100%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              marginBottom: 4,
                              background: COLORS.inner,
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: 8,
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: 400,
                              color: COLORS.dim,
                              whiteSpace: "nowrap",
                              zIndex: 10,
                            }}
                          >
                            Click to change
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== RIGHT COLUMN ===== */}
        {(!isMobile || mobileTab === "weekly") && (
          <div
            style={{
              flex: 1, // How flexible the right column is, because the flex of right is equal to left they both take 50% of the space, if we set flex: 2 it will take 66% and left will take 33%
              display: "flex",
              flexDirection: "column",
              minHeight: 530,
            }}
          >
            <div
              style={{ ...cardStyle, flex: 1, minHeight: 0, overflow: "auto" }}
            >
              <div style={{ position: "relative", marginBottom: 16 }}>
                <h2
                  onClick={() => {
                    setShowWeekCalendar(!showWeekCalendar);
                    setPendingWeekStart(null);
                  }}
                  onMouseEnter={() => setShowWeekTooltip(true)}
                  onMouseLeave={() => setShowWeekTooltip(false)}
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    margin: 0,
                    cursor: "pointer",
                    userSelect: "none",
                    display: "inline-block",
                    position: "relative",
                  }}
                >
                  Week of {formatShortDate(weekDates[0])}{" "}
                  <span style={{ fontSize: 14, color: COLORS.dim }}>▼</span>
                  {showWeekTooltip && !showWeekCalendar && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: 4,
                        background: COLORS.inner,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 13,
                        fontWeight: 400,
                        color: COLORS.dim,
                        whiteSpace: "nowrap",
                        zIndex: 10,
                      }}
                    >
                      Click to change week
                    </div>
                  )}
                </h2>
                {showWeekCalendar && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: 8,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 12,
                      padding: 16,
                      zIndex: 1000,
                      minWidth: 380,
                    }}
                  >
                    {(() => {
                      const calYear = selectedDate.getFullYear();
                      const calMonth = selectedDate.getMonth();
                      const monthStart = new Date(calYear, calMonth, 1);
                      const gridStart = new Date(monthStart);
                      gridStart.setDate(
                        monthStart.getDate() - ((monthStart.getDay() + 6) % 7),
                      );
                      const monthName = selectedDate.toLocaleDateString(
                        "en-US",
                        { month: "long", year: "numeric" },
                      );
                      const days: Date[] = [];
                      const cursor = new Date(gridStart);
                      for (let i = 0; i < 42; i++) {
                        days.push(new Date(cursor));
                        cursor.setDate(cursor.getDate() + 1);
                      }
                      const currentWeekDates = weekDates;
                      const toDateStr = (d: Date) =>
                        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

                      const getWeekMondayStr = (d: Date) => {
                        const mon = new Date(d);
                        mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
                        return toDateStr(mon);
                      };

                      const currentMondayStr = getWeekMondayStr(selectedDate);

                      const getPendingWeekDates = (mondayStr: string) => {
                        const mon = new Date(mondayStr + "T12:00:00");
                        return Array.from({ length: 7 }, (_, i) => {
                          const d = new Date(mon);
                          d.setDate(mon.getDate() + i);
                          return toDateStr(d);
                        });
                      };

                      const pendingDates = pendingWeekStart
                        ? getPendingWeekDates(pendingWeekStart)
                        : null;

                      return (
                        <>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                            }}
                          >
                            <button
                              onClick={() => {
                                const d = new Date(selectedDate);
                                d.setMonth(d.getMonth() - 1);
                                setSelectedDate(d);
                                setPendingWeekStart(null);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: COLORS.accent,
                                cursor: "pointer",
                                fontSize: 18,
                                padding: "4px 8px",
                              }}
                            >
                              ◀
                            </button>
                            <span style={{ fontSize: 16, fontWeight: 600 }}>
                              {monthName}
                            </span>
                            <button
                              onClick={() => {
                                const d = new Date(selectedDate);
                                d.setMonth(d.getMonth() + 1);
                                setSelectedDate(d);
                                setPendingWeekStart(null);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: COLORS.accent,
                                cursor: "pointer",
                                fontSize: 18,
                                padding: "4px 8px",
                              }}
                            >
                              ▶
                            </button>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(7, 1fr)",
                              gap: 2,
                              marginBottom: 4,
                            }}
                          >
                            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(
                              (d) => (
                                <div
                                  key={d}
                                  style={{
                                    textAlign: "center",
                                    fontSize: 12,
                                    color: COLORS.dim,
                                    fontWeight: 600,
                                    padding: 4,
                                  }}
                                >
                                  {d}
                                </div>
                              ),
                            )}
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(7, 1fr)",
                              gap: 2,
                            }}
                          >
                            {days.map((d, i) => {
                              const dateStr = toDateStr(d);
                              const isCurrentMonth = d.getMonth() === calMonth;
                              const isToday = dateStr === today;
                              const hasWorkout = history.some(
                                (w) => w.date === dateStr,
                              );
                              const clickedMondayStr = getWeekMondayStr(d);
                              const isInCurrentWeek =
                                currentWeekDates.includes(dateStr);
                              const isInPendingWeek = pendingDates
                                ? pendingDates.includes(dateStr)
                                : false;
                              const isPending = pendingWeekStart !== null;

                              let bg = "transparent";
                              if (isPending) {
                                if (isInPendingWeek) bg = COLORS.accent;
                                else if (isInCurrentWeek)
                                  bg = COLORS.accent + "44";
                              } else {
                                if (isInCurrentWeek) bg = COLORS.accent;
                              }

                              let textColor = COLORS.text;
                              if (!isCurrentMonth) textColor = COLORS.border;
                              else if (
                                (isPending && isInPendingWeek) ||
                                (!isPending && isInCurrentWeek)
                              )
                                textColor = COLORS.text;

                              return (
                                <button
                                  key={i}
                                  onClick={() => {
                                    if (isPending && isInPendingWeek) {
                                      const dayOfWeek =
                                        (selectedDate.getDay() + 6) % 7;
                                      const newDate = new Date(
                                        pendingWeekStart + "T12:00:00",
                                      );
                                      newDate.setDate(
                                        newDate.getDate() + dayOfWeek,
                                      );
                                      setSelectedDate(newDate);
                                      setPendingWeekStart(null);
                                      setShowWeekCalendar(false);
                                    } else if (!isPending && isInCurrentWeek) {
                                      setShowWeekCalendar(false);
                                    } else {
                                      setPendingWeekStart(clickedMondayStr);
                                    }
                                  }}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    border: isToday
                                      ? `2px solid ${COLORS.accent}`
                                      : "none",
                                    background: bg,
                                    color: textColor,
                                    cursor: "pointer",
                                    fontSize: 13,
                                    fontWeight:
                                      (isPending && isInPendingWeek) ||
                                      (!isPending && isInCurrentWeek)
                                        ? 700
                                        : 400,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                    margin: "0 auto",
                                  }}
                                >
                                  {d.getDate()}
                                  {hasWorkout && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        bottom: 2,
                                        width: 4,
                                        height: 4,
                                        borderRadius: "50%",
                                        background:
                                          (isPending && isInPendingWeek) ||
                                          (!isPending && isInCurrentWeek)
                                            ? COLORS.text
                                            : COLORS.green,
                                      }}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {pendingWeekStart && (
                            <p
                              style={{
                                fontSize: 12,
                                color: COLORS.dim,
                                margin: "8px 0 0",
                                textAlign: "center",
                              }}
                            >
                              Click the highlighted week to confirm
                            </p>
                          )}
                          <button
                            onClick={() => {
                              setSelectedDate(new Date());
                              setPendingWeekStart(null);
                              setShowWeekCalendar(false);
                            }}
                            style={{
                              width: "100%",
                              marginTop: 8,
                              padding: "8px",
                              borderRadius: 8,
                              border: `1px solid ${COLORS.border}`,
                              background: COLORS.inner,
                              color: COLORS.accent,
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            Today
                          </button>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {DAYS.map((day, i) => {
                const date = weekDates[i];
                const isSelected = i === selectedDayIndex;
                const templateId = schedule[day];
                const template = templates.find((t) => t.id === templateId);
                const workoutDone = history.some((w) => w.date === date);
                const dayCompletions =
                  taskCompletions[date] || new Array(tasks.length).fill(false);

                return (
                  <div
                    key={day}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "60px 1fr 10px",
                      gap: "0 12px",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: isSelected
                        ? COLORS.accent + "11"
                        : "transparent",
                      border: isSelected
                        ? `1px solid ${COLORS.accent}33`
                        : "1px solid transparent",
                      marginBottom: 2,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? COLORS.accent : COLORS.text,
                        }}
                      >
                        {day.slice(0, 3)}
                      </div>
                      <div style={{ fontSize: 13, color: COLORS.dim }}>
                        {formatShortDate(date)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: "6px 12px",
                      }}
                    >
                      {activeTasks.map((task) => {
                        const checked = dayCompletions[task.index] || false;
                        return (
                          <div
                            key={task.index}
                            onClick={() => {
                              if (isSelected) toggleTask(date, task.index);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              cursor: isSelected ? "pointer" : "default",
                              userSelect: "none",
                              minWidth: 0,
                              opacity: isSelected ? 1 : 0.5,
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                minWidth: 16,
                                borderRadius: 3,
                                border: `2px solid ${checked ? COLORS.green : COLORS.border}`,
                                background: checked
                                  ? COLORS.green
                                  : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                color: COLORS.bg,
                                transition: "all 0.15s",
                              }}
                            >
                              {checked && "✓"}
                            </div>
                            <span
                              ref={(el) => {
                                if (el) {
                                  if (el.scrollWidth > el.clientWidth) {
                                    el.style.maskImage =
                                      "linear-gradient(to right, black calc(100% - 20px), transparent 100%)";
                                    el.style.webkitMaskImage =
                                      "linear-gradient(to right, black calc(100% - 20px), transparent 100%)";
                                  } else {
                                    el.style.maskImage = "none";
                                    el.style.webkitMaskImage = "none";
                                  }
                                }
                              }}
                              style={{
                                fontSize: 14,
                                color: checked ? COLORS.text : COLORS.dim,
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                                minWidth: 0,
                              }}
                            >
                              {task.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Arrow controls - only on selected row */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      {isSelected ? (
                        <>
                          <button
                            onClick={() => {
                              const d = new Date(selectedDate);
                              d.setDate(d.getDate() - 1);
                              setSelectedDate(d);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: COLORS.accent,
                              cursor: "pointer",
                              fontSize: 18,
                              padding: "2px 8px",
                              lineHeight: 1,
                            }}
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => {
                              const d = new Date(selectedDate);
                              d.setDate(d.getDate() + 1);
                              setSelectedDate(d);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: COLORS.accent,
                              cursor: "pointer",
                              fontSize: 18,
                              padding: "2px 8px",
                              lineHeight: 1,
                            }}
                          >
                            ▼
                          </button>
                        </>
                      ) : (
                        <div
                          style={{
                            fontSize: 12,
                            color: workoutDone ? COLORS.green : COLORS.dim,
                            textAlign: "center",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {workoutDone && "✓"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Heatmap - bottom of right column */}
            <div style={{ ...cardStyle, flexShrink: 0, padding: "20px 16px", marginTop: 12 }}>
              <div style={{ fontSize: 18, color: COLORS.text, marginBottom: 12, fontWeight: 600 }}>
                {today.split("-")[0]} Activity
              </div>
              <div style={{ width: "100%" }}>
                {(() => {
                  const grid = getFullYearGrid();
                  const totalWeeks = Math.ceil(grid.length / 7);
                  const rows = Array.from({ length: 7 }, (_, row) =>
                    Array.from({ length: totalWeeks }, (_, col) => grid[col * 7 + row] ?? null)
                  );
                  const DOW_LABELS = ["Sun", "", "Tue", "", "Thu", "", "Sat"];
                  const monthCols: { label: string; col: number }[] = [];
                  HEATMAP_MONTHS.forEach((m, mi) => {
                    for (let col = 0; col < totalWeeks; col++) {
                      const cell = rows[0][col] || rows[1][col] || rows[2][col];
                      if (cell) {
                        const d = new Date(cell.date + "T12:00:00");
                        if (d.getMonth() === mi && d.getDate() <= 7) {
                          monthCols.push({ label: m, col });
                          break;
                        }
                      }
                    }
                  });
                  return (
                    <div style={{ width: "100%" }}>
                      {/* Month labels row */}
                      <div style={{ display: "flex", marginLeft: 28, marginBottom: 3 }}>
                        {Array.from({ length: totalWeeks }, (_, col) => {
                          const month = monthCols.find(mc => mc.col === col);
                          return (
                            <div key={col} style={{ flex: 1, fontSize: 9, color: COLORS.text, overflow: "visible", whiteSpace: "nowrap" }}>
                              {month ? month.label : ""}
                            </div>
                          );
                        })}
                      </div>
                      {/* Day rows */}
                      {Array.from({ length: 7 }, (_, row) => (
                        <div key={row} style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
                          <div style={{ width: 24, fontSize: 9, color: COLORS.text, textAlign: "right", paddingRight: 4, flexShrink: 0 }}>
                            {DOW_LABELS[row]}
                          </div>
                          {Array.from({ length: totalWeeks }, (_, col) => {
                            const cell = rows[row][col];
                            const isEmpty = !cell;
                            const color = cell?.gym ? getWorkoutColor(cell.date) : null;
                            return (
                              <div
                                key={col}
                                title={cell?.gym ? cell.date : ""}
                                style={{
                                  flex: 1,
                                  aspectRatio: "1",
                                  borderRadius: 2,
                                  background: isEmpty ? "transparent" : color || COLORS.inner,
                                  border: isEmpty ? "none" : `1px solid ${COLORS.border}`,
                                  marginRight: 2,
                                }}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                  {[
                    { color: "#162d4a", label: "Much worse" },
                    { color: "#1e3a5f", label: "Worse" },
                    { color: "#1d4ed8", label: "Better" },
                    { color: "#2563eb", label: "Much better" },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, border: `1px solid ${COLORS.border}` }} />
                      <span style={{ fontSize: 10, color: COLORS.dim }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Session Warning Modal */}
      {showSessionWarning && pendingTemplateId && (
        <div
          onClick={() => {
            setShowSessionWarning(false);
            setPendingTemplateId(null);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COLORS.card,
              borderRadius: 16,
              padding: 28,
              border: `1px solid ${COLORS.border}`,
              maxWidth: 420,
              width: "90%",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
              Workout In Progress
            </h3>
            <p
              style={{
                color: COLORS.dim,
                fontSize: 14,
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              You have an unfinished workout. What would you like to do?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => {
                  onFinishAndSwitch(pendingTemplateId);
                  setShowSessionWarning(false);
                  setPendingTemplateId(null);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: COLORS.green,
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  textAlign: "left" as const,
                }}
              >
                ✓ Save Current Workout &amp; Switch Template
              </button>
              <button
                onClick={() => {
                  onDeleteAndSwitch(pendingTemplateId);
                  setShowSessionWarning(false);
                  setPendingTemplateId(null);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: `1px solid ${COLORS.red}`,
                  background: "transparent",
                  color: COLORS.red,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  textAlign: "left" as const,
                }}
              >
                🗑 Discard Current Workout &amp; Switch Template
              </button>
              <button
                onClick={() => {
                  onContinueWorkout(activeSessions.indexOf(inProgressSession!));
                  setShowSessionWarning(false);
                  setPendingTemplateId(null);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.inner,
                  color: COLORS.text,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  textAlign: "left" as const,
                }}
              >
                ← Keep Going — Return to Current Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selector Popup */}
      {popupDay && (
        <div
          onClick={() => setPopupDay(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COLORS.card,
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${COLORS.border}`,
              minWidth: 280,
              maxWidth: 400,
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
              {popupDay}
            </h3>
            <p style={{ color: COLORS.dim, fontSize: 13, margin: "0 0 16px" }}>
              Select a template
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {templates.map((t) => {
                const isSelected = schedule[popupDay] === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      onScheduleChange({ ...schedule, [popupDay]: t.id });
                      setPopupDay(null);
                    }}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 8,
                      border: isSelected
                        ? `2px solid ${COLORS.accent}`
                        : `1px solid ${COLORS.border}`,
                      background: isSelected
                        ? COLORS.accent + "22"
                        : COLORS.inner,
                      color: isSelected ? COLORS.accent : COLORS.text,
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: isSelected ? 600 : 400,
                      textAlign: "left",
                    }}
                  >
                    {t.name}
                    {isSelected && " ✓"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
