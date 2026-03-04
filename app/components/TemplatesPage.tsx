"use client";
import { useState, useEffect } from "react";
import { COLORS, generateId } from "../constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise {
  id: string;
  name: string;
  sets: number;
  repRange: string;
  groupIds: string[];
}

interface WorkoutGroup {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  exercises: Exercise[];
}

interface TemplatesPageProps {
  templates: Template[];
  setTemplates: (t: Template[]) => void;
  tasks: string[];
  setTasks: (t: string[]) => void;
  exercises: Exercise[];
  setExercises: (e: Exercise[]) => void;
  workoutGroups: WorkoutGroup[];
  setWorkoutGroups: (g: WorkoutGroup[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REP_PRESETS = ["3-5", "6-8", "8-10", "8-12", "10-12", "12-15", "15-20"];

// ─── Shared style helpers ─────────────────────────────────────────────────────

const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "8px 10px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  background: COLORS.inner,
  color: COLORS.text,
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box",
  width: "100%",
  ...extra,
});

const accentBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "7px 16px",
  borderRadius: 8,
  border: "none",
  background: COLORS.accent,
  color: COLORS.text,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  ...extra,
});

const ghostBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "7px 16px",
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: "transparent",
  color: COLORS.dim,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  ...extra,
});

const colStyle: React.CSSProperties = {
  background: COLORS.card,
  borderRadius: 12,
  border: `1px solid ${COLORS.border}`,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  height: "100%",
};

const colHeader = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "14px 16px 10px",
  borderBottom: `1px solid ${COLORS.border}`,
  flexShrink: 0,
  ...extra,
});

const colBody: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "10px 12px",
  position: "relative",
};

// ─── Workout Popup ────────────────────────────────────────────────────────────

interface WorkoutPopupProps {
  initial?: Exercise;
  groups: WorkoutGroup[];
  onSave: (ex: Exercise) => void;
  onClose: () => void;
}

