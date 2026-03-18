"use client";
import React, { useState, useEffect, useMemo } from "react";
import { COLORS, SET_TYPES } from "../constants";
import { WorkoutPopup } from "./TemplatesPage";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface SessionPageProps {
  session: any;
  setSession: (session: any) => void;
  onFinish: (session: any) => void;
  onSaveAndReturn: () => void;
  onCancel: () => void;
  onDeleteWorkout?: (id: string) => void;
  history: any[];
  exercises?: any[];
  setExercises?: (e: any[]) => void;
  workoutGroups?: any[];
}

export default function SessionPage({
  session,
  setSession,
  onFinish,
  onSaveAndReturn,
  onCancel,
  onDeleteWorkout,
  history,
  exercises: exercisesProp = [],
  setExercises,
  workoutGroups: workoutGroupsProp = [],
}: SessionPageProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(session.currentExerciseIndex ?? 0);
  const [currentSetIndex, setCurrentSetIndex] = useState(session.currentSetIndex ?? 0);
  const [windowWidth, setWindowWidth] = useState(1200);
  const [windowHeight, setWindowHeight] = useState(800);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [touchedSets, setTouchedSets] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      (session.exercises || []).forEach((ex: any, ei: number) => {
        (ex.sets || []).forEach((s: any, si: number) => {
          if (s._touched) {
            initial[`${ei}-${si}`] = true;
          }
        });
      });
      return initial;
    },
  );
