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
  onStartWorkout: (
    template: any,
    editingCompleted?: any,
    dateStr?: string,
  ) => void;
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
  onAddNewSession: (template: any, dateStr?: string) => void;
  onFinishAndSwitch: (templateId: string) => void;
  onDeleteAndSwitch: (templateId: string) => void;
  onRemovePendingSession: (sessionId: string) => void;
  gyms: string[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
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
  onRemovePendingSession,
  gyms,
  selectedDate,
  setSelectedDate,
}: HomePageProps) {
  const today = getToday();

  const [windowWidth, setWindowWidth] = useState(1200);
  const [windowHeight, setWindowHeight] = useState(800);
  const [mobileTab, setMobileTab] = useState("workout");
  // selectedDate is lifted to parent
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
  const [showPlanCalendar, setShowPlanCalendar] = useState(false);
  const [planDate, setPlanDate] = useState(new Date());
  const [planTemplateId, setPlanTemplateId] = useState<string>("");
  const [planHour, setPlanHour] = useState("8");
  const [planMinute, setPlanMinute] = useState("30");
  const [planAmPm, setPlanAmPm] = useState("PM");
  const [planLocation, setPlanLocation] = useState<string>("");
  const [planShow, setPlanShow] = useState("All Friends");
  const [showPlanTemplatePicker, setShowPlanTemplatePicker] = useState(false);
  const [showPlanLocationPicker, setShowPlanLocationPicker] = useState(false);
  const [showPlanShowPicker, setShowPlanShowPicker] = useState(false);
  const [showPlanAmPmPicker, setShowPlanAmPmPicker] = useState(false);

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

  // Match templates page height calculation
  const availableHeight = windowHeight - 90;
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
    (s) => !s._completed && !s._editing && !s._pending && !s._savedHome,
  );
  const completedSessions = activeSessions.filter((s) => s._completed);
  const todayLocal = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
  const isToday = selectedDateStr === todayLocal;
  const canAddSession =
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
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
          t.exercises?.some((te: any) => te.name === ex.name),
        );
        const templateEx = template?.exercises?.find(
          (te: any) => te.name === ex.name,
        );
        const repRange = templateEx?.repRange || "8-12";
        const [minRep, maxRep] = repRange.split("-").map(Number);
        const validSets = (ex.sets || []).filter((s: any) => {
          const r = Number(s.reps);
          return r >= (minRep || 1) && r <= (maxRep || 999);
        });
        return (
          total +
          validSets.reduce(
            (st: number, s: any) => st + Number(s.weight) * Number(s.reps),
            0,
          )
        );
      }, 0);

    const dayVolume = workoutsOnDay.reduce(
      (sum: number, w: any) => sum + getVolume(w),
      0,
    );

    // Find previous workout(s) with same name for comparison
    const prevWorkouts = workoutsOnDay.flatMap((w: any) => {
      const same = history
        .filter((h) => h.name === w.name && h.date < dateStr)
        .sort((a, b) => b.date.localeCompare(a.date));
      return same.length > 0 ? [same[0]] : [];
    });

    let prevVolume: number;
    if (prevWorkouts.length > 0) {
      prevVolume =
        prevWorkouts.reduce((sum: number, w: any) => sum + getVolume(w), 0) /
        prevWorkouts.length;
    } else {
      // No matching previous — compare against global average
      const allVolumes = history
        .filter((h) => h.date !== dateStr)
        .map((h) => getVolume(h))
        .filter((v) => v > 0);
      prevVolume =
        allVolumes.length > 0
          ? allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length
          : dayVolume;
    }

    if (prevVolume === 0) return "#1e3a5f";
    const pct = (dayVolume - prevVolume) / prevVolume;

    // 4 levels
    if (pct >= 0.1) return "#2563eb"; // much better  - bright blue
    if (pct >= 0) return "#1d4ed8"; // better        - medium blue
    if (pct >= -0.1) return "#1e3a5f"; // worse         - dark blue
    return "#162d4a"; // much worse    - very dark blue
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
      const found = heatmapDays.find((d) => d.date === dateStr);
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              {selectedDateStr !== todayLocal && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(new Date());
                  }}
                  style={{
                    marginLeft: 10,
                    padding: "4px 12px",
                    borderRadius: 8,
                    border: `1px solid ${COLORS.accent}`,
                    background: "transparent",
                    color: COLORS.accent,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    verticalAlign: "middle",
                  }}
                >
                  Today
                </button>
              )}
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
          </div>
          {showCalendar && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 6,
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
          overflow: isMobile ? "visible" : "visible",
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
              {(() => {
                const savedHomeSession = activeSessions.find(
                  (s) => s._savedHome && !s._completed,
                );
                if (savedHomeSession && isToday) {
                  return (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
                        {selectedTemplate.name}
                      </h2>
                      <button
                        onClick={() =>
                          onContinueWorkout(
                            activeSessions.indexOf(savedHomeSession),
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
                    </div>
                  );
                }
                return null;
              })()}
              {!selectedCompleted &&
                selectedTemplate.name !== "Rest" &&
                !activeSessions.some((s) => s._savedHome && !s._completed) && (
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
                      !activeSessions.filter(
                        (s) => !s._completed && !s._editing,
                      ).length ? (
                        <h2
                          onClick={() =>
                            setShowWorkoutPicker(!showWorkoutPicker)
                          }
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
                        <h2
                          style={{ fontSize: 20, fontWeight: 600, margin: 0 }}
                        >
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
                                  color: isCurrent
                                    ? COLORS.accent
                                    : COLORS.text,
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
                    ) : !selectedCompleted &&
                      selectedTemplate.name !== "Rest" &&
                      !activeSessions.some(
                        (s) => s._savedHome && !s._completed,
                      ) ? (
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() =>
                            onStartWorkout(
                              selectedTemplate,
                              undefined,
                              selectedDateStr,
                            )
                          }
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
                      <h2
                        onClick={() => setShowWorkoutPicker(!showWorkoutPicker)}
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
                            const isCurrent = t.id === effectiveTemplateId;
                            return (
                              <button
                                key={t.id}
                                onClick={() => {
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
                                  color: isCurrent
                                    ? COLORS.accent
                                    : COLORS.text,
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
                      {activeSessions
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
                                        const isCurrent = t.id === s.templateId;
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
                                        const isCurrent = t.id === s.templateId;
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
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemovePendingSession(s.id);
                                    }}
                                    style={{
                                      padding: "10px 16px",
                                      borderRadius: 8,
                                      border: `1px solid ${COLORS.red}`,
                                      background: "transparent",
                                      color: COLORS.red,
                                      cursor: "pointer",
                                      fontWeight: 600,
                                      fontSize: 15,
                                    }}
                                  >
                                    Delete
                                  </button>
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
                        justifyContent: "flex-start",
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
                    {canAddSession && (
                      <button
                        onClick={() =>
                          onAddNewSession(selectedTemplate, selectedDateStr)
                        }
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
            {/* My Sessions */}
            <div style={{ ...cardStyle, flexShrink: 0, padding: "16px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>
                My Sessions
              </h3>
              {(() => {
                const plannedSessions: any[] = []; // replace with real data later
                if (plannedSessions.length === 0) {
                  return (
                    <p style={{ color: COLORS.dim, fontSize: 13, margin: 0 }}>
                      No upcoming sessions planned.
                    </p>
                  );
                }
                return plannedSessions.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom:
                        i < plannedSessions.length - 1
                          ? `1px solid ${COLORS.border}`
                          : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {s.template}
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.dim }}>
                        {s.date} · {s.time}
                      </div>
                    </div>
                    {s.location && (
                      <div style={{ fontSize: 12, color: COLORS.dim }}>
                        {s.location}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>

            {/* Plan a Group Session */}
            <div
              style={{
                ...cardStyle,
                flexShrink: 0,
                padding: "14px 16px",
                marginTop: 0,
                position: "relative",
              }}
              onClick={() => {
                showPlanTemplatePicker && setShowPlanTemplatePicker(false);
                showPlanLocationPicker && setShowPlanLocationPicker(false);
                showPlanShowPicker && setShowPlanShowPicker(false);
                showPlanAmPmPicker && setShowPlanAmPmPicker(false);
                showPlanCalendar && setShowPlanCalendar(false);
              }}
            >
              {/* Header row: title + date trigger + Plan Session button */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    position: "relative",
                  }}
                >
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                    Plan a Group Session
                  </h3>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPlanCalendar(!showPlanCalendar);
                      setShowPlanTemplatePicker(false);
                      setShowPlanLocationPicker(false);
                      setShowPlanShowPicker(false);
                      setShowPlanAmPmPicker(false);
                    }}
                    style={{
                      fontSize: 14,
                      color: COLORS.accent,
                      fontWeight: 600,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    {(() => {
                      const day = planDate.getDate();
                      const suffix =
                        day % 10 === 1 && day !== 11
                          ? "st"
                          : day % 10 === 2 && day !== 12
                            ? "nd"
                            : day % 10 === 3 && day !== 13
                              ? "rd"
                              : "th";
                      const weekday = planDate.toLocaleDateString("en-US", {
                        weekday: "short",
                      });
                      const month = planDate.toLocaleDateString("en-US", {
                        month: "short",
                      });
                      return `${weekday}, ${month} ${day}${suffix}, ${planDate.getFullYear()}`;
                    })()}{" "}
                    <span style={{ fontSize: 11, color: COLORS.dim }}>▼</span>
                  </span>
                  {/* Calendar — opens to the right of the date text */}
                  {showPlanCalendar &&
                    (() => {
                      const calYear = planDate.getFullYear();
                      const calMonth = planDate.getMonth();
                      const monthStart = new Date(calYear, calMonth, 1);
                      const gridStart = new Date(monthStart);
                      gridStart.setDate(
                        monthStart.getDate() - ((monthStart.getDay() + 6) % 7),
                      );
                      const monthName = planDate.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      });
                      const calDays: Date[] = [];
                      const cur = new Date(gridStart);
                      for (let i = 0; i < 42; i++) {
                        calDays.push(new Date(cur));
                        cur.setDate(cur.getDate() + 1);
                      }
                      const toStr = (d: Date) =>
                        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      const planStr = toStr(planDate);
                      return (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: "100%",
                            marginLeft: 8,
                            background: COLORS.card,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: 12,
                            padding: 12,
                            zIndex: 1000,
                            width: 260,
                            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <button
                              onClick={() => {
                                const d = new Date(planDate);
                                d.setMonth(d.getMonth() - 1);
                                setPlanDate(d);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: COLORS.accent,
                                cursor: "pointer",
                                fontSize: 16,
                                padding: "2px 6px",
                              }}
                            >
                              ◀
                            </button>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>
                              {monthName}
                            </span>
                            <button
                              onClick={() => {
                                const d = new Date(planDate);
                                d.setMonth(d.getMonth() + 1);
                                setPlanDate(d);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: COLORS.accent,
                                cursor: "pointer",
                                fontSize: 16,
                                padding: "2px 6px",
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
                                    fontSize: 11,
                                    color: COLORS.dim,
                                    fontWeight: 600,
                                    padding: 2,
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
                            {calDays.map((d, i) => {
                              const ds = toStr(d);
                              const isSel = ds === planStr;
                              const isCurMon = d.getMonth() === calMonth;
                              const isTdy = ds === todayLocal;
                              return (
                                <button
                                  key={i}
                                  onClick={() => {
                                    const nd = new Date(d);
                                    nd.setHours(12);
                                    setPlanDate(nd);
                                    setShowPlanCalendar(false);
                                  }}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 6,
                                    border: isTdy
                                      ? `2px solid ${COLORS.accent}`
                                      : "none",
                                    background: isSel
                                      ? COLORS.accent
                                      : "transparent",
                                    color: isSel
                                      ? COLORS.text
                                      : !isCurMon
                                        ? COLORS.border
                                        : COLORS.text,
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontWeight: isSel ? 700 : 400,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: "0 auto",
                                  }}
                                >
                                  {d.getDate()}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => {
                              setPlanDate(new Date());
                              setShowPlanCalendar(false);
                            }}
                            style={{
                              width: "100%",
                              marginTop: 8,
                              padding: "6px",
                              borderRadius: 8,
                              border: `1px solid ${COLORS.border}`,
                              background: COLORS.inner,
                              color: COLORS.accent,
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            Today
                          </button>
                        </div>
                      );
                    })()}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: COLORS.accent,
                    color: COLORS.text,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  Plan Session
                </button>
              </div>

              {/* Form fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Template */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 14,
                      color: COLORS.dim,
                      width: 90,
                      flexShrink: 0,
                    }}
                  >
                    Template:
                  </span>
                  <div style={{ flex: 1, position: "relative" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPlanTemplatePicker(!showPlanTemplatePicker);
                        setShowPlanLocationPicker(false);
                        setShowPlanShowPicker(false);
                        setShowPlanAmPmPicker(false);
                        setShowPlanCalendar(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "5px 10px",
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.inner,
                        color: COLORS.text,
                        fontSize: 13,
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>
                        {templates.find((t) => t.id === planTemplateId)?.name ||
                          templates[0]?.name ||
                          "Select template"}
                      </span>
                      <span style={{ color: COLORS.dim, fontSize: 11 }}>▼</span>
                    </button>
                    {showPlanTemplatePicker && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          bottom: "100%",
                          left: 0,
                          right: 0,
                          marginBottom: 4,
                          background: COLORS.card,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 10,
                          padding: 6,
                          zIndex: 1000,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          maxHeight: 200,
                          overflowY: "auto",
                          boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
                        }}
                      >
                        {templates.map((t) => {
                          const isCur =
                            (planTemplateId || templates[0]?.id) === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                setPlanTemplateId(t.id);
                                setShowPlanTemplatePicker(false);
                              }}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 7,
                                border: isCur
                                  ? `2px solid ${COLORS.accent}`
                                  : `1px solid ${COLORS.border}`,
                                background: isCur
                                  ? COLORS.accent + "22"
                                  : COLORS.inner,
                                color: isCur ? COLORS.accent : COLORS.text,
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: isCur ? 600 : 400,
                                textAlign: "left",
                              }}
                            >
                              {t.name}
                              {isCur && " ✓"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Start Time */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 14,
                      color: COLORS.dim,
                      width: 90,
                      flexShrink: 0,
                    }}
                  >
                    Start Time:
                  </span>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={planHour}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setPlanHour(v);
                      }}
                      style={{
                        width: 52,
                        padding: "5px 8px",
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.inner,
                        color: COLORS.text,
                        fontSize: 13,
                        textAlign: "center",
                      }}
                    />
                    <span style={{ color: COLORS.dim, fontSize: 14 }}>:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={planMinute}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setPlanMinute(v.slice(0, 2));
                      }}
                      style={{
                        width: 52,
                        padding: "5px 8px",
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.inner,
                        color: COLORS.text,
                        fontSize: 13,
                        textAlign: "center",
                      }}
                    />
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPlanAmPmPicker(!showPlanAmPmPicker);
                          setShowPlanTemplatePicker(false);
                          setShowPlanLocationPicker(false);
                          setShowPlanShowPicker(false);
                          setShowPlanCalendar(false);
                        }}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 8,
                          border: `1px solid ${COLORS.border}`,
                          background: COLORS.inner,
                          color: COLORS.text,
                          fontSize: 13,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {planAmPm}{" "}
                        <span style={{ color: COLORS.dim, fontSize: 11 }}>
                          ▼
                        </span>
                      </button>
                      {showPlanAmPmPicker && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: "100%",
                            marginLeft: 4,
                            background: COLORS.bg,
                            border: "none",
                            borderRadius: 10,
                            padding: 6,
                            zIndex: 1000,
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                          }}
                        >
                          {["AM", "PM"]
                            .filter((v) => v !== planAmPm)
                            .map((v) => (
                              <button
                                key={v}
                                onClick={() => {
                                  setPlanAmPm(v);
                                  setShowPlanAmPmPicker(false);
                                }}
                                style={{
                                  padding: "6px 16px",
                                  borderRadius: 7,
                                  border:
                                    planAmPm === v
                                      ? `2px solid ${COLORS.accent}`
                                      : `1px solid ${COLORS.border}`,
                                  background:
                                    planAmPm === v
                                      ? COLORS.accent + "22"
                                      : COLORS.inner,
                                  color:
                                    planAmPm === v
                                      ? COLORS.accent
                                      : COLORS.text,
                                  cursor: "pointer",
                                  fontSize: 13,
                                  fontWeight: planAmPm === v ? 600 : 400,
                                }}
                              >
                                {v}
                                {planAmPm === v && " ✓"}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 14,
                      color: COLORS.dim,
                      width: 90,
                      flexShrink: 0,
                    }}
                  >
                    Location:
                  </span>
                  <div style={{ flex: 1, position: "relative" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPlanLocationPicker(!showPlanLocationPicker);
                        setShowPlanTemplatePicker(false);
                        setShowPlanShowPicker(false);
                        setShowPlanAmPmPicker(false);
                        setShowPlanCalendar(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "5px 10px",
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.inner,
                        color: planLocation ? COLORS.text : COLORS.dim,
                        fontSize: 13,
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          maskImage:
                            "linear-gradient(to right, black calc(100% - 20px), transparent 100%)",
                          WebkitMaskImage:
                            "linear-gradient(to right, black calc(100% - 20px), transparent 100%)",
                        }}
                      >
                        {planLocation || "Select gym"}
                      </span>
                      <span
                        style={{
                          color: COLORS.dim,
                          fontSize: 11,
                          flexShrink: 0,
                        }}
                      >
                        ▼
                      </span>
                    </button>
                    {showPlanLocationPicker && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          bottom: "100%",
                          left: 0,
                          right: 0,
                          marginBottom: 4,
                          background: COLORS.card,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 10,
                          padding: 6,
                          zIndex: 1000,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          maxHeight: 200,
                          overflowY: "auto",
                          boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
                        }}
                      >
                        {(gyms.filter((g) => g.trim()).length > 0
                          ? gyms.filter((g) => g.trim())
                          : ["No gyms saved — add them in Profile"]
                        ).map((g, i) => {
                          const parts = g.split(" — ");
                          const gymName = parts[0];
                          const address = parts.slice(1).join(" — ");
                          const isSelectable =
                            gyms.filter((g) => g.trim()).length > 0;
                          const isCur = planLocation === g;
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (isSelectable) {
                                  setPlanLocation(g);
                                  setShowPlanLocationPicker(false);
                                }
                              }}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 7,
                                border: isCur
                                  ? `2px solid ${COLORS.accent}`
                                  : `1px solid ${COLORS.border}`,
                                background: isCur
                                  ? COLORS.accent + "22"
                                  : COLORS.inner,
                                color: isCur
                                  ? COLORS.accent
                                  : isSelectable
                                    ? COLORS.text
                                    : COLORS.dim,
                                cursor: isSelectable ? "pointer" : "default",
                                fontSize: 13,
                                fontWeight: isCur ? 600 : 400,
                                textAlign: "left",
                              }}
                            >
                              <div
                                style={{
                                  overflow: "hidden",
                                  whiteSpace: "nowrap",
                                  maskImage:
                                    "linear-gradient(to right, black calc(100% - 16px), transparent 100%)",
                                  WebkitMaskImage:
                                    "linear-gradient(to right, black calc(100% - 16px), transparent 100%)",
                                }}
                              >
                                {gymName}
                                {isCur && " ✓"}
                              </div>
                              {address && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: COLORS.dim,
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    maskImage:
                                      "linear-gradient(to right, black calc(100% - 16px), transparent 100%)",
                                    WebkitMaskImage:
                                      "linear-gradient(to right, black calc(100% - 16px), transparent 100%)",
                                  }}
                                >
                                  {address}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Show */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 14,
                      color: COLORS.dim,
                      width: 90,
                      flexShrink: 0,
                    }}
                  >
                    Show:
                  </span>
                  <div style={{ flex: 1, position: "relative" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPlanShowPicker(!showPlanShowPicker);
                        setShowPlanTemplatePicker(false);
                        setShowPlanLocationPicker(false);
                        setShowPlanAmPmPicker(false);
                        setShowPlanCalendar(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "5px 10px",
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.inner,
                        color: COLORS.text,
                        fontSize: 13,
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{planShow}</span>
                      <span style={{ color: COLORS.dim, fontSize: 11 }}>▼</span>
                    </button>
                    {showPlanShowPicker && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          bottom: "100%",
                          left: 0,
                          right: 0,
                          marginBottom: 4,
                          background: COLORS.card,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 10,
                          padding: 6,
                          zIndex: 1000,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
                        }}
                      >
                        {["All Friends", "Nobody"].map((v) => (
                          <button
                            key={v}
                            onClick={() => {
                              setPlanShow(v);
                              setShowPlanShowPicker(false);
                            }}
                            style={{
                              padding: "7px 10px",
                              borderRadius: 7,
                              border:
                                planShow === v
                                  ? `2px solid ${COLORS.accent}`
                                  : `1px solid ${COLORS.border}`,
                              background:
                                planShow === v
                                  ? COLORS.accent + "22"
                                  : COLORS.inner,
                              color:
                                planShow === v ? COLORS.accent : COLORS.text,
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: planShow === v ? 600 : 400,
                              textAlign: "left",
                            }}
                          >
                            {v}
                            {planShow === v && " ✓"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Invite */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 14,
                      color: COLORS.dim,
                      width: 90,
                      flexShrink: 0,
                    }}
                  >
                    Invite:
                  </span>
                  <div style={{ flex: 1 }}>
                    <button
                      style={{
                        width: "100%",
                        padding: "5px 10px",
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.inner,
                        color: COLORS.dim,
                        fontSize: 13,
                        cursor: "default",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>— select friend —</span>
                      <span style={{ color: COLORS.dim, fontSize: 11 }}>▼</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== RIGHT COLUMN ===== */}
        {(!isMobile || mobileTab === "weekly") && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 530,
              overflow: isMobile ? "visible" : "hidden",
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
                      padding: "3px 16px",
                      borderRadius: 8,
                      background: isSelected
                        ? COLORS.accent + "11"
                        : "transparent",
                      border: isSelected
                        ? `1px solid ${COLORS.accent}33`
                        : "1px solid transparent",
                      marginBottom: 1,
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
                      {(() => {
                        const overrideId = dayOverrides[date];
                        const dayOfWeek =
                          DAYS[(new Date(date + "T12:00:00").getDay() + 6) % 7];
                        const scheduledId = overrideId || schedule[dayOfWeek];
                        const scheduledTemplate = templates.find(
                          (t) => t.id === scheduledId,
                        );
                        const workoutsOnDay = history.filter(
                          (w) => w.date === date,
                        );
                        const workoutDoneToday = workoutsOnDay.length > 0;
                        const workoutName =
                          workoutsOnDay.length > 0
                            ? workoutsOnDay[workoutsOnDay.length - 1].name
                            : scheduledTemplate?.name;
                        if (!workoutName || workoutName === "Rest") return null;
                        return (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              cursor: "default",
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
                                border: `2px solid ${workoutDoneToday ? COLORS.green : COLORS.border}`,
                                background: workoutDoneToday
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
                              {workoutDoneToday && "✓"}
                            </div>
                            <span
                              style={{
                                fontSize: 14,
                                color: workoutDoneToday
                                  ? COLORS.text
                                  : COLORS.dim,
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                                minWidth: 0,
                                textOverflow: "ellipsis",
                              }}
                            >
                              {workoutName}
                            </span>
                          </div>
                        );
                      })()}
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
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Schedule - bottom of right column */}
            <div
              style={{
                ...cardStyle,
                flexShrink: 0,
                padding: "20px 16px",
                marginTop: 12,
              }}
            >
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