function GroupSearch({ groups, selectedIds, onSelect }: {
  groups: WorkoutGroup[];
  selectedIds: string[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = query.trim()
    ? groups.filter(g => !selectedIds.includes(g.id) && g.name.toLowerCase().startsWith(query.toLowerCase()))
    : [];
  return (
    <div style={{ position: "relative" }}>
      <input
        style={inp({ fontSize: 13 })}
        placeholder="Type to search groups…"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: 8, marginTop: 4, zIndex: 10,
          maxHeight: 4 * 37, overflowY: "auto", position: "absolute" as any,
        }}>
          {matches.map((g, i) => (
            <div key={g.id}
              onMouseDown={() => { onSelect(g.id); setQuery(""); setOpen(false); }}
              style={{
                padding: "8px 12px", cursor: "pointer", fontSize: 13,
                borderBottom: `1px solid ${COLORS.border}`,
                maskImage: i === 3 && matches.length > 4 ? "linear-gradient(to bottom, black 30%, transparent 100%)" : "none",
                WebkitMaskImage: i === 3 && matches.length > 4 ? "linear-gradient(to bottom, black 30%, transparent 100%)" : "none",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = COLORS.inner}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
            >
              {g.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutPopup({ initial, groups, onSave, onClose }: WorkoutPopupProps) {
  const [name, setName]         = useState(initial?.name ?? "");
  const [sets, setSets]         = useState(initial?.sets ?? 3);
  const [repRange, setRepRange] = useState(initial?.repRange ?? "8-12");
  const [selGroups, setSelGroups] = useState<string[]>(initial?.groupIds ?? []);

  const toggleGroup = (id: string) =>
    setSelGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? generateId(),
      name: name.trim(),
      sets,
      repRange,
      groupIds: selGroups,
    });
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
  };
  const modal: React.CSSProperties = {
    background: COLORS.card, borderRadius: 14, padding: 24, width: 420,
    border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 16,
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
          {initial ? "Edit Workout" : "New Workout"}
        </h3>

        {/* Name */}
        <div>
          <label style={{ fontSize: 12, color: COLORS.dim, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Exercise Name</label>
          <input style={inp()} placeholder="e.g. Bench Press" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>

        {/* Sets */}
        <div>
          <label style={{ fontSize: 12, color: COLORS.dim, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Sets</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setSets(s => Math.max(1, s - 1))} style={{ ...accentBtn(), padding: "6px 14px", fontSize: 16 }}>−</button>
            <span style={{ fontSize: 16, fontWeight: 600, minWidth: 24, textAlign: "center" }}>{sets}</span>
            <button onClick={() => setSets(s => s + 1)} style={{ ...accentBtn(), padding: "6px 14px", fontSize: 16 }}>+</button>
          </div>
        </div>

        {/* Rep range */}
        <div>
          <label style={{ fontSize: 12, color: COLORS.dim, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Goal Rep Range</label>
          <select value={repRange} onChange={e => setRepRange(e.target.value)} style={inp({ padding: "8px 10px" })}>
            {REP_PRESETS.map(r => <option key={r} value={r}>{r} reps</option>)}
          </select>
        </div>

        {/* Groups */}
        <div>
          <label style={{ fontSize: 12, color: COLORS.dim, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Groups</label>
          {/* Selected group tags */}
          {selGroups.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {selGroups.map(gid => {
                const g = groups.find(x => x.id === gid);
                if (!g) return null;
                return (
                  <div key={gid} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 20,
                    background: COLORS.accent, color: COLORS.text,
                    fontSize: 13, fontWeight: 500,
                  }}>
                    {g.name}
                    <button onClick={() => setSelGroups(prev => prev.filter(id => id !== gid))} style={{
                      background: "none", border: "none", color: COLORS.text,
                      cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1,
                      display: "flex", alignItems: "center",
                    }}>×</button>
                  </div>
                );
              })}
            </div>
          )}
          {/* Typeahead input */}
          <GroupSearch
            groups={groups}
            selectedIds={selGroups}
            onSelect={id => setSelGroups(prev => prev.includes(id) ? prev : [...prev, id])}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ghostBtn()}>Cancel</button>
          <button onClick={handleSave} style={accentBtn()}>
            {initial ? "Save Changes" : "Add Workout"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Template exercise row helpers ───────────────────────────────────────────

function TemplateExRow({ ex, tid, i, total, onMove, onUpdate, onRemove }: {
  ex: Exercise; tid: string; i: number; total: number;
  onMove: (dir: number) => void;
  onUpdate: <K extends keyof Exercise>(key: K, val: Exercise[K]) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "20px 1fr 88px 130px 20px",
      gap: 8, padding: "9px 10px", background: COLORS.inner,
      borderRadius: 8, marginBottom: 5, alignItems: "center",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
        <button onClick={() => onMove(-1)} disabled={i === 0} style={{ background: "none", border: "none", color: i === 0 ? COLORS.border : COLORS.dim, cursor: i === 0 ? "default" : "pointer", fontSize: 9, padding: 1 }}>▲</button>
        <button onClick={() => onMove(1)}  disabled={i === total - 1} style={{ background: "none", border: "none", color: i === total - 1 ? COLORS.border : COLORS.dim, cursor: i === total - 1 ? "default" : "pointer", fontSize: 9, padding: 1 }}>▼</button>
      </div>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{ex.name}</span>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <button onClick={() => onUpdate("sets", Math.max(1, ex.sets - 1))} style={{ background: COLORS.border, border: "none", color: COLORS.text, borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 13, lineHeight: 1 }}>−</button>
        <span style={{ fontSize: 12, minWidth: 16, textAlign: "center" }}>{ex.sets}</span>
        <button onClick={() => onUpdate("sets", ex.sets + 1)} style={{ background: COLORS.border, border: "none", color: COLORS.text, borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 13, lineHeight: 1 }}>+</button>
      </div>
      <select
        value={ex.repRange}
        onChange={e => onUpdate("repRange", e.target.value)}
        style={{ ...inp({ padding: "4px 6px", fontSize: 12, width: "100%" }) }}
      >
        {REP_PRESETS.map(r => <option key={r} value={r}>{r} reps</option>)}
      </select>
      <button onClick={onRemove} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 14, padding: 0, textAlign: "center" }}>✕</button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TemplatesPage({
  templates, setTemplates,
  tasks, setTasks,
  exercises: exercisesProp = [], setExercises,
  workoutGroups = [], setWorkoutGroups,
}: TemplatesPageProps) {

  // Template state
  const DEFAULT_GROUPS: WorkoutGroup[] = [
    { id: "g-chest", name: "Chest" },
    { id: "g-back", name: "Back" },
    { id: "g-legs", name: "Legs" },
    { id: "g-biceps", name: "Biceps" },
    { id: "g-triceps", name: "Triceps" },
    { id: "g-shoulders", name: "Shoulders" },
  ];

  const CHEST_NAMES = ["Bench Press","Incline Bench Press","Chest Fly","Dips","Push-ups","Incline Dumbbell Press","Cable Fly","Decline Bench Press"];
  const BACK_NAMES = ["Pull-ups","Lat Pulldown","Barbell Row","Dumbbell Row","Seated Row","T-Bar Row","Face Pulls","Deadlift","Rear Delt Fly"];
  const LEGS_NAMES = ["Squat","Front Squat","Leg Press","Leg Extension","Leg Curl","Romanian Deadlift","Lunges","Bulgarian Split Squat","Calf Raise"];
  const BICEPS_NAMES = ["Barbell Curl","Dumbbell Curl","Hammer Curl","Preacher Curl","Cable Curl","Concentration Curl"];
  const TRICEPS_NAMES = ["Tricep Pushdown","Skull Crushers","Close Grip Bench","Overhead Extension","Dips","Tricep Kickback"];
  const SHOULDERS_NAMES = ["Overhead Press","Lateral Raise","Front Raise","Arnold Press","Shrugs","Upright Row","Face Pulls"];

  const getGroupIds = (name: string) => {
    const ids: string[] = [];
    if (CHEST_NAMES.includes(name)) ids.push("g-chest");
    if (BACK_NAMES.includes(name)) ids.push("g-back");
    if (LEGS_NAMES.includes(name)) ids.push("g-legs");
    if (BICEPS_NAMES.includes(name)) ids.push("g-biceps");
    if (TRICEPS_NAMES.includes(name)) ids.push("g-triceps");
    if (SHOULDERS_NAMES.includes(name)) ids.push("g-shoulders");
    return ids;
  };

  const defaultExercises: Exercise[] = exercisesProp.length > 0 ? exercisesProp : (() => {
    const seen = new Set<string>();
    return templates.flatMap(t => t.exercises ?? []).filter(ex => {
      if (seen.has(ex.name)) return false;
      seen.add(ex.name); return true;
    }).map(ex => ({ ...ex, id: ex.id ?? generateId(), groupIds: getGroupIds(ex.name) }));
  })();
  const [exercises, setExercisesState] = useState<Exercise[]>(defaultExercises);
  const wrappedSetExercises = (e: Exercise[]) => { setExercisesState(e); setExercises?.(e); };

  const [editingId, setEditingId]     = useState<string | null>(null);
  const [newName, setNewName]         = useState("");
  const [showCreate, setShowCreate]   = useState(false);
  const [createName, setCreateName]   = useState("");
  const [showExPicker, setShowExPicker] = useState(false);

  // Workout state
  const [showWorkoutPopup, setShowWorkoutPopup] = useState(false);
  const [editingExercise, setEditingExercise]   = useState<Exercise | null>(null);
  const [newGroupName, setNewGroupName]         = useState<{ [id: string]: string }>({});
  const [addingGroup, setAddingGroup]           = useState(false);
  const [pendingGroupId, setPendingGroupId]     = useState<string | null>(null);
  const [groupNameError, setGroupNameError]     = useState<string | null>(null);

  // ── Template helpers ────────────────────────────────────────────────────────

  const createTemplate = () => {
    if (!createName.trim()) return;
    const t: Template = { id: generateId(), name: createName.trim(), exercises: [] };
    setTemplates([...templates, t]);
    setCreateName(""); setShowCreate(false); setEditingId(t.id);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const renameTemplate = (id: string) => {
    if (!newName.trim()) return;
    setTemplates(templates.map(t => t.id === id ? { ...t, name: newName.trim() } : t));
    setNewName("");
  };

  const updateTplExs = (tid: string, fn: (exs: Exercise[]) => Exercise[]) =>
    setTemplates(templates.map(t => t.id !== tid ? t : { ...t, exercises: fn(t.exercises) }));

  const addExToTemplate = (tid: string, ex: Exercise) => {
    updateTplExs(tid, exs => [...exs, { ...ex }]);
    setShowExPicker(false);
  };

  const moveTplEx = (tid: string, i: number, dir: number) =>
    updateTplExs(tid, exs => {
      const j = i + dir;
      if (j < 0 || j >= exs.length) return exs;
      const next = [...exs]; [next[i], next[j]] = [next[j], next[i]]; return next;
    });

  const updateTplExField = <K extends keyof Exercise>(tid: string, i: number, key: K, val: Exercise[K]) =>
    updateTplExs(tid, exs => exs.map((ex, idx) => idx === i ? { ...ex, [key]: val } : ex));

  // ── Exercise/Workout helpers ────────────────────────────────────────────────

  const saveExercise = (ex: Exercise) => {
    if (editingExercise) {
      wrappedSetExercises(exercises.map(e => e.id === ex.id ? ex : e));
      setTemplates(templates.map(t => ({
        ...t,
        exercises: t.exercises.map(e => e.id === ex.id ? { ...e, name: ex.name, sets: ex.sets, repRange: ex.repRange } : e),
      })));
    } else {
      wrappedSetExercises([...exercises, ex]);
    }
    setShowWorkoutPopup(false);
    setEditingExercise(null);
  };

  const [localGroups, setLocalGroups] = useState<WorkoutGroup[]>(workoutGroups.length > 0 ? workoutGroups : DEFAULT_GROUPS);
  const updateGroups = (g: WorkoutGroup[]) => { setLocalGroups(g); setWorkoutGroups?.(g); };

  const addGroup = () => {
    const id = generateId();
    updateGroups([...localGroups, { id, name: "" }]);
    setPendingGroupId(id);
    setAddingGroup(false);
  };

  const saveGroupName = (id: string) => {
    const name = (newGroupName[id] ?? "").trim();
    if (!name) { updateGroups(localGroups.filter(g => g.id !== id)); setGroupNameError(null); setPendingGroupId(null); return; }
    const isDupe = localGroups.some(g => g.id !== id && g.name.toLowerCase() === name.toLowerCase());
    if (isDupe) { setGroupNameError(`"${name}" already exists`); return; }
    setGroupNameError(null);
    updateGroups(localGroups.map(g => g.id === id ? { ...g, name } : g));
    setPendingGroupId(null);
  };

  const cancelGroupName = (id: string) => {
    updateGroups(localGroups.filter(g => g.id !== id));
    setGroupNameError(null);
    setPendingGroupId(null);
  };

  // ── Layout ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", overflow: "hidden", padding: "0 0 12px", boxSizing: "border-box" }}>

      {/* Page title */}
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 20px", flexShrink: 0 }}>
        Templates
      </h1>

      {/* Popup */}
      {showWorkoutPopup && (
        <WorkoutPopup
          initial={editingExercise ?? undefined}
          groups={localGroups}
          onSave={saveExercise}
          onClose={() => { setShowWorkoutPopup(false); setEditingExercise(null); }}
        />
      )}

      {/* 3-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>

        {/* ═══════════════════════════════════════════════════════════════════
            COL 1 — Daily Tasks
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={colStyle}>
          <div style={colHeader()}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Daily Tasks</h2>
            <p style={{ color: COLORS.dim, fontSize: 11, margin: "4px 0 0" }}>Appear every day on home screen</p>
          </div>
          <div style={colBody}>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {tasks.map((task, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: COLORS.dim, fontSize: 13, minWidth: 18 }}>{i + 1}.</span>
                  <input
                    style={inp({ padding: "6px 8px", fontSize: 13 })}
                    placeholder={`Task ${i + 1}…`}
                    value={task}
                    onChange={e => { const u = [...tasks]; u[i] = e.target.value; setTasks(u); }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            COL 2 — Session Templates
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={colStyle}>
          <div style={colHeader()}>
            <h2 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700 }}>Session Templates</h2>
            <button onClick={() => setShowCreate(true)} style={accentBtn({ width: "100%", fontSize: 13 })}>+ New Template</button>
          </div>
          <div style={colBody}>
            {/* Create form */}
            {showCreate && (
              <div style={{ background: COLORS.inner, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <input
                  style={inp()}
                  placeholder="Template name…"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createTemplate()}
                  autoFocus
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={createTemplate} style={accentBtn({ fontSize: 12 })}>Create</button>
                  <button onClick={() => setShowCreate(false)} style={ghostBtn({ fontSize: 12 })}>Cancel</button>
                </div>
              </div>
            )}

            {/* Template cards */}
            {templates.filter(t => t.id !== "rest").map(template => {
              const isEditing = editingId === template.id;
              return (
                <div key={template.id} style={{ background: COLORS.inner, borderRadius: 10, padding: 12, marginBottom: 8, border: `1px solid ${COLORS.border}` }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{template.name}</span>
                      <span style={{ color: COLORS.dim, fontSize: 12, marginLeft: 8 }}>
                        {template.exercises.length} exercise{template.exercises.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setEditingId(isEditing ? null : template.id); setShowExPicker(false); }} style={isEditing ? accentBtn({ fontSize: 12, padding: "5px 10px" }) : ghostBtn({ fontSize: 12, padding: "5px 10px" })}>
                        {isEditing ? "Done" : "Edit"}
                      </button>
                      <button onClick={() => deleteTemplate(template.id)} style={ghostBtn({ fontSize: 12, padding: "5px 10px", color: COLORS.red, borderColor: "transparent" })}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Edit body */}
                  {isEditing && (
                    <div style={{ marginTop: 12 }}>
                      {/* Rename */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        <input style={inp({ flex: "1" as any })} placeholder="Rename…" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && renameTemplate(template.id)} />
                        <button onClick={() => renameTemplate(template.id)} style={accentBtn({ fontSize: 12, padding: "6px 10px" })}>Rename</button>
                      </div>

                      {/* Column headers */}
                      {template.exercises.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "20px 1fr 88px 130px 20px", gap: 8, padding: "0 10px 4px" }}>
                          <span /><span style={{ fontSize: 10, color: COLORS.dim, fontWeight: 700, textTransform: "uppercase" }}>Exercise</span>
                          <span style={{ fontSize: 10, color: COLORS.dim, fontWeight: 700, textTransform: "uppercase", textAlign: "center" }}>Sets</span>
                          <span style={{ fontSize: 10, color: COLORS.dim, fontWeight: 700, textTransform: "uppercase", textAlign: "center" }}>Reps</span>
                          <span />
                        </div>
                      )}

                      {/* Exercises */}
                      {template.exercises.map((ex, i) => (
                        <TemplateExRow
                          key={i} ex={ex} tid={template.id} i={i} total={template.exercises.length}
                          onMove={dir => moveTplEx(template.id, i, dir)}
                          onUpdate={(key, val) => updateTplExField(template.id, i, key, val)}
                          onRemove={() => updateTplExs(template.id, exs => exs.filter((_, idx) => idx !== i))}
                        />
                      ))}

                      {/* Exercise picker */}
                      {showExPicker ? (
                        <div style={{ background: COLORS.card, borderRadius: 8, padding: 12, marginTop: 8, border: `1px solid ${COLORS.border}` }}>
                          <p style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.dim }}>Select an exercise to add:</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {exercises.map(ex => (
                              <button key={ex.id} onClick={() => addExToTemplate(template.id, ex)} style={{
                                padding: "5px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`,
                                background: COLORS.inner, color: COLORS.text, cursor: "pointer", fontSize: 12,
                              }}>
                                {ex.name}
                              </button>
                            ))}
                          </div>
                          {exercises.length === 0 && <p style={{ fontSize: 12, color: COLORS.dim, margin: 0 }}>No exercises yet — add some in the Workouts panel.</p>}
                          <button onClick={() => setShowExPicker(false)} style={ghostBtn({ marginTop: 10, fontSize: 12 })}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowExPicker(true)} style={{ ...ghostBtn(), width: "100%", marginTop: 8, borderStyle: "dashed" }}>
                          + Add Exercise
                        </button>
                      )}

                      
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            COL 3 — Workouts (split into group | exercises sub-columns)
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={colStyle}>
          {/* Header */}
          <div style={colHeader()}>
            <h2 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700 }}>Workouts</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: 8 }}>
              <button onClick={addGroup} style={accentBtn({ width: "100%", whiteSpace: "nowrap" })}>+ New Group</button>
              <button onClick={() => { setEditingExercise(null); setShowWorkoutPopup(true); }} style={accentBtn({ width: "100%" })}>+ New Workout</button>
            </div>
          </div>

          {/* 2D grouped table */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.card, zIndex: 1 }}>
              <div style={{ padding: "8px 12px", fontSize: 10, color: COLORS.dim, fontWeight: 700, textTransform: "uppercase", borderRight: `1px solid ${COLORS.border}` }}>Group</div>
              <div style={{ padding: "8px 12px", fontSize: 10, color: COLORS.dim, fontWeight: 700, textTransform: "uppercase" }}>Exercises</div>
            </div>

            {/* Group rows */}
            {localGroups.map(g => {
              const groupExs = exercises.filter(ex => ex.groupIds.includes(g.id));
              return (
                <div key={g.id} style={{ display: "grid", gridTemplateColumns: "140px 1fr", borderBottom: `1px solid ${COLORS.border}`, minHeight: 44 }}>
                  {/* Group name cell */}
                  <div style={{ padding: "10px 12px", borderRight: `1px solid ${COLORS.border}`, display: "flex", alignItems: "flex-start" }}>
                    {pendingGroupId === g.id ? (
                    <div style={{ width: "100%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ position: "relative", flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget.querySelector(".cancel-tip") as HTMLElement).style.opacity = "1"}
                          onMouseLeave={e => (e.currentTarget.querySelector(".cancel-tip") as HTMLElement).style.opacity = "0"}
                        >
                          <button
                            onClick={() => cancelGroupName(g.id)}
                            style={{ background: "none", border: "none", color: COLORS.dim, cursor: "pointer", fontSize: 16, padding: "0 2px", lineHeight: 1 }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = COLORS.red}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = COLORS.dim}
                          >×</button>
                          <div className="cancel-tip" style={{
                            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                            marginBottom: 4, background: COLORS.inner, border: `1px solid ${COLORS.border}`,
                            borderRadius: 8, padding: "4px 8px", fontSize: 11, color: COLORS.dim,
                            whiteSpace: "nowrap", pointerEvents: "none", opacity: 0,
                            transition: "opacity 0.15s", zIndex: 10,
                          }}>Cancel</div>
                        </div>
                        <input
                          style={inp({ fontSize: 12, padding: "4px 6px" })}
                          placeholder="Group name…"
                          autoFocus
                          value={newGroupName[g.id] ?? ""}
                          onChange={e => { setNewGroupName(prev => ({ ...prev, [g.id]: e.target.value })); setGroupNameError(null); }}
                          onKeyDown={e => e.key === "Enter" && saveGroupName(g.id)}
                        />
                      </div>
                      {groupNameError && pendingGroupId === g.id && (
                        <div style={{ fontSize: 11, color: COLORS.red, marginTop: 4, paddingLeft: 22 }}>{groupNameError}</div>
                      )}
                    </div>
                    ) : (
                      <span
                        onClick={() => { setPendingGroupId(g.id); setNewGroupName(prev => ({ ...prev, [g.id]: g.name })); }}
                        style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget as HTMLSpanElement).style.color = COLORS.accent}
                        onMouseLeave={e => (e.currentTarget as HTMLSpanElement).style.color = COLORS.text}
                      >
                        {g.name}
                      </span>
                    )}
                  </div>
                  {/* Exercises cell */}
                  <div style={{ padding: "8px 10px", display: "flex", flexWrap: "wrap", gap: 5, alignContent: "flex-start" }}>
                    {groupExs.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => { setEditingExercise(ex); setShowWorkoutPopup(true); }}
                        style={{
                          padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`,
                          background: COLORS.inner, color: COLORS.text, cursor: "pointer",
                          fontSize: 12, fontWeight: 500, transition: "border-color 0.15s, color 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.text; }}
                      >
                        {ex.name}
                      </button>
                    ))}
                    {groupExs.length === 0 && <span style={{ fontSize: 12, color: COLORS.dim }}>No exercises</span>}
                  </div>
                </div>
              );
            })}

            {/* Ungrouped */}
            {(() => {
              const ungrouped = exercises.filter(ex => ex.groupIds.length === 0);
              if (ungrouped.length === 0) return null;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", borderBottom: `1px solid ${COLORS.border}`, minHeight: 44 }}>
                  <div style={{ padding: "10px 12px", borderRight: `1px solid ${COLORS.border}` }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.dim }}>Ungrouped</span>
                  </div>
                  <div style={{ padding: "8px 10px", display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {ungrouped.map(ex => (
                      <button key={ex.id} onClick={() => { setEditingExercise(ex); setShowWorkoutPopup(true); }}
                        style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: COLORS.inner, color: COLORS.text, cursor: "pointer", fontSize: 12, fontWeight: 500 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.text; }}
                      >{ex.name}</button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}