const [mobileBottomTab, setMobileBottomTab] = useState<"previous" | "alltime">("previous");
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [dropdownPos, setDropdownPos] = useState<{top: number; left: number; width: number} | null>(null);
  const addBtnRef = React.useRef<HTMLButtonElement>(null);
  const lastExerciseRef = React.useRef<HTMLDivElement>(null);
  const [dupError, setDupError] = useState<string | null>(null);
  const [showNewExercisePopup, setShowNewExercisePopup] = useState(false);
  
  const [showMobileAddModal, setShowMobileAddModal] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const dragIdxRef = React.useRef<number | null>(null);
  const pillRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const sessionRef = React.useRef<any>(session);
  const desktopDragIdxRef = React.useRef<number | null>(null);
  const desktopPillRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [desktopDragIdx, setDesktopDragIdx] = useState<number | null>(null);
  const [desktopDragOverIdx, setDesktopDragOverIdx] = useState<number | null>(null);
  // variant selection per exercise index
  const [selectedVariants, setSelectedVariants] = useState<Record<number, string>>({});
  const [indexData, setIndexData] = useState<any[]>([]);
  const [showVDrop, setShowVDrop] = useState(false);
  

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => { sessionRef.current = session; }, [session]);

  const isMobile = windowWidth < 768;

  // ─── Variant helpers ───
  const getExerciseDef = (name: string) => {
    const exercises: any[] = session._exercises || [];
    // First try exact name match
    const byName = exercises.find((e: any) => e.name === name);
    if (byName) return byName;
    // Fall back: find the session exercise by display name, then look up by exerciseId
    const sessionEx = (session.exercises || []).find((e: any) => e.name === name);
    if (sessionEx?.exerciseId) {
      return exercises.find((e: any) => e.id === sessionEx.exerciseId);
    }
    return null;
  };

  const getActiveVariant = (exIdx: number) => {
    const sessionEx = session.exercises?.[exIdx];
    const def = getExerciseDef(sessionEx?.name);
    if (!def?.variants?.length) return null;
    const selectedId = selectedVariants[exIdx];
    return def.variants.find((v: any) => v.id === selectedId)
      ?? def.variants.find((v: any) => v.isDefault)
      ?? def.variants[0];
  };

  // Returns the base exercise name (strips any variant prefix)
  const getBaseName = (exIdx: number) => {
    const sessionEx = session.exercises?.[exIdx];
    const def = getExerciseDef(sessionEx?.name);
    return def?.name ?? sessionEx?.name ?? "";
  };
  const safeExIdx = Math.min(
    currentExerciseIndex,
    (session.exercises?.length ?? 1) - 1,
  );
  const exercise = session.exercises?.[safeExIdx] ?? {
    name: "",
    sets: [{ weight: 0, reps: 0, type: "normal" }],
  };
  const exerciseName = useMemo(() => exercise.name, [safeExIdx, session.exercises?.length]);
  const currentSet = exercise.sets?.[currentSetIndex] ?? {
    weight: 0,
    reps: 0,
    type: "normal",
  };
  const totalSets = exercise.sets.length;

  const touchedKey = `${currentExerciseIndex}-${currentSetIndex}`;
  const isTouched = !!touchedSets[touchedKey];
  const activeVariant = getActiveVariant(safeExIdx);
  const exerciseDef = getExerciseDef(exercise.name);
  const variantList: any[] = exerciseDef?.variants ?? [];

  useEffect(() => {
    setCurrentSetIndex(0);
    setShowVDrop(false);
    if (session.currentExerciseIndex !== currentExerciseIndex) {
      setSession({ ...session, currentExerciseIndex });
    }
  }, [currentExerciseIndex]);

  // ─── Fetch exercise index from Firestore ───
  useEffect(() => {
    if (!exercise.name) return;
    const load = async () => {
      try {
        const { getAuth } = await import("firebase/auth");
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../firebase");
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;
        const sessionEx = (session.exercises || []).find((e: any) => e.name === exercise.name);
        const exDefByName = (session._exercises || []).find((e: any) => e.name === exercise.name);
        const exDefById = sessionEx?.exerciseId
          ? (session._exercises || []).find((e: any) => e.id === sessionEx.exerciseId)
          : null;
        const exDef = exDefByName ?? exDefById;
        const exId = sessionEx?.exerciseId ?? exDef?.id ?? exercise.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const snap = await getDoc(doc(db, "users", uid, "exerciseIndex", exId));
        if (snap.exists()) {
          setIndexData(snap.data().points || []);
        } else {
          setIndexData([]);
        }
      } catch (err) {
        console.error("Failed to load exercise index:", err);
        setIndexData([]);
      }
    };
    load();
  }, [exerciseName]);

  // ─── Previous workout data ───
  const getPreviousWorkout = (exerciseName: string, variantName?: string) => {
    const sorted = [...history].sort((a: any, b: any) =>
      b.date.localeCompare(a.date),
    );
    for (const workout of sorted) {
      const found = workout.exercises.find((e: any) => e.name === exerciseName);
      if (found) {
        const sets = found.sets.filter((s: any) => s.type !== "warmup");
        const hasAnyVariantTags = sets.some((s: any) => s.variantName);
        const variantSets = variantName && variantName !== "Standard" && hasAnyVariantTags
          ? sets.filter((s: any) => s.variantName === variantName)
          : sets;
        if (variantSets.length === 0) continue;
        return { date: workout.date, sets: variantSets };
      }
    }
    return null;
  };

  const activeVariantName = activeVariant?.name;
  useEffect(() => {
    setTouchedSets(prev => {
      const next = { ...prev };
      exercise.sets.forEach((s: any, si: number) => {
        if (!s._touched) delete next[`${safeExIdx}-${si}`];
      });
      return next;
    });
    // Tag all existing sets with the new variantName
    const vName = activeVariant?.name ?? null;
    const updatedExercises = session.exercises.map((ex: any, ei: number) =>
      ei !== safeExIdx ? ex : {
        ...ex,
        variantName: vName,
        sets: ex.sets.map((s: any) => ({ ...s, variantName: vName })),
      }
    );
    setSession({ ...session, exercises: updatedExercises });
  }, [activeVariantName]);
  const previousWorkout = useMemo(() => {
    if (indexData.length === 0) return null;
    const isMultiVariant = variantList.length > 1;
    const sorted = [...indexData].sort((a: any, b: any) => b.date.localeCompare(a.date));
    for (const point of sorted) {
      if (isMultiVariant) {
        // New structure: point.variants is a map of variantName -> { sets }
        if (point.variants) {
          const vName = activeVariantName ?? variantList.find((v: any) => v.isDefault)?.name ?? variantList[0]?.name;
          const variantData = point.variants[vName];
          if (!variantData?.sets?.length) continue;
          return { date: point.date, sets: variantData.sets };
        }
        // Legacy fallback: old variantWeights structure
        if (point.variantWeights && activeVariantName && activeVariantName in point.variantWeights) {
          const workout = history.find((w: any) => w.date === point.date);
          if (!workout) continue;
          const baseName = getBaseName(safeExIdx);
          const found = workout.exercises.find((e: any) => e.name === baseName || e.name === exerciseName);
          if (!found) continue;
          const strictSets = found.sets.filter((s: any) => s.type !== "warmup" && s.variantName === activeVariantName);
          const looseSets = found.sets.filter((s: any) => s.type !== "warmup");
          const sets = strictSets.length > 0 ? strictSets : looseSets;
          if (sets.length === 0) continue;
          return { date: point.date, sets };
        }
        continue;
      } else {
        // Standard: flat sets on the point
        if (!point.sets?.length) continue;
        return { date: point.date, sets: point.sets };
      }
    }
    return null;
  }, [exerciseName, activeVariantName, indexData, history, selectedVariants]);

  // ─── Previous top set ───
  const previousTopSet = useMemo(() => {
    if (!previousWorkout) return null;
    let best = { weight: 0, reps: 0 };
    for (const s of previousWorkout.sets) {
      if (
        s.weight > best.weight ||
        (s.weight === best.weight && s.reps > best.reps)
      ) {
        best = { weight: s.weight, reps: s.reps };
      }
    }
    return { ...best, date: previousWorkout.date };
  }, [previousWorkout]);

  

  // ─── Chart data — one series per variant ───
  const VARIANT_CHART_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#a29bfe", "#fd79a8", "#00cec9", "#e17055",
  ];

  const { chartData, chartVariants } = useMemo(() => {
    const def = getExerciseDef(exercise.name);
    const variants: any[] = def?.variants ?? [];
    const isMultiVariant = variants.length > 1;

    if (!isMultiVariant) {
      // Standard: flat maxWeight per point
      const points = indexData.map((p: any) => {
        const label = new Date(p.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { date: p.date, label, Standard: p.maxWeight };
      });
      return { chartData: points, chartVariants: [{ name: "Standard", color: VARIANT_CHART_COLORS[0] }] };
    }

    // Multivariant: build one value per variant per date
    const dateMap: Record<string, any> = {};
    for (const p of indexData) {
      const label = new Date(p.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!dateMap[p.date]) dateMap[p.date] = { date: p.date, label };
      if (p.variants) {
        // New structure
        for (const [vName, vData] of Object.entries(p.variants as Record<string, any>)) {
          const sets = vData?.sets ?? [];
          const max = sets.length > 0 ? Math.max(...sets.map((s: any) => s.weight ?? 0)) : 0;
          if (max > 0) dateMap[p.date][vName] = max;
        }
      } else if (p.variantWeights) {
        // Legacy fallback
        for (const [vName, vMax] of Object.entries(p.variantWeights)) {
          dateMap[p.date][vName] = vMax;
        }
      }
    }
    return {
      chartData: Object.values(dateMap),
      chartVariants: variants.map((v: any, i: number) => ({ name: v.name, color: VARIANT_CHART_COLORS[i % VARIANT_CHART_COLORS.length] })),
    };
  }, [indexData, exercise.name]);

  // ─── Set operations ───
  useEffect(() => {
    if (session.currentSetIndex !== currentSetIndex) {
      setSession({ ...session, currentSetIndex });
    }
  }, [currentSetIndex]);

  const markTouched = (exIdx: number, setIdx: number) => {
    const key = `${exIdx}-${setIdx}`;
    if (!touchedSets[key]) {
      setTouchedSets((prev) => ({ ...prev, [key]: true }));
      const prevWeight = previousWorkout?.sets[setIdx]?.weight ?? 0;
      const prevReps = previousWorkout?.sets[setIdx]?.reps ?? 0;
      const updatedExercises = session.exercises.map((ex: any, ei: number) =>
        ei !== exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s: any, si: number) =>
                si !== setIdx ? s : {
                  ...s,
                  _touched: true,
                  weight: s.weight > 0 ? s.weight : prevWeight,
                  reps: s.reps > 0 ? s.reps : prevReps,
                },
              ),
            },
      );
      setSession({ ...session, exercises: updatedExercises });
    }
  };

  const updateSet = (setIndex: number, field: string, value: any) => {
    const key = `${currentExerciseIndex}-${setIndex}`;
    setTouchedSets((prev) => ({ ...prev, [key]: true }));
    const variantName = activeVariant?.name ?? null;
    const updatedExercises = session.exercises.map((ex: any, ei: number) =>
      ei !== currentExerciseIndex
        ? ex
        : {
            ...ex,
            variantName,
            sets: ex.sets.map((s: any, i: number) =>
              i === setIndex ? { ...s, [field]: value, _touched: true, variantName } : s,
            ),
          },
    );
    setSession({ ...session, exercises: updatedExercises });
  };

  const adjustWeight = (delta: number) => {
    const current = currentSet?.weight || 0;
    const newVal = Math.max(0, Math.round((current + delta) / 2.5) * 2.5);
    updateSet(currentSetIndex, "weight", newVal);
  };

  const adjustReps = (delta: number) => {
    const current = currentSet?.reps || 0;
    const newVal = Math.max(0, Math.round(current + delta));
    updateSet(currentSetIndex, "reps", newVal);
  };

  const addSet = () => {
    const updated = { ...session };
    updated.exercises = [...updated.exercises];
    const lastSet = exercise.sets[exercise.sets.length - 1] || {
      weight: 0,
      reps: 0,
      type: "normal",
    };
    updated.exercises[currentExerciseIndex] = {
      ...updated.exercises[currentExerciseIndex],
      sets: [
        ...exercise.sets,
        { weight: lastSet.weight, reps: lastSet.reps, type: "normal", variantName: activeVariant?.name ?? null },
      ],
    };
    setSession(updated);
  };

  const removeCurrentSet = () => {
    if (exercise.sets.length <= 1) return;
    const updated = { ...session };
    updated.exercises = [...updated.exercises];
    updated.exercises[currentExerciseIndex] = {
      ...updated.exercises[currentExerciseIndex],
      sets: exercise.sets.filter((_: any, i: number) => i !== currentSetIndex),
    };
    setSession(updated);
    if (currentSetIndex >= exercise.sets.length - 1) {
      setCurrentSetIndex(Math.max(0, currentSetIndex - 1));
    }
  };

  const removeExercise = (index: number) => {
    if (session.exercises.length <= 1) return;
    const updated = { ...session };
    updated.exercises = updated.exercises.filter(
      (_: any, i: number) => i !== index,
    );
    setSession(updated);
    if (currentExerciseIndex >= updated.exercises.length) {
      setCurrentExerciseIndex(updated.exercises.length - 1);
    } else if (index < currentExerciseIndex) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    }
  };

  const formatPrevDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear().toString().slice(2);
    return `${month}/${day}/${year}`;
  };

  // ─── Styles ───
  const cardStyle = {
    background: COLORS.card,
    borderRadius: 12,
    padding: isMobile ? 12 : 14,
    border: `1px solid ${COLORS.border}`,
  };

  const btnStyle = (active: boolean, color?: string) => ({
    padding: isMobile ? "8px 12px" : "8px 16px",
    borderRadius: 8,
    border: active ? "none" : `1px solid ${COLORS.border}`,
    background: active ? color || COLORS.accent : "transparent",
    color: active ? "#fff" : COLORS.dim,
    cursor: "pointer",
    fontWeight: 600 as const,
    fontSize: isMobile ? 12 : 13,
  });

  const arrowBtn: any = {
    background: COLORS.inner,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    color: COLORS.text,
    cursor: "pointer",
    fontSize: 12,
    width: "100%",
    padding: "3px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const contentHeight = windowHeight - 160;

  // ─── Previous / All Time content (shared between mobile and desktop) ───
  const renderPreviousContent = () =>
    previousWorkout ? (
      <>
        <div style={{ fontSize: 13, color: COLORS.dim, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, color: COLORS.text }}>Previous</span>{" "}
          ({formatPrevDate(previousWorkout.date)})
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
          {activeVariant && activeVariant.name !== "Standard"
            ? `${activeVariant.name} ${getBaseName(safeExIdx) || exercise.name}`
            : getBaseName(safeExIdx) || exercise.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {previousWorkout.sets.map((s: any, i: number) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                padding: "6px 10px",
                background: COLORS.card,
                borderRadius: 6,
                border: `1px solid ${COLORS.border}`,
                fontSize: 13,
              }}
            >
              <span style={{ textAlign: "center" }}>
                Weight: <span style={{ fontWeight: 600 }}>{s.weight}</span> lbs
              </span>
              <span style={{ textAlign: "center" }}>
                Reps: <span style={{ fontWeight: 600 }}>{s.reps}</span>
              </span>
            </div>
          ))}
        </div>
      </>
    ) : (
      <div
        style={{
          color: COLORS.dim,
          fontSize: 13,
          textAlign: "center",
          padding: "16px 0",
        }}
      >
        No previous data for {activeVariant && activeVariant.name !== "Standard" ? `${activeVariant.name} ${getBaseName(safeExIdx) || exercise.name}` : getBaseName(safeExIdx) || exercise.name}
      </div>
    );

  const renderChartContent = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: COLORS.dim }}>
          All Time — {getBaseName(safeExIdx) || exercise.name}
        </h3>
        {chartVariants.length > 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {chartVariants.map(v => (
              <div key={v.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: v.color }} />
                <span style={{ color: COLORS.dim }}>{v.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={isMobile ? 160 : 140}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="label" tick={{ fill: COLORS.dim, fontSize: 10 }} stroke={COLORS.border} />
            <YAxis tick={{ fill: COLORS.dim, fontSize: 10 }} stroke={COLORS.border} domain={["dataMin - 10", "dataMax + 10"]} />
            <Tooltip
              contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 12 }}
              formatter={(v: any, name: any) => [`${v} lbs`, name]}
            />
            {chartVariants.map(v => (
              <Line key={v.name} type="monotone" dataKey={v.name} stroke={v.color} strokeWidth={2} dot={{ fill: v.color, r: 3 }} activeDot={{ r: 5 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ textAlign: "center", color: COLORS.dim, padding: "30px 0", fontSize: 13 }}>
          No previous data for {getBaseName(safeExIdx) || exercise.name}.
        </div>
      )}
    </>
  );

  const wGroups = workoutGroupsProp.length > 0 ? workoutGroupsProp : (session._workoutGroups || []);

  // ═══════════════════════════════════
  // ═══ MOBILE LAYOUT ═══
  // ═══════════════════════════════════
  if (isMobile) {
    return (
      <div>
        {/* Top Buttons */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 12,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={() => onFinish(session)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "none",
              background: COLORS.green,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            Finish
          </button>
          <button
            onClick={() => onSaveAndReturn()}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "none",
              background: COLORS.accent,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Save & Home
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: `1px solid ${COLORS.red}`,
              background: "transparent",
              color: COLORS.red,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Delete
          </button>
        </div>

        {/* Main Card */}
        <div style={cardStyle}>
          {/* Today + Date */}
          <div style={{ color: COLORS.dim, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: COLORS.text }}>Today</span> (
            {session.date})
          </div>

          {/* Push Day + Horizontal Exercise Scroll */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                padding: "6px 12px",
                background: COLORS.inner,
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                border: `1px solid ${COLORS.border}`,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {session.name}
            </div>
            <div
              ref={scrollRef}
              onMouseDown={(e: any) => {
                const el = e.currentTarget;
                const startX = e.pageX;
                const startScroll = el.scrollLeft;
                const onMove = (ev: MouseEvent) => {
                  const dx = ev.pageX - startX;
                  el.scrollLeft = startScroll - dx;
                };
                const onUp = () => {
                  window.removeEventListener("mousemove", onMove);
                  window.removeEventListener("mouseup", onUp);
                };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
              style={{
                display: "flex",
                gap: 6,
                overflowX: "auto",
                flex: 1,
                paddingBottom: 4,
                msOverflowStyle: "none",
                scrollbarWidth: "none",
                userSelect: "none",
                position: "relative",
                cursor: "grab",
              }}
            >
              {session.exercises.map((ex: any, i: number) => {
                const isActive = i === currentExerciseIndex;
                const allTouched = ex.sets.every(
                  (s: any, si: number) => touchedSets[`${i}-${si}`] && (s.weight > 0 || s.reps > 0),
                );
                const isDragOver = dragOverIdx === i && dragIdx !== i;
                const isDragging = dragIdx === i;
                return (
                  <div
                    key={i}
                    ref={el => { pillRefs.current[i] = el; }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                      borderRadius: 20,
                      border: isDragging
                        ? `2px solid ${COLORS.green}`
                        : isDragOver
                          ? `2px solid ${COLORS.green}`
                          : isActive
                            ? `2px solid ${COLORS.accent}`
                            : `1px solid ${COLORS.border}`,
                      background: isDragging
                        ? COLORS.green + "33"
                        : isDragOver
                          ? COLORS.green + "22"
                          : isActive ? COLORS.accent + "22" : "transparent",
                      overflow: "hidden",
                      transition: "border 0.1s, background 0.1s",
                      boxShadow: isDragging ? "0 2px 8px rgba(0,0,0,0.4)" : "none",
                    }}
                  >
                    {session.exercises.length > 1 && isActive && (
                      <span
                        style={{
                          padding: "6px 4px 6px 8px",
                          color: COLORS.accent,
                          fontSize: 11,
                          cursor: "grab",
                          lineHeight: 1,
                          flexShrink: 0,
                          touchAction: "none",
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const hoverRef = { current: i };
                          let started = false;

                          const onUp = () => {
                            dragIdxRef.current = null;
                            setDragIdx(null);
                            setDragOverIdx(null);
                            window.removeEventListener("pointermove", onMove);
                            window.removeEventListener("pointerup", onUp);
                          };

                          const onMove = (ev: PointerEvent) => {
                            if (!started) {
                              if (Math.abs(ev.clientX - startX) < 6) return;
                              started = true;
                              dragIdxRef.current = i;
                              setDragIdx(i);
                            }
                            const scrollEl = scrollRef.current;
                            if (!scrollEl) return;
                            let target = hoverRef.current;
                            pillRefs.current.forEach((pill, pi) => {
                              if (!pill || pi === dragIdxRef.current) return;
                              const r = pill.getBoundingClientRect();
                              if (ev.clientX > r.left && ev.clientX < r.right) {
                                target = pi;
                              }
                            });
                            if (target !== hoverRef.current) {
                              hoverRef.current = target;
                              const from = dragIdxRef.current!;
                              const updated = { ...sessionRef.current };
                              const exs = [...updated.exercises];
                              const [moved] = exs.splice(from, 1);
                              exs.splice(target, 0, moved);
                              updated.exercises = exs;
                              setSession(updated);
                              dragIdxRef.current = target;
                              setDragIdx(target);
                              setDragOverIdx(target);
                              setCurrentExerciseIndex(target);
                            }
                          };

                          window.addEventListener("pointermove", onMove);
                          window.addEventListener("pointerup", onUp);
                        }}
                      >
                        ☰
                      </span>
                    )}
                    <button
                      onClick={() => setCurrentExerciseIndex(i)}
                      style={{
                        padding: session.exercises.length > 1 ? "6px 4px" : "6px 10px 6px 14px",
                        border: "none",
                        background: "transparent",
                        color: allTouched ? COLORS.green : isActive ? COLORS.text : COLORS.dim,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: isActive ? 600 : 400,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ex.name}
                    </button>
                    {session.exercises.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeExercise(i); }}
                        style={{
                          padding: "6px 8px 6px 2px", border: "none",
                          background: "transparent", color: COLORS.red,
                          cursor: "pointer", fontSize: 11, lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => { setShowMobileAddModal(true); setAddSearch(""); }}
                style={{
                  padding: "6px 14px", borderRadius: 20,
                  border: `1px dashed ${COLORS.border}`, background: "transparent",
                  color: COLORS.dim, cursor: "pointer", fontSize: 12,
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Exercise Name */}
          {variantList.length > 1 ? (() => {
            const activeVName = activeVariant?.name ?? "";
            return (
              <div style={{ position: "relative", margin: "0 0 2px" }}>
                <button onClick={() => setShowVDrop(d => !d)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, textDecoration: "underline", textDecorationColor: COLORS.accent, textUnderlineOffset: 4, color: COLORS.text }}>
                    {activeVName && activeVName !== "Standard" ? `${activeVName} ${getBaseName(safeExIdx)}` : getBaseName(safeExIdx)}
                  </h2>
                  <span style={{ fontSize: 13, color: COLORS.accent }}>▾</span>
                </button>
                {showVDrop && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setShowVDrop(false)} />
                    <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, zIndex: 50, minWidth: 180, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", overflow: "hidden" }}>
                      {variantList.map((v: any) => {
                        const isActive = activeVariant?.id === v.id;
                        const hasSubs = (v.subvariants?.length ?? 0) > 0;
                        return (
                          <div key={v.id}>
                            <div
                              onClick={() => { setSelectedVariants(prev => ({ ...prev, [safeExIdx]: v.id })); if (!hasSubs) setShowVDrop(false); }}
                              style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? COLORS.accent : COLORS.text, background: isActive ? COLORS.accent + "18" : "transparent", borderBottom: `1px solid ${COLORS.border}` }}
                            >
                              {v.name}{v.isDefault && <span style={{ marginLeft: 6, fontSize: 11, color: COLORS.dim, fontWeight: 400 }}>default</span>}
                            </div>
                            {hasSubs && activeVariant?.id === v.id && v.subvariants.map((s: any) => (
                              <div key={s.id}
                                onClick={() => { setSelectedVariants(prev => ({ ...prev, [safeExIdx]: v.id, [`${safeExIdx}_sub`]: s.id })); setShowVDrop(false); }}
                                style={{ padding: "7px 14px 7px 28px", cursor: "pointer", fontSize: 12, color: COLORS.dim, background: "transparent", borderBottom: `1px solid ${COLORS.border}` }}
                                onMouseEnter={e => (e.currentTarget.style.background = COLORS.inner)}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                              >
                                ↳ {s.name}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })() : (
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 2px", textDecoration: "underline", textDecorationColor: COLORS.accent, textUnderlineOffset: 4 }}>
              {exercise.name}
            </h2>
          )}
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: COLORS.accent,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Set: {currentSetIndex + 1} of {totalSets}
          </div>

          {/* Previous Top Set */}
          {previousTopSet && (
            <div
              style={{
                padding: "6px 10px",
                background: COLORS.inner,
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                fontSize: 12,
                color: COLORS.dim,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              <span style={{ fontWeight: 600, color: COLORS.text }}>
                Previous Top Set
              </span>{" "}
              ({formatPrevDate(previousTopSet.date)}):{" "}
              <span style={{ color: COLORS.text, fontWeight: 600 }}>
                {previousTopSet.weight}
              </span>{" "}
              lbs ×{" "}
              <span style={{ color: COLORS.text, fontWeight: 600 }}>
                {previousTopSet.reps}
              </span>{" "}
              reps
            </div>
          )}

          {/* Weight + Reps */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              marginBottom: 10,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{ fontSize: 15, color: COLORS.dim, fontWeight: 600 }}
              >
                Weight
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  width: 80,
                }}
              >
                <button onClick={() => adjustWeight(2.5)} style={arrowBtn}>
                  ▲
                </button>
                <input
                  type="number"
                  step="2.5"
                  style={{
                    width: "100%",
                    padding: "8px 4px",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    background: COLORS.inner,
                    color: isTouched ? COLORS.text : COLORS.dim,
                    outline: "none",
                    fontSize: 18,
                    textAlign: "center" as const,
                    fontWeight: 600,
                    boxSizing: "border-box" as const,
                  }}
                  value={isTouched ? currentSet.weight : (previousWorkout?.sets[currentSetIndex]?.weight ?? 0)}
                  placeholder="0"
                  onFocus={() =>
                    markTouched(currentExerciseIndex, currentSetIndex)
                  }
                  onChange={(e: any) =>
                    updateSet(currentSetIndex, "weight", Number(e.target.value))
                  }
                  onBlur={(e: any) => {
                    const rounded =
                      Math.round(Number(e.target.value) / 2.5) * 2.5;
                    updateSet(currentSetIndex, "weight", rounded);
                  }}
                />
                <button onClick={() => adjustWeight(-2.5)} style={arrowBtn}>
                  ▼
                </button>
              </div>
              <span
                style={{ fontSize: 13, color: COLORS.dim, fontWeight: 600 }}
              >
                lbs
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{ fontSize: 15, color: COLORS.dim, fontWeight: 600 }}
              >
                Reps
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  width: 80,
                }}
              >
                <button onClick={() => adjustReps(1)} style={arrowBtn}>
                  ▲
                </button>
                <input
                  type="number"
                  step="1"
                  style={{
                    width: "100%",
                    padding: "8px 4px",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    background: COLORS.inner,
                    color: isTouched ? COLORS.text : COLORS.dim,
                    outline: "none",
                    fontSize: 18,
                    textAlign: "center" as const,
                    fontWeight: 600,
                    boxSizing: "border-box" as const,
                  }}
                  value={isTouched ? currentSet.reps : (previousWorkout?.sets[currentSetIndex]?.reps ?? 0)}
                  placeholder="0"
                  onFocus={() =>
                    markTouched(currentExerciseIndex, currentSetIndex)
                  }
                  onChange={(e: any) =>
                    updateSet(currentSetIndex, "reps", Number(e.target.value))
                  }
                  onBlur={(e: any) => {
                    const rounded = Math.max(
                      0,
                      Math.round(Number(e.target.value)),
                    );
                    updateSet(currentSetIndex, "reps", rounded);
                  }}
                />
                <button onClick={() => adjustReps(-1)} style={arrowBtn}>
                  ▼
                </button>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              onClick={() => {
                if (exercise.sets.length <= 1)
                  removeExercise(currentExerciseIndex);
                else removeCurrentSet();
              }}
              style={{
                ...btnStyle(false),
                color: COLORS.red,
                borderColor: COLORS.red,
              }}
            >
              {exercise.sets.length <= 1 ? "Remove Workout" : "Remove Set"}
            </button>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() =>
                  setCurrentSetIndex(Math.max(0, currentSetIndex - 1))
                }
                disabled={currentSetIndex === 0}
                style={{
                  ...btnStyle(false),
                  flex: 1,
                  opacity: currentSetIndex === 0 ? 0.4 : 1,
                }}
              >
                Previous Set
              </button>
              <button
                onClick={() => {
                  if (currentSetIndex === totalSets - 1) {
                    addSet();
                    setCurrentSetIndex(currentSetIndex + 1);
                  } else setCurrentSetIndex(currentSetIndex + 1);
                }}
                style={{ ...btnStyle(true), flex: 1 }}
              >
                {currentSetIndex === totalSets - 1 ? "+ Add Set" : "Next Set"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() =>
                  setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))
                }
                disabled={currentExerciseIndex === 0}
                style={{
                  ...btnStyle(false),
                  flex: 1,
                  opacity: currentExerciseIndex === 0 ? 0.4 : 1,
                }}
              >
                Prev Workout
              </button>
              <button
                onClick={() => {
                  if (currentExerciseIndex < session.exercises.length - 1)
                    setCurrentExerciseIndex(currentExerciseIndex + 1);
                }}
                disabled={currentExerciseIndex === session.exercises.length - 1}
                style={{
                  ...btnStyle(true, COLORS.green),
                  flex: 1,
                  opacity:
                    currentExerciseIndex === session.exercises.length - 1
                      ? 0.4
                      : 1,
                }}
              >
                Next Workout
              </button>
            </div>
          </div>
        </div>

        {/* ─── Bottom Card: Previous / All Time Toggle ─── */}
        <div style={{ ...cardStyle, marginTop: 12, background: COLORS.inner }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            <button
              onClick={() => setMobileBottomTab("previous")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background:
                  mobileBottomTab === "previous" ? COLORS.accent : COLORS.card,
                color: mobileBottomTab === "previous" ? "#fff" : COLORS.dim,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setMobileBottomTab("alltime")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background:
                  mobileBottomTab === "alltime" ? COLORS.accent : COLORS.card,
                color: mobileBottomTab === "alltime" ? "#fff" : COLORS.dim,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              All Time
            </button>
          </div>
          <div style={{ minHeight: 220 }}>
            <div style={{ minHeight: 220 }}>
              {mobileBottomTab === "previous"
                ? renderPreviousContent()
                : renderChartContent()}
            </div>
          </div>
        </div>

        {/* New Exercise Popup (mobile) */}
        {showNewExercisePopup && (
          <WorkoutPopup
            groups={wGroups}
            onSave={(ex: any) => {
              const updatedSession = { ...session };
              updatedSession.exercises = [...updatedSession.exercises, {
                name: ex.name,
                exerciseId: ex.id,
                sets: Array.from({ length: ex.sets }, () => ({ weight: 0, reps: 0, type: "normal" })),
              }];
              updatedSession._exercises = [...(session._exercises || []), ex];
              setSession(updatedSession);
              setExercises?.([...(exercisesProp || []), ex]);
              setCurrentExerciseIndex(updatedSession.exercises.length - 1);
              setShowNewExercisePopup(false);
            }}
            onClose={() => setShowNewExercisePopup(false)}
          />
        )}

        {/* Mobile Add Exercise Modal */}
        {showMobileAddModal && (() => {
          const wGroups: any[] = session._workoutGroups || [];
          const wExercises: any[] = session._exercises || [];
          const alreadyAdded = new Set(session.exercises.map((ex: any) => ex.name));
          const muscleGroups = wGroups.map((g: any) => ({
            name: g.name,
            exercises: wExercises
              .filter((ex: any) => (ex.groupIds || []).includes(g.id))
              .map((ex: any) => ex.name),
          })).filter((g: any) => g.exercises.length > 0);
          const allExerciseNames = wExercises.map((ex: any) => ex.name);
          const isSearching = addSearch.trim().length > 0;
          const filtered = allExerciseNames.filter((n: string) =>
            n.toLowerCase().includes(addSearch.toLowerCase())
          );
          const addExercise = (name: string) => {
            if (alreadyAdded.has(name)) {
              setDupError(`${name} is already in this session`);
              setTimeout(() => setDupError(null), 2000);
              return;
            }
            const updated = { ...session };
            const exDef = (session._exercises || []).find((e: any) => e.name === name);
const defVariant = exDef?.variants?.find((v: any) => v.isDefault) ?? exDef?.variants?.[0];
const vName = defVariant?.name ?? null;
updated.exercises = [...updated.exercises, {
  name,
  exerciseId: exDef?.id ?? null,
  variantName: vName,
  sets: [{ weight: 0, reps: 0, type: "normal", variantName: vName }],
}];
            setSession(updated);
            setCurrentExerciseIndex(updated.exercises.length - 1);
            setShowMobileAddModal(false);
          };
          return (
            <>
              <div onClick={() => setShowMobileAddModal(false)} style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999,
              }} />
              <div style={{
                position: "fixed", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(340px, 90vw)", maxHeight: "70vh",
                background: COLORS.card, borderRadius: 14,
                border: `1px solid ${COLORS.border}`,
                zIndex: 1000, display: "flex", flexDirection: "column", overflow: "hidden",
              }}>
                <div style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>Add Exercise</span>
                </div>
                <div style={{ padding: "8px 8px 4px" }}>
                  <input
                    autoFocus
                    value={addSearch}
                    onChange={e => setAddSearch(e.target.value)}
                    placeholder="Search exercises…"
                    style={{
                      width: "100%", padding: "7px 10px", borderRadius: 8,
                      border: `1px solid ${COLORS.border}`, background: COLORS.inner,
                      color: COLORS.text, outline: "none", fontSize: 13,
                      boxSizing: "border-box" as const,
                    }}
                  />
                </div>
                {dupError && (
                  <div style={{ padding: "6px 12px", fontSize: 12, color: COLORS.red, background: COLORS.inner }}>
                    ⚠ {dupError}
                  </div>
                )}
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {isSearching ? (
                    filtered.length === 0
                      ? <div style={{ padding: "12px", fontSize: 13, color: COLORS.dim }}>No exercises found</div>
                      : filtered.map((name: string) => (
                        <button key={name} onClick={() => addExercise(name)}
                          style={{
                            width: "100%", padding: "10px 12px", background: "none", border: "none",
                            color: alreadyAdded.has(name) ? COLORS.dim : COLORS.text,
                            cursor: alreadyAdded.has(name) ? "default" : "pointer",
                            textAlign: "left" as const, fontSize: 13,
                            borderBottom: `1px solid ${COLORS.border}`,
                            opacity: alreadyAdded.has(name) ? 0.4 : 1,
                          }}
                          onMouseEnter={e => { if (!alreadyAdded.has(name)) e.currentTarget.style.background = COLORS.inner; }}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                          {name}
                        </button>
                      ))
                  ) : muscleGroups.length > 0 ? (
                    muscleGroups.map((group: any) => (
                      <div key={group.name}>
                        <div style={{ padding: "6px 12px 3px", fontSize: 10, fontWeight: 700, color: COLORS.accent, textTransform: "uppercase" as const, letterSpacing: 1, background: COLORS.inner }}>
                          {group.name}
                        </div>
                        {group.exercises.map((name: string) => (
                          <button key={name} onClick={() => addExercise(name)}
                            style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", color: COLORS.text, cursor: "pointer", textAlign: "left" as const, fontSize: 13, borderBottom: `1px solid ${COLORS.border}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = COLORS.inner)}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                            {name}
                          </button>
                        ))}
                      </div>
                    ))
                  ) : (
                    allExerciseNames.map((name: string) => (
                      <button key={name} onClick={() => addExercise(name)}
                        style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", color: alreadyAdded.has(name) ? COLORS.dim : COLORS.text, cursor: alreadyAdded.has(name) ? "default" : "pointer", textAlign: "left" as const, fontSize: 13, borderBottom: `1px solid ${COLORS.border}`, opacity: alreadyAdded.has(name) ? 0.4 : 1 }}
                        onMouseEnter={e => { if (!alreadyAdded.has(name)) e.currentTarget.style.background = COLORS.inner; }}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                        {name}
                      </button>
                    ))
                  )}
                </div>
                <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <button
                    onClick={() => { setShowMobileAddModal(false); setShowNewExercisePopup(true); }}
                    style={{
                      width: "100%", padding: "10px 12px", background: "none", border: "none",
                      borderBottom: `1px solid ${COLORS.border}`,
                      color: COLORS.accent, cursor: "pointer",
                      textAlign: "left" as const, fontSize: 13, fontWeight: 600,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = COLORS.inner)}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    + Create New Exercise
                  </button>
                  <button
                    onClick={() => setShowMobileAddModal(false)}
                    style={{
                      width: "100%", padding: "10px 12px", background: "none", border: "none",
                      color: COLORS.dim, cursor: "pointer", fontSize: 13,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          );
        })()}

        {/* Delete Modal */}
        {showDeleteConfirm && (
          <div
            onClick={() => setShowDeleteConfirm(false)}
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
              onClick={(e: any) => e.stopPropagation()}
              style={{
                background: COLORS.card,
                borderRadius: 16,
                padding: 24,
                border: `1px solid ${COLORS.border}`,
                minWidth: 280,
                textAlign: "center",
              }}
            >
              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
                Delete Workout?
              </h3>
              <p
                style={{ color: COLORS.dim, fontSize: 14, margin: "0 0 20px" }}
              >
                This will discard all logged data for this session.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    background: "transparent",
                    color: COLORS.text,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    if (session._editing && onDeleteWorkout) {
                      onDeleteWorkout(session.id);
                    } else {
                      onCancel();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 8,
                    border: "none",
                    background: COLORS.red,
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════
  // ═══ DESKTOP LAYOUT ═══
  // ═══════════════════════════════════

  const REP_PRESETS = ["3-5","6-8","8-10","8-12","10-12","12-15","15-20"];

  return (
    <div>
      {showNewExercisePopup && (
        <WorkoutPopup
          groups={wGroups}
          onSave={(ex: any) => {
            const updatedSession = { ...session };
            updatedSession.exercises = [...updatedSession.exercises, {
              name: ex.name,
              exerciseId: ex.id,
              sets: Array.from({ length: ex.sets }, () => ({ weight: 0, reps: 0, type: "normal" })),
            }];
            updatedSession._exercises = [...(session._exercises || []), ex];
            setSession(updatedSession);
            setExercises?.([...(exercisesProp || []), ex]);
            setCurrentExerciseIndex(updatedSession.exercises.length - 1);
            setShowNewExercisePopup(false);
          }}
          onClose={() => setShowNewExercisePopup(false)}
        />
      )}
      {/* ─── Top Bar ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          Log Session
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onFinish(session)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: COLORS.green,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Finish Session
          </button>
          <button
            onClick={() => onSaveAndReturn()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: COLORS.accent,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Save and Return Home
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${COLORS.red}`,
              background: "transparent",
              color: COLORS.red,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Delete Session
          </button>
        </div>
      </div>

      {/* ─── Three-Column Grid ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gridTemplateRows: "1fr auto",
          gap: 12,
          height: contentHeight,
        }}
      >
        {/* ═══ LEFT — Exercise List ═══ */}
        <div
          style={{
            gridRow: "1 / 3",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            style={{
              ...cardStyle,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "visible",
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                background: COLORS.inner,
                borderRadius: 8,
                marginBottom: 10,
                textAlign: "center",
                fontWeight: 700,
                fontSize: 15,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {session.name}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                flex: 1,
              }}
            >
              {session.exercises.map((ex: any, i: number) => {
                const isActive = i === currentExerciseIndex;
                const allTouched = ex.sets.every(
                  (s: any, si: number) => touchedSets[`${i}-${si}`] && (s.weight > 0 || s.reps > 0),
                );
                const isLast = i === session.exercises.length - 1;
                const isDragging = desktopDragIdx === i;
                const isDragOver = desktopDragOverIdx === i && desktopDragIdx !== i;
                return (
                  <div
                    key={i}
                    ref={el => {
                      desktopPillRefs.current[i] = el;
                      if (isLast) (lastExerciseRef as any).current = el;
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      borderRadius: 8,
                      background: isDragOver ? COLORS.accent + "18" : "transparent",
                      outline: isDragOver ? `2px solid ${COLORS.accent}` : "none",
                      transition: "background 0.1s",
                    }}
                  >
                    {session.exercises.length > 1 && isActive && (
                      <span
                        style={{
                          color: COLORS.accent,
                          fontSize: 11,
                          cursor: "grab",
                          padding: "3px 4px",
                          lineHeight: 1,
                          flexShrink: 0,
                          touchAction: "none",
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const startY = e.clientY;
                          const hoverRef = { current: i };
                          let started = false;

                          const onUp = () => {
                            desktopDragIdxRef.current = null;
                            setDesktopDragIdx(null);
                            setDesktopDragOverIdx(null);
                            window.removeEventListener("pointermove", onMove);
                            window.removeEventListener("pointerup", onUp);
                          };

                          const onMove = (ev: PointerEvent) => {
                            if (!started) {
                              if (Math.abs(ev.clientY - startY) < 6) return;
                              started = true;
                              desktopDragIdxRef.current = i;
                              setDesktopDragIdx(i);
                            }
                            let target = hoverRef.current;
                            desktopPillRefs.current.forEach((pill, pi) => {
                              if (!pill || pi === desktopDragIdxRef.current) return;
                              const r = pill.getBoundingClientRect();
                              if (ev.clientY > r.top && ev.clientY < r.bottom) {
                                target = pi;
                              }
                            });
                            if (target !== hoverRef.current) {
                              hoverRef.current = target;
                              const from = desktopDragIdxRef.current!;
                              const updated = { ...sessionRef.current };
                              const exs = [...updated.exercises];
                              const [moved] = exs.splice(from, 1);
                              exs.splice(target, 0, moved);
                              updated.exercises = exs;
                              setSession(updated);
                              // remap touchedSets keys to follow exercises
                              const newOrder = Array.from({ length: exs.length }, (_, idx) => idx);
                              newOrder.splice(target, 0, newOrder.splice(from, 1)[0]);
                              setTouchedSets(prev => {
                                const next: Record<string, boolean> = {};
                                // build a mapping: oldIndex -> newIndex
                                const oldToNew: Record<number, number> = {};
                                const tmpOrder = Array.from({ length: sessionRef.current.exercises.length }, (_, idx) => idx);
                                tmpOrder.splice(target, 0, tmpOrder.splice(from, 1)[0]);
                                tmpOrder.forEach((oldIdx, newIdx) => { oldToNew[oldIdx] = newIdx; });
                                Object.keys(prev).forEach(key => {
                                  const [ei, si] = key.split("-").map(Number);
                                  if (oldToNew[ei] !== undefined) {
                                    next[`${oldToNew[ei]}-${si}`] = prev[key];
                                  }
                                });
                                return next;
                              });
                              desktopDragIdxRef.current = target;
                              setDesktopDragIdx(target);
                              setDesktopDragOverIdx(target);
                              setCurrentExerciseIndex(target);
                            }
                          };

                          window.addEventListener("pointermove", onMove);
                          window.addEventListener("pointerup", onUp);
                        }}
                      >
                        ☰
                      </span>
                    )}
                    {!isActive && <div style={{ width: 20, flexShrink: 0 }} />}
                    <button
                      onClick={() => setCurrentExerciseIndex(i)}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: isDragging
                          ? `2px solid ${COLORS.green}`
                          : isActive
                            ? `2px solid ${COLORS.accent}`
                            : `1px solid ${COLORS.border}`,
                        background: isDragging
                          ? COLORS.green + "22"
                          : isActive ? COLORS.accent + "18" : "transparent",
                        color: allTouched ? COLORS.green : isActive ? COLORS.text : COLORS.dim,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        textAlign: "left" as const,
                      }}
                    >
                      {(() => {
                        const exDef = (session._exercises || []).find((e: any) => e.id === ex.exerciseId);
                        return exDef?.name ?? ex.name;
                      })()}
                    </button>
                    <button
                      onClick={() => removeExercise(i)}
                      style={{
                        background: "none",
                        border: "none",
                        color: COLORS.red,
                        cursor: session.exercises.length <= 1 ? "default" : "pointer",
                        fontSize: 13,
                        padding: "3px",
                        opacity: session.exercises.length <= 1 ? 0.3 : 1,
                      }}
                      disabled={session.exercises.length <= 1}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ position: "relative", marginTop: 6 }}>
              <button
                ref={addBtnRef}
                onClick={() => {
                  if (!showAddDropdown && lastExerciseRef.current && addBtnRef.current) {
                    const last = lastExerciseRef.current.getBoundingClientRect();
                    const btn = addBtnRef.current.getBoundingClientRect();
                    setDropdownPos({ top: last.bottom + 4, left: btn.left, width: btn.width });
                  }
                  setShowAddDropdown(d => !d);
                  setAddSearch("");
                }}
                style={{
                  width: "100%", padding: "8px", borderRadius: 8,
                  border: `1px dashed ${COLORS.border}`, background: "transparent",
                  color: COLORS.dim, cursor: "pointer", fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                Add Workout <span style={{ fontSize: 14 }}>+</span>
              </button>
              {showAddDropdown && (() => {
                // Build muscle groups from _workoutGroups + _exercises
                const wGroups: any[] = session._workoutGroups || [];
                const wExercises: any[] = session._exercises || [];
                const muscleGroups = wGroups.map((g: any) => ({
                  name: g.name,
                  exercises: wExercises
                    .filter((ex: any) => (ex.groupIds || []).includes(g.id))
                    .map((ex: any) => ex.name),
                })).filter((g: any) => g.exercises.length > 0);
                const allExerciseNames = wExercises.map((ex: any) => ex.name);
                const isSearching = addSearch.trim().length > 0;
                const filtered = allExerciseNames.filter((n: string) =>
                  n.toLowerCase().includes(addSearch.toLowerCase())
                );
                const alreadyAdded = new Set(session.exercises.map((ex: any) => ex.name));
                const addExercise = (name: string) => {
                  if (alreadyAdded.has(name)) {
                    setDupError(`${name} is already in this session`);
                    setTimeout(() => setDupError(null), 2000);
                    return;
                  }
                  const updated = { ...session };
                  const exDef = (session._exercises || []).find((e: any) => e.name === name);
const defVariant = exDef?.variants?.find((v: any) => v.isDefault) ?? exDef?.variants?.[0];
const vName = defVariant?.name ?? null;
updated.exercises = [...updated.exercises, {
  name,
  exerciseId: exDef?.id ?? null,
  variantName: vName,
  sets: [{ weight: 0, reps: 0, type: "normal", variantName: vName }],
}];
                  setSession(updated);
                  setCurrentExerciseIndex(updated.exercises.length - 1);
                  setShowAddDropdown(false);
                };
                const dp = dropdownPos;
                return (
                  <>
                  <div style={{
                    position: "fixed", bottom: 0, left: 0, right: 0,
                    top: 0, background: "transparent", zIndex: 199,
                  }} onClick={() => setShowAddDropdown(false)} />
                  <div style={{
                    position: "fixed",
                    top: dp ? dp.top : 200,
                    left: dp ? dp.left : 0,
                    width: dp ? dp.width : 300,
                    bottom: addBtnRef.current ? window.innerHeight - addBtnRef.current.getBoundingClientRect().bottom : 20,
                    background: COLORS.card, border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    display: "flex", flexDirection: "column",
                    overflow: "hidden",
                  }}>
                    <div style={{ padding: "8px 8px 4px" }}>
                      <input
                        autoFocus
                        value={addSearch}
                        onChange={e => setAddSearch(e.target.value)}
                        placeholder="Search exercises…"
                        style={{
                          width: "100%", padding: "7px 10px", borderRadius: 8,
                          border: `1px solid ${COLORS.border}`, background: COLORS.inner,
                          color: COLORS.text, outline: "none", fontSize: 13,
                          boxSizing: "border-box" as const,
                        }}
                      />
                    </div>
                    {dupError && (
                      <div style={{ padding: "6px 12px", fontSize: 12, color: COLORS.red, background: COLORS.inner, borderBottom: `1px solid ${COLORS.border}` }}>
                        ⚠ {dupError}
                      </div>
                    )}
                    <div style={{ overflowY: "auto", flex: 1 }}>
                      {isSearching ? (
                        filtered.length === 0 ? (
                          <div style={{ padding: "10px 12px", fontSize: 12, color: COLORS.dim }}>No exercises found</div>
                        ) : filtered.map((name: string) => (
                          <button key={name} onClick={() => addExercise(name)}
                            style={{ width: "100%", padding: "9px 12px", background: "none", border: "none", color: alreadyAdded.has(name) ? COLORS.dim : COLORS.text, cursor: alreadyAdded.has(name) ? "default" : "pointer", textAlign: "left" as const, fontSize: 13, borderBottom: `1px solid ${COLORS.border}`, opacity: alreadyAdded.has(name) ? 0.4 : 1 }}
                            onMouseEnter={e => { if (!alreadyAdded.has(name)) e.currentTarget.style.background = COLORS.inner; }}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                            {name}
                          </button>
                        ))
                      ) : muscleGroups.length > 0 ? (
                        muscleGroups.map((group: any) => (
                          <div key={group.name}>
                            <div style={{ padding: "6px 12px 3px", fontSize: 10, fontWeight: 700, color: COLORS.accent, textTransform: "uppercase" as const, letterSpacing: 1, background: COLORS.inner }}>
                              {group.name}
                            </div>
                            {group.exercises.map((name: string) => (
                              <button key={name} onClick={() => addExercise(name)}
                                style={{ width: "100%", padding: "9px 12px", background: "none", border: "none", color: COLORS.text, cursor: "pointer", textAlign: "left" as const, fontSize: 13, borderBottom: `1px solid ${COLORS.border}` }}
                                onMouseEnter={e => (e.currentTarget.style.background = COLORS.inner)}
                                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                {name}
                              </button>
                            ))}
                          </div>
                        ))
                      ) : (
                        allExerciseNames.map((name: string) => (
                          <button key={name} onClick={() => addExercise(name)}
                            style={{ width: "100%", padding: "9px 12px", background: "none", border: "none", color: alreadyAdded.has(name) ? COLORS.dim : COLORS.text, cursor: alreadyAdded.has(name) ? "default" : "pointer", textAlign: "left" as const, fontSize: 13, borderBottom: `1px solid ${COLORS.border}`, opacity: alreadyAdded.has(name) ? 0.4 : 1 }}
                            onMouseEnter={e => { if (!alreadyAdded.has(name)) e.currentTarget.style.background = COLORS.inner; }}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                            {name}
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowAddDropdown(false);
                        setShowNewExercisePopup(true);
                      }}
                      style={{
                        width: "100%", padding: "10px 12px", background: "none",
                        border: "none", borderTop: `1px solid ${COLORS.border}`,
                        color: COLORS.accent, cursor: "pointer",
                        textAlign: "left" as const, fontSize: 13, fontWeight: 600,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = COLORS.inner)}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      + Create New Exercise
                    </button>
                  </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ═══ MIDDLE — Set Logging ═══ */}
        <div
          style={{
            ...cardStyle,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div style={{ color: COLORS.dim, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: COLORS.text }}>Today</span> (
            {session.date})
          </div>
          {variantList.length > 1 ? (() => {
            const activeVName = activeVariant?.name ?? "";
            return (
              <div style={{ position: "relative", marginTop: 4 }}>
                <button
                  onClick={() => setShowVDrop(d => !d)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" as const, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, textDecoration: "underline", textDecorationColor: COLORS.accent, textUnderlineOffset: 4, color: COLORS.text }}>
                    {activeVName && activeVName !== "Standard" ? `${activeVName} ${getBaseName(safeExIdx)}` : getBaseName(safeExIdx)}
                  </h2>
                  <span style={{ fontSize: 13, color: COLORS.accent, marginTop: 2 }}>▾</span>
                </button>
                {showVDrop && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setShowVDrop(false)} />
                    <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, zIndex: 50, minWidth: 180, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", overflow: "hidden" }}>
                      {variantList.map((v: any) => {
                        const isActive = activeVariant?.id === v.id;
                        const hasSubs = (v.subvariants?.length ?? 0) > 0;
                        return (
                          <div key={v.id}>
                            <div
                              onClick={() => { if (!hasSubs) { setSelectedVariants(prev => ({ ...prev, [safeExIdx]: v.id })); setShowVDrop(false); } else { setSelectedVariants(prev => ({ ...prev, [safeExIdx]: v.id })); } }}
                              style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? COLORS.accent : COLORS.text, background: isActive ? COLORS.accent + "18" : "transparent", borderBottom: `1px solid ${COLORS.border}` }}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = COLORS.inner; }}
                              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                            >
                              {v.name}{v.isDefault && <span style={{ marginLeft: 6, fontSize: 11, color: COLORS.dim, fontWeight: 400 }}>default</span>}
                            </div>
                            {hasSubs && activeVariant?.id === v.id && v.subvariants.map((s: any) => (
                              <div
                                key={s.id}
                                onClick={() => { setSelectedVariants(prev => ({ ...prev, [safeExIdx]: v.id, [`${safeExIdx}_sub`]: s.id })); setShowVDrop(false); }}
                                style={{ padding: "7px 14px 7px 28px", cursor: "pointer", fontSize: 12, color: COLORS.dim, background: "transparent", borderBottom: `1px solid ${COLORS.border}` }}
                                onMouseEnter={e => (e.currentTarget.style.background = COLORS.inner)}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                              >
                                ↳ {s.name}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })() : (
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 0", textDecoration: "underline", textDecorationColor: COLORS.accent, textUnderlineOffset: 4 }}>
              {exercise.name}
            </h2>
          )}

          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              marginTop: 6,
              color: COLORS.accent,
              textAlign: "center",
            }}
          >
            Set: {currentSetIndex + 1} of {totalSets}
          </div>

          {previousTopSet && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                background: COLORS.inner,
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                fontSize: 13,
                color: COLORS.dim,
                textAlign: "center",
              }}
            >
              <span style={{ fontWeight: 600, color: COLORS.text }}>
                Previous Top Set
              </span>{" "}
              ({formatPrevDate(previousTopSet.date)}):{" "}
              <span style={{ color: COLORS.text, fontWeight: 600 }}>
                {previousTopSet.weight}
              </span>{" "}
              lbs ×{" "}
              <span style={{ color: COLORS.text, fontWeight: 600 }}>
                {previousTopSet.reps}
              </span>{" "}
              reps
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 32,
              marginTop: 12,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{ fontSize: 15, color: COLORS.dim, fontWeight: 600 }}
              >
                Weight
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  width: 90,
                }}
              >
                <button onClick={() => adjustWeight(2.5)} style={arrowBtn}>
                  ▲
                </button>
                <input
                  type="number"
                  step="2.5"
                  style={{
                    width: "100%",
                    padding: "8px 4px",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    background: COLORS.inner,
                    color: isTouched ? COLORS.text : COLORS.dim,
                    outline: "none",
                    fontSize: 18,
                    textAlign: "center" as const,
                    fontWeight: 600,
                    boxSizing: "border-box" as const,
                  }}
                  value={isTouched ? currentSet.weight : (previousWorkout?.sets[currentSetIndex]?.weight ?? 0)}
                  placeholder="0"
                  onFocus={() =>
                    markTouched(currentExerciseIndex, currentSetIndex)
                  }
                  onChange={(e: any) =>
                    updateSet(currentSetIndex, "weight", Number(e.target.value))
                  }
                  onBlur={(e: any) => {
                    const rounded =
                      Math.round(Number(e.target.value) / 2.5) * 2.5;
                    updateSet(currentSetIndex, "weight", rounded);
                  }}
                />
                <button onClick={() => adjustWeight(-2.5)} style={arrowBtn}>
                  ▼
                </button>
              </div>
              <span
                style={{ fontSize: 13, color: COLORS.dim, fontWeight: 600 }}
              >
                lbs
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{ fontSize: 15, color: COLORS.dim, fontWeight: 600 }}
              >
                Reps
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  width: 90,
                }}
              >
                <button onClick={() => adjustReps(1)} style={arrowBtn}>
                  ▲
                </button>
                <input
                  type="number"
                  step="1"
                  style={{
                    width: "100%",
                    padding: "8px 4px",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    background: COLORS.inner,
                    color: isTouched ? COLORS.text : COLORS.dim,
                    outline: "none",
                    fontSize: 18,
                    textAlign: "center" as const,
                    fontWeight: 600,
                    boxSizing: "border-box" as const,
                  }}
                  value={isTouched ? currentSet.reps : (previousWorkout?.sets[currentSetIndex]?.reps ?? 0)}
                  placeholder="0"
                  onFocus={() =>
                    markTouched(currentExerciseIndex, currentSetIndex)
                  }
                  onChange={(e: any) =>
                    updateSet(currentSetIndex, "reps", Number(e.target.value))
                  }
                  onBlur={(e: any) => {
                    const rounded = Math.max(
                      0,
                      Math.round(Number(e.target.value)),
                    );
                    updateSet(currentSetIndex, "reps", rounded);
                  }}
                />
                <button onClick={() => adjustReps(-1)} style={arrowBtn}>
                  ▼
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 12,
            }}
          >
            <button
              onClick={() => {
                if (exercise.sets.length <= 1)
                  removeExercise(currentExerciseIndex);
                else removeCurrentSet();
              }}
              style={{
                ...btnStyle(false),
                color: COLORS.red,
                borderColor: COLORS.red,
              }}
            >
              {exercise.sets.length <= 1 ? "Remove Workout" : "Remove Set"}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() =>
                  setCurrentSetIndex(Math.max(0, currentSetIndex - 1))
                }
                disabled={currentSetIndex === 0}
                style={{
                  ...btnStyle(false),
                  flex: 1,
                  opacity: currentSetIndex === 0 ? 0.4 : 1,
                }}
              >
                Previous Set
              </button>
              <button
                onClick={() => {
                  if (currentSetIndex === totalSets - 1) {
                    addSet();
                    setCurrentSetIndex(currentSetIndex + 1);
                  } else setCurrentSetIndex(currentSetIndex + 1);
                }}
                style={{ ...btnStyle(true), flex: 1 }}
              >
                {currentSetIndex === totalSets - 1 ? "+ Add Set" : "Next Set"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() =>
                  setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))
                }
                disabled={currentExerciseIndex === 0}
                style={{
                  ...btnStyle(false),
                  flex: 1,
                  opacity: currentExerciseIndex === 0 ? 0.4 : 1,
                }}
              >
                Previous Workout
              </button>
              <button
                onClick={() => {
                  if (currentExerciseIndex < session.exercises.length - 1)
                    setCurrentExerciseIndex(currentExerciseIndex + 1);
                }}
                disabled={currentExerciseIndex === session.exercises.length - 1}
                style={{
                  ...btnStyle(true, COLORS.green),
                  flex: 1,
                  opacity:
                    currentExerciseIndex === session.exercises.length - 1
                      ? 0.4
                      : 1,
                }}
              >
                Next Workout
              </button>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT — Previous Performance ═══ */}
        <div style={{ ...cardStyle, background: COLORS.inner }}>
          {renderPreviousContent()}
        </div>

        {/* ═══ CHART — Spans middle + right ═══ */}
        <div style={{ ...cardStyle, gridColumn: "2 / 4" }}>
          {renderChartContent()}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
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
            onClick={(e: any) => e.stopPropagation()}
            style={{
              background: COLORS.card,
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${COLORS.border}`,
              minWidth: 300,
              textAlign: "center",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
              Delete Workout?
            </h3>
            <p style={{ color: COLORS.dim, fontSize: 14, margin: "0 0 20px" }}>
              This will discard all logged data for this session.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: "transparent",
                  color: COLORS.text,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  if (session._editing && onDeleteWorkout) {
                    onDeleteWorkout(session.id);
                  } else {
                    onCancel();
                  }
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 8,
                  border: "none",
                  background: COLORS.red,
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
