"use client";
import { useState } from "react";
import {
  COLORS, generateId,
  EQUIPMENT_PRESETS, DEFAULT_DATA_FIELDS, OPTIONAL_DATA_FIELDS,
} from "../constants";
import type { Variant, DataField, Subvariant } from "../constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise {
  id: string;
  name: string;
  sets: number;
  repRange: string;
  groupIds: string[];
  variants: Variant[];
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

// ─── Edit Workout Modal ───────────────────────────────────────────────────────

interface WorkoutPopupProps {
  initial?: Exercise;
  groups: WorkoutGroup[];
  onSave: (ex: Exercise) => void;
  onClose: () => void;
  onMerge?: (ex: Exercise) => void;
  onDelete?: (ex: Exercise) => void;
}

// Variant color palette for chart lines (used later in SessionPage too)
export const VARIANT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#a29bfe", "#fd79a8", "#00cec9", "#e17055",
];

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
          maxHeight: 4 * 37, overflowY: "auto",
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

function WorkoutPopup({ initial, groups, onSave, onClose, onMerge, onDelete }: WorkoutPopupProps) {
  const [name, setName]           = useState(initial?.name ?? "");
  const [selGroups, setSelGroups] = useState<string[]>(initial?.groupIds ?? []);
  const initialVariants: Variant[] = initial?.variants?.length ? initial.variants : [];

  const [variants, setVariants]           = useState<Variant[]>(initialVariants);
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(
    initialVariants.find(v => v.isDefault)?.id ?? initialVariants[0]?.id ?? null
  );
  const [expandedSubvariantId, setExpandedSubvariantId] = useState<string | null>(null);
  const [customVariantName, setCustomVariantName]       = useState("");
  const [showAddVariant, setShowAddVariant]             = useState(initialVariants.length === 0);
  const [mode, setMode] = useState<"standard" | "multi">(
    initial?.variants?.length === 1 && initial.variants[0].name === "Standard"
      ? "standard"
      : initial?.variants?.length
      ? "multi"
      : "standard"
  );
  const [stdSets, setStdSets]             = useState(initial?.sets ?? 3);
  const [stdRepRange, setStdRepRange]     = useState(initial?.repRange ?? "8-12");
  const [stdDataFields, setStdDataFields] = useState<DataField[]>([...DEFAULT_DATA_FIELDS]);

  // ── variant helpers ──────────────────────────────────────────────────────

  const alreadyAdded = variants.map(v => v.name);

  const addVariant = (vname: string) => {
    if (alreadyAdded.includes(vname)) return;
    const isFirst = variants.length === 0;
    const defaultV = variants.find(v => v.isDefault);
    const newV: Variant = {
      id: generateId(), name: vname, isDefault: isFirst,
      order: variants.length, sets: defaultV?.sets ?? 3,
      repRange: defaultV?.repRange ?? "8-12",
      dataFields: [...DEFAULT_DATA_FIELDS],
    };
    setVariants(prev => [...prev, newV]);
    setExpandedVariantId(isFirst ? newV.id : expandedVariantId);
    setShowAddVariant(false);
    setCustomVariantName("");
  };

  const removeVariant = (id: string) => {
    const remaining = variants.filter(v => v.id !== id);
    if (remaining.length === 0) return;
    // If we removed the default, promote first remaining
    const hasDefault = remaining.some(v => v.isDefault);
    setVariants(hasDefault ? remaining : remaining.map((v, i) => ({ ...v, isDefault: i === 0 })));
  };

  const makeDefault = (id: string) => {
    setVariants(prev => {
      const updated = prev.map(v => ({ ...v, isDefault: v.id === id }));
      // Move default to top
      const def = updated.find(v => v.isDefault)!;
      const rest = updated.filter(v => !v.isDefault).map((v, i) => ({ ...v, order: i + 1 }));
      return [{ ...def, order: 0 }, ...rest];
    });
  };

  const moveVariant = (id: string, dir: number) => {
    setVariants(prev => {
      const arr = [...prev];
      const i = arr.findIndex(v => v.id === id);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr.map((v, idx) => ({ ...v, order: idx }));
    });
  };

  const updateVariant = (id: string, patch: Partial<Variant>) =>
    setVariants(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v));

  // ── subvariant helpers ───────────────────────────────────────────────────

  const addSubvariant = (variantId: string, subName: string) => {
    setVariants(prev => prev.map(v => {
      if (v.id !== variantId) return v;
      const subs = v.subvariants ?? [];
      const newSub: Subvariant = {
        id: generateId(), name: subName,
        isDefault: subs.length === 0,
        order: subs.length,
      };
      return { ...v, subvariants: [...subs, newSub] };
    }));
  };

  const removeSubvariant = (variantId: string, subId: string) => {
    setVariants(prev => prev.map(v => {
      if (v.id !== variantId) return v;
      const remaining = (v.subvariants ?? []).filter(s => s.id !== subId);
      const hasDefault = remaining.some(s => s.isDefault);
      return {
        ...v,
        subvariants: hasDefault ? remaining : remaining.map((s, i) => ({ ...s, isDefault: i === 0 })),
      };
    }));
  };

  const makeSubDefault = (variantId: string, subId: string) => {
    setVariants(prev => prev.map(v => {
      if (v.id !== variantId) return v;
      return {
        ...v,
        subvariants: (v.subvariants ?? []).map(s => ({ ...s, isDefault: s.id === subId })),
      };
    }));
  };

  // ── data field helpers ───────────────────────────────────────────────────

  const addDataField = (variantId: string, field: DataField) => {
    setVariants(prev => prev.map(v =>
      v.id !== variantId ? v : { ...v, dataFields: [...v.dataFields, field] }
    ));
  };

  const removeDataField = (variantId: string, fieldId: string) => {
    setVariants(prev => prev.map(v =>
      v.id !== variantId ? v : {
        ...v, dataFields: v.dataFields.filter(f =>
          f.id !== fieldId && !["weight","reps"].includes(f.id) // protect Weight + Reps
        )
      }
    ));
  };

  // ── save ─────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!name.trim()) return;
    if (mode === "standard") {
      onSave({
        id: initial?.id ?? generateId(),
        name: name.trim(),
        sets: stdSets,
        repRange: stdRepRange,
        groupIds: selGroups,
        variants: [{
          id: generateId(), name: "Standard", isDefault: true, order: 0,
          sets: stdSets, repRange: stdRepRange, dataFields: stdDataFields,
        }],
      });
    } else {
      const defaultV = variants.find(v => v.isDefault) ?? variants[0];
      onSave({
        id: initial?.id ?? generateId(),
        name: name.trim(),
        sets: defaultV?.sets ?? 3,
        repRange: defaultV?.repRange ?? "8-12",
        groupIds: selGroups,
        variants,
      });
    }
  };

  // ── styles ────────────────────────────────────────────────────────────────

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  };
  const modal: React.CSSProperties = {
    background: COLORS.card, borderRadius: 14, padding: 24,
    width: 500, maxHeight: "85vh", overflowY: "auto",
    border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 16,
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 12, color: COLORS.dim, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 0.5,
  };
  const pill = (active: boolean, color?: string): React.CSSProperties => ({
    padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
    border: active ? "none" : `1px solid ${COLORS.border}`,
    background: active ? (color ?? COLORS.accent) : "transparent",
    color: active ? "#fff" : COLORS.dim,
    cursor: "pointer",
  });

  return (
    <div style={overlay}>
      <div style={modal} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            {initial ? "Edit Workout" : "New Workout"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.dim, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* ── Exercise Name ── */}
        <div>
          <label style={{ ...sectionLabel, display: "block", marginBottom: 6 }}>Exercise Name</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input style={inp({ flex: "1" as any, width: "auto" })} placeholder="e.g. Bench Press" value={name} onChange={e => setName(e.target.value)} autoFocus />
            {initial && onDelete && (
              <button
                onClick={() => onDelete(initial)}
                style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.red}`, background: "transparent", color: COLORS.red, cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" as const, flexShrink: 0 }}
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* ── Mode Toggle ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
          <button
            onClick={() => setMode("standard")}
            style={{ padding: "10px", border: "none", background: mode === "standard" ? COLORS.accent : COLORS.inner, color: mode === "standard" ? "#fff" : COLORS.dim, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >
            Standard
          </button>
          <button
            onClick={() => setMode("multi")}
            style={{ padding: "10px", border: "none", borderLeft: `1px solid ${COLORS.border}`, background: mode === "multi" ? COLORS.accent : COLORS.inner, color: mode === "multi" ? "#fff" : COLORS.dim, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >
            Multi-Variant
          </button>
        </div>

        {/* ── Standard Mode ── */}
        {mode === "standard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ ...sectionLabel, marginBottom: 4 }}>Sets</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setStdSets(s => Math.max(1, s - 1))} style={{ background: COLORS.border, border: "none", color: COLORS.text, borderRadius: 4, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>−</button>
                  <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{stdSets}</span>
                  <button onClick={() => setStdSets(s => s + 1)} style={{ background: COLORS.border, border: "none", color: COLORS.text, borderRadius: 4, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>+</button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...sectionLabel, marginBottom: 4 }}>Rep Range</div>
                <select value={stdRepRange} onChange={e => setStdRepRange(e.target.value)} style={inp({ padding: "5px 8px", fontSize: 12 })}>
                  {REP_PRESETS.map(r => <option key={r} value={r}>{r} reps</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={{ ...sectionLabel, marginBottom: 6 }}>Data Fields</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                {stdDataFields.map(f => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, background: COLORS.inner, border: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                    {f.name}{f.unit ? ` (${f.unit})` : ""}
                    {!["weight","reps"].includes(f.id) && (
                      <button onClick={() => setStdDataFields(prev => prev.filter(df => df.id !== f.id))} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
                    )}
                  </div>
                ))}
                <CustomFieldAdder onAdd={fieldName => setStdDataFields(prev => [...prev, { id: generateId(), name: fieldName, type: "custom" as const }])} />
              </div>
            </div>
          </div>
        )}

        {/* ── Multi-Variant Mode ── */}
        {mode === "multi" && <div>
          <div style={{ marginBottom: 8 }}>
            <label style={sectionLabel}>Variants</label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {variants.map((v, vi) => {
              const isExpanded = expandedVariantId === v.id;
              const hasSubs = (v.subvariants?.length ?? 0) > 0;

              return (
                <div key={v.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>

                  {/* ── Variant header row ── */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: COLORS.inner }}>

                    

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedVariantId(isExpanded ? null : v.id)}
                      style={{ background: "none", border: "none", color: COLORS.dim, cursor: "pointer", fontSize: 11, padding: 0, minWidth: 12 }}
                    >
                      {isExpanded ? "▲" : "▽"}
                    </button>

                    {/* Name */}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                      {v.name}
                      {v.isDefault && <span style={{ marginLeft: 8, fontSize: 11, color: COLORS.accent, fontWeight: 400 }}>default</span>}
                    </span>

                    {/* Edit mode controls */}
                    {!v.isDefault && (
                      <button onClick={() => makeDefault(v.id)} style={ghostBtn({ padding: "3px 8px", fontSize: 11 })}>
                        Make Default
                      </button>
                    )}
                    {(
                      <button
                        onClick={() => removeVariant(v.id)}
                        disabled={variants.length === 1}
                        style={{ background: "none", border: "none", color: variants.length === 1 ? COLORS.border : COLORS.red, cursor: variants.length === 1 ? "default" : "pointer", fontSize: 14, padding: "0 2px" }}
                      >×</button>
                    )}
                  </div>

                  {/* ── Expanded body ── */}
                  {isExpanded && (
                    <div style={{ padding: "10px 12px", background: COLORS.card, display: "flex", flexDirection: "column", gap: 10 }}>

                      {/* Subvariants */}
                      <div>
                          {(v.subvariants?.length ?? 0) > 0 && <div style={{ ...sectionLabel, marginBottom: 6 }}>Sub-variants</div>}
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {(v.subvariants ?? []).map(sub => (
                              <div key={sub.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 2 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: COLORS.inner }}>
                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                                  <SubNameInput
                                    currentName={sub.name}
                                    existingNames={(v.subvariants ?? []).map(s => s.name).filter(Boolean)}
                                    onSave={newName => {
                                      setVariants(prev => prev.map(pv => pv.id !== v.id ? pv : {
                                        ...pv,
                                        subvariants: (pv.subvariants ?? []).map(s => s.id === sub.id ? { ...s, name: newName } : s)
                                      }));
                                    }}
                                  />
                                  {sub.isDefault && <span style={{ fontSize: 11, color: COLORS.accent }}>default</span>}
                                </div>
                                {!sub.isDefault && (
                                  <button onClick={() => makeSubDefault(v.id, sub.id)} style={ghostBtn({ padding: "2px 6px", fontSize: 10 })}>
                                    Make Default
                                  </button>
                                )}
                                <button
                                  onClick={() => removeSubvariant(v.id, sub.id)}
                                  disabled={!sub.name}
                                  title={!sub.name ? "Name this sub-variant before deleting" : "Remove"}
                                  style={{ background: "none", border: "none", color: !sub.name ? COLORS.border : COLORS.red, cursor: !sub.name ? "default" : "pointer", fontSize: 13, padding: 0 }}
                                >×</button>
                              </div>
                              {/* Sub-variant sets + data fields */}
                              <div style={{ padding: "8px 10px", background: COLORS.card, display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${COLORS.border}` }}>
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                  <div>
                                    <div style={{ fontSize: 10, color: COLORS.dim, fontWeight: 700, textTransform: "uppercase" as const, marginBottom: 4 }}>Sets</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                      <button onClick={() => setVariants(prev => prev.map(pv => pv.id !== v.id ? pv : { ...pv, subvariants: (pv.subvariants ?? []).map(s => s.id === sub.id ? { ...s, sets: Math.max(1, (s.sets ?? v.sets) - 1) } : s) }))} style={{ background: COLORS.border, border: "none", color: COLORS.text, borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 13 }}>−</button>
                                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 18, textAlign: "center" as const }}>{sub.sets ?? v.sets}</span>
                                      <button onClick={() => setVariants(prev => prev.map(pv => pv.id !== v.id ? pv : { ...pv, subvariants: (pv.subvariants ?? []).map(s => s.id === sub.id ? { ...s, sets: (s.sets ?? v.sets) + 1 } : s) }))} style={{ background: COLORS.border, border: "none", color: COLORS.text, borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 13 }}>+</button>
                                    </div>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 10, color: COLORS.dim, fontWeight: 700, textTransform: "uppercase" as const, marginBottom: 4 }}>Rep Range</div>
                                    <select value={sub.repRange ?? v.repRange} onChange={e => setVariants(prev => prev.map(pv => pv.id !== v.id ? pv : { ...pv, subvariants: (pv.subvariants ?? []).map(s => s.id === sub.id ? { ...s, repRange: e.target.value } : s) }))} style={inp({ padding: "4px 6px", fontSize: 11 })}>
                                      {REP_PRESETS.map(r => <option key={r} value={r}>{r} reps</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: COLORS.dim, fontWeight: 700, textTransform: "uppercase" as const, marginBottom: 4 }}>Data Fields</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                                    {(sub.dataFields ?? v.dataFields).map(f => (
                                      <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 7px", borderRadius: 6, background: COLORS.inner, border: `1px solid ${COLORS.border}`, fontSize: 11 }}>
                                        {f.name}{f.unit ? ` (${f.unit})` : ""}
                                        {!["weight","reps"].includes(f.id) && (
                                          <button onClick={() => setVariants(prev => prev.map(pv => pv.id !== v.id ? pv : { ...pv, subvariants: (pv.subvariants ?? []).map(s => s.id === sub.id ? { ...s, dataFields: (s.dataFields ?? v.dataFields).filter(df => df.id !== f.id) } : s) }))} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 11, padding: 0 }}>×</button>
                                        )}
                                      </div>
                                    ))}
                                    <CustomFieldAdder onAdd={fieldName => setVariants(prev => prev.map(pv => pv.id !== v.id ? pv : { ...pv, subvariants: (pv.subvariants ?? []).map(s => s.id === sub.id ? { ...s, dataFields: [...(s.dataFields ?? v.dataFields), { id: generateId(), name: fieldName, type: "custom" as const }] } : s) }))} />
                                  </div>
                                </div>
                              </div>
                              </div>
                            ))}
                          </div>
                          <SubvariantAdder
                            onAdd={subName => addSubvariant(v.id, subName)}
                            existingNames={(v.subvariants ?? []).map(s => s.name).filter(Boolean)}
                          />
                        </div>

                      {/* Sets + Rep Range — only show at variant level if no subvariants */}
                      {(v.subvariants?.length ?? 0) === 0 && <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div>
                          <div style={{ ...sectionLabel, marginBottom: 4 }}>Sets</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => updateVariant(v.id, { sets: Math.max(1, v.sets - 1) })} style={{ background: COLORS.border, border: "none", color: COLORS.text, borderRadius: 4, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>−</button>
                            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{v.sets}</span>
                            <button onClick={() => updateVariant(v.id, { sets: v.sets + 1 })} style={{ background: COLORS.border, border: "none", color: COLORS.text, borderRadius: 4, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>+</button>
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...sectionLabel, marginBottom: 4 }}>Rep Range</div>
                          <select value={v.repRange} onChange={e => updateVariant(v.id, { repRange: e.target.value })} style={inp({ padding: "5px 8px", fontSize: 12 })}>
                            {REP_PRESETS.map(r => <option key={r} value={r}>{r} reps</option>)}
                          </select>
                        </div>
                      </div>}

                      {/* Data Fields — only show at variant level if no subvariants */}
                      {(v.subvariants?.length ?? 0) === 0 && <div>
                        <div style={{ ...sectionLabel, marginBottom: 6 }}>Data Fields</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                          {v.dataFields.map(f => (
                            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, background: COLORS.inner, border: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                              {f.name}{f.unit ? ` (${f.unit})` : ""}
                              {!["weight","reps"].includes(f.id) && (
                                <button onClick={() => removeDataField(v.id, f.id)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
                              )}
                            </div>
                          ))}
                          <CustomFieldAdder onAdd={fieldName => addDataField(v.id, { id: generateId(), name: fieldName, type: "custom" })} />
                        </div>
                      </div>}

                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Add Variant ── */}
          <div style={{ marginTop: 8 }}>
              {!showAddVariant ? (
                <button
                  onClick={() => setShowAddVariant(true)}
                  style={{ ...ghostBtn({ width: "100%", fontSize: 13, borderStyle: "dashed" }) }}
                >
                  + Add Variant
                </button>
              ) : (
                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={sectionLabel}>Select Variant</span>
                    <button onClick={() => { setShowAddVariant(false); setCustomVariantName(""); }} style={{ background: "none", border: "none", color: COLORS.dim, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {EQUIPMENT_PRESETS.map(n => {
                      const taken = alreadyAdded.includes(n);
                      return (
                        <button key={n} onClick={() => !taken && addVariant(n)}
                          style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${taken ? COLORS.border : COLORS.accent}`, background: "transparent", color: taken ? COLORS.border : COLORS.accent, cursor: taken ? "default" : "pointer" }}>
                          {n}
                        </button>
                      );
                    })}
                    {/* Custom button */}
                    {!customVariantName ? (
                      <button
                        onClick={() => setCustomVariantName(" ")}
                        style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px dashed ${COLORS.dim}`, background: "transparent", color: COLORS.dim, cursor: "pointer" }}>
                        Custom
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <input
                          autoFocus
                          style={inp({ fontSize: 12, padding: "4px 8px", width: 140 })}
                          placeholder="Variant name…"
                          value={customVariantName.trim()}
                          onChange={e => setCustomVariantName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && customVariantName.trim()) addVariant(customVariantName.trim()); if (e.key === "Escape") setCustomVariantName(""); }}
                        />
                        <button onClick={() => customVariantName.trim() && addVariant(customVariantName.trim())} style={accentBtn({ padding: "4px 10px", fontSize: 12 })}>Add</button>
                        <button onClick={() => setCustomVariantName("")} style={{ background: "none", border: "none", color: COLORS.dim, cursor: "pointer", fontSize: 14 }}>×</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
        </div>}

        {/* ── Groups ── */}
        <div>
          <label style={{ ...sectionLabel, display: "block", marginBottom: 8 }}>Groups</label>
          {selGroups.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {selGroups.map(gid => {
                const g = groups.find(x => x.id === gid);
                if (!g) return null;
                return (
                  <div key={gid} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: COLORS.accent, color: "#fff", fontSize: 13 }}>
                    {g.name}
                    <button onClick={() => setSelGroups(p => p.filter(id => id !== gid))} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
                  </div>
                );
              })}
            </div>
          )}
          <GroupSearch groups={groups} selectedIds={selGroups} onSelect={id => setSelGroups(p => p.includes(id) ? p : [...p, id])} />
        </div>

        {/* ── Actions ── */}
        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {initial && onMerge && (
            <button
              onClick={() => onMerge(initial)}
              style={ghostBtn({ fontSize: 12, padding: "7px 12px", marginRight: "auto" })}
            >
              Merge With…
            </button>
          )}
          <button onClick={onClose} style={ghostBtn()}>Cancel</button>
          <button onClick={handleSave} style={accentBtn()}>
            {initial ? "Save Changes" : "Add Workout"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Small helper components used inside the modal ─────────────────────────────

function CustomFieldAdder({ onAdd }: { onAdd: (name: string) => void }) {
  const [val, setVal] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) return (
    <button onClick={() => setOpen(true)} style={ghostBtn({ padding: "3px 8px", fontSize: 11, borderStyle: "dashed" })}>
      + Custom Field
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <input autoFocus value={val} onChange={e => setVal(e.target.value)}
        placeholder="Field name…"
        style={inp({ padding: "3px 6px", fontSize: 11, width: 110 })}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); setOpen(false); } }}
      />
      <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); setOpen(false); } }}
        style={accentBtn({ padding: "3px 8px", fontSize: 11 })}>Add</button>
      <button onClick={() => { setVal(""); setOpen(false); }}
        style={ghostBtn({ padding: "3px 8px", fontSize: 11 })}>×</button>
    </div>
  );
}

function SubNameInput({ currentName, onSave, existingNames = [] }: { currentName: string; onSave: (name: string) => void; existingNames?: string[] }) {
  const [editing, setEditing] = useState(!currentName);
  const [val, setVal] = useState(currentName);

  if (!editing) return (
    <span
      onClick={() => setEditing(true)}
      style={{ fontSize: 12, cursor: "pointer", borderBottom: `1px dashed ${COLORS.border}`, paddingBottom: 1 }}
      title="Click to rename"
    >
      {currentName}
    </span>
  );

  const isDupe = existingNames
    .filter(n => n.toLowerCase() !== currentName.toLowerCase())
    .map(n => n.toLowerCase())
    .includes(val.trim().toLowerCase());

  const trySave = () => {
    if (val.trim() && !isDupe) { onSave(val.trim()); setEditing(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="Name this sub-variant…"
          style={inp({ padding: "3px 7px", fontSize: 12, width: 160, borderColor: isDupe ? COLORS.red : undefined })}
          onKeyDown={e => {
            if (e.key === "Enter") trySave();
            if (e.key === "Escape") { setVal(currentName); setEditing(false); }
          }}
        />
        <button onClick={trySave} disabled={!val.trim() || isDupe}
          style={accentBtn({ padding: "3px 8px", fontSize: 11, opacity: (!val.trim() || isDupe) ? 0.4 : 1 })}
        >Set</button>
        {currentName && (
          <button onClick={() => { setVal(currentName); setEditing(false); }}
            style={{ background: "none", border: "none", color: COLORS.dim, cursor: "pointer", fontSize: 13 }}>×</button>
        )}
      </div>
      {isDupe && val.trim() && (
        <div style={{ fontSize: 11, color: COLORS.red }}>Name already taken</div>
      )}
    </div>
  );
}

function SubvariantAdder({ onAdd, existingNames }: { onAdd: (name: string) => void; existingNames: string[] }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");

  const isDupe = existingNames.map(n => n.toLowerCase()).includes(val.trim().toLowerCase());

  const tryAdd = () => {
    if (val.trim() && !isDupe) { onAdd(val.trim()); setVal(""); }
  };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={ghostBtn({ width: "100%", fontSize: 12, marginTop: 6, borderStyle: "dashed" })}
    >
      + Create Sub-Variants
    </button>
  );

  return (
    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="Sub-variant name…"
          style={inp({ padding: "5px 8px", fontSize: 12, borderColor: isDupe ? COLORS.red : undefined })}
          onKeyDown={e => { if (e.key === "Enter") tryAdd(); }}
        />
        <button onClick={tryAdd} disabled={!val.trim() || isDupe}
          style={accentBtn({ padding: "5px 10px", fontSize: 12, opacity: (!val.trim() || isDupe) ? 0.4 : 1 })}
        >Add</button>
        <button onClick={() => { setOpen(false); setVal(""); }}
          style={ghostBtn({ padding: "5px 10px", fontSize: 12 })}
        >Done</button>
      </div>
      {isDupe && val.trim() && (
        <div style={{ fontSize: 11, color: COLORS.red, paddingLeft: 2 }}>
          A sub-variant with this name already exists
        </div>
      )}
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
    }).map(ex => ({
      ...ex,
      id: ex.id ?? generateId(),
      groupIds: getGroupIds(ex.name),
      variants: ex.variants?.length ? ex.variants : [{
        id: generateId(), name: "Barbell", isDefault: true, order: 0,
        sets: ex.sets ?? 3, repRange: ex.repRange ?? "8-12",
        dataFields: [...DEFAULT_DATA_FIELDS],
      }],
    }));
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
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);

  // ── Merge mode state ────────────────────────────────────────────────────────
  const [mergeSource, setMergeSource]           = useState<Exercise | null>(null);
  const [mergeTarget, setMergeTarget]           = useState<Exercise | null>(null);
  const [showMergeVariantPicker, setShowMergeVariantPicker] = useState(false);
  const [mergeTargetVariantId, setMergeTargetVariantId]     = useState<string | null>(null);
  const [mergeTargetSubId, setMergeTargetSubId]             = useState<string | null>("none");
  const [showMergeConfirm, setShowMergeConfirm]             = useState(false);

  const cancelMerge = () => {
    setMergeSource(null);
    setMergeTarget(null);
    setShowMergeVariantPicker(false);
    setMergeTargetVariantId(null);
    setMergeTargetSubId("none");
    setShowMergeConfirm(false);
  };

  const startMerge = (source: Exercise) => {
    setMergeSource(source);
    setShowWorkoutPopup(false);
  };

  const selectMergeTarget = (target: Exercise) => {
    const defaultV = target.variants.find(v => v.isDefault) ?? target.variants[0];
    setMergeTarget(target);
    setMergeTargetVariantId(defaultV?.id ?? null);
    setMergeTargetSubId("none");
    setShowMergeVariantPicker(true);
  };

  const confirmMerge = () => {
    setShowMergeConfirm(true);
  };

  const executeMerge = () => {
    if (!mergeSource || !mergeTarget || !mergeTargetVariantId) return;

    // Build the new subvariant from the source exercise
    const newSub: Subvariant = {
      id: generateId(),
      name: mergeSource.name,
      isDefault: false,
      order: 99,
      sets: mergeSource.sets,
      repRange: mergeSource.repRange,
      dataFields: mergeSource.variants?.[0]?.dataFields ?? [...DEFAULT_DATA_FIELDS],
    };

    // Add the subvariant to the selected variant of the target
    const updatedTarget: Exercise = {
      ...mergeTarget,
      variants: mergeTarget.variants.map(v => {
        if (v.id !== mergeTargetVariantId) return v;
        const existingSubs = v.subvariants ?? [];
        // If mergeTargetSubId is "none", add as new subvariant
        return { ...v, subvariants: [...existingSubs, newSub] };
      }),
    };

    // Remove source from exercises, update target
    const updatedExercises = exercises
      .filter(e => e.id !== mergeSource.id)
      .map(e => e.id === mergeTarget.id ? updatedTarget : e);
    wrappedSetExercises(updatedExercises);

    // Update all templates — replace source references with target
    setTemplates(templates.map(t => ({
      ...t,
      exercises: t.exercises
        .filter(e => e.id !== mergeSource.id && e.name !== mergeSource.name)
        .map(e => e.id === mergeTarget.id ? updatedTarget : e),
    })));

    cancelMerge();
  };

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
        exercises: t.exercises.map(e => e.id === ex.id
          ? { ...e, name: ex.name, sets: ex.sets, repRange: ex.repRange, variants: ex.variants }
          : e
        ),
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
          onMerge={startMerge}
          onDelete={ex => setDeletingExercise(ex)}
        />
      )}

      {/* Merge mode overlays */}
      {showMergeVariantPicker && mergeTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: COLORS.card, borderRadius: 14, padding: 24, width: 460, border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Merge "{mergeSource?.name}" into "{mergeTarget.name}"
            </h3>

            {/* Variant picker */}
            <div>
              <div style={{ fontSize: 12, color: COLORS.dim, fontWeight: 700, textTransform: "uppercase" as const, marginBottom: 8 }}>Select Variant</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {mergeTarget.variants.map(v => (
                  <label key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: mergeTargetVariantId === v.id ? COLORS.accent + "22" : COLORS.inner, border: `1px solid ${mergeTargetVariantId === v.id ? COLORS.accent : COLORS.border}`, cursor: "pointer" }}>
                    <input type="radio" checked={mergeTargetVariantId === v.id} onChange={() => { setMergeTargetVariantId(v.id); setMergeTargetSubId("none"); }} style={{ accentColor: COLORS.accent }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{v.name}{v.isDefault && <span style={{ marginLeft: 6, fontSize: 11, color: COLORS.accent }}>default</span>}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Subvariant picker — only if selected variant has subvariants */}
            {(() => {
              const selV = mergeTarget.variants.find(v => v.id === mergeTargetVariantId);
              if (!selV?.subvariants?.length) return null;
              return (
                <div>
                  <div style={{ fontSize: 12, color: COLORS.dim, fontWeight: 700, textTransform: "uppercase" as const, marginBottom: 8 }}>Select Sub-Variant <span style={{ fontSize: 11, fontWeight: 400 }}>(optional)</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {selV.subvariants.map(s => (
                      <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, background: mergeTargetSubId === s.id ? COLORS.accent + "22" : COLORS.inner, border: `1px solid ${mergeTargetSubId === s.id ? COLORS.accent : COLORS.border}`, cursor: "pointer" }}>
                        <input type="radio" checked={mergeTargetSubId === s.id} onChange={() => setMergeTargetSubId(s.id)} style={{ accentColor: COLORS.accent }} />
                        <span style={{ fontSize: 13 }}>{s.name || <span style={{ color: COLORS.dim, fontStyle: "italic" }}>Unnamed</span>}{s.isDefault && <span style={{ marginLeft: 6, fontSize: 11, color: COLORS.accent }}>default</span>}</span>
                      </label>
                    ))}
                    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, background: mergeTargetSubId === "none" ? COLORS.accent + "22" : COLORS.inner, border: `1px solid ${mergeTargetSubId === "none" ? COLORS.accent : COLORS.border}`, cursor: "pointer" }}>
                      <input type="radio" checked={mergeTargetSubId === "none"} onChange={() => setMergeTargetSubId("none")} style={{ accentColor: COLORS.accent }} />
                      <span style={{ fontSize: 13, color: COLORS.dim }}>No sub-variant</span>
                    </label>
                  </div>
                </div>
              );
            })()}

            <div style={{ fontSize: 12, color: COLORS.dim, padding: "8px 10px", background: COLORS.inner, borderRadius: 8 }}>
              "{mergeSource?.name}" will be added as a new sub-variant under <strong style={{ color: COLORS.text }}>{mergeTarget.name} → {mergeTarget.variants.find(v => v.id === mergeTargetVariantId)?.name}</strong>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={cancelMerge} style={ghostBtn()}>Cancel</button>
              <button onClick={confirmMerge} style={accentBtn()}>Confirm Merge</button>
            </div>
          </div>
        </div>
      )}

      {showMergeConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }}>
          <div style={{ background: COLORS.card, borderRadius: 14, padding: 24, width: 420, border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.orange }}>⚠ Are you sure?</h3>
            <p style={{ margin: 0, fontSize: 13, color: COLORS.dim, lineHeight: 1.6 }}>
              <strong style={{ color: COLORS.text }}>"{mergeSource?.name}"</strong> will be permanently deleted as a standalone exercise. All logged history will be moved to:
            </p>
            <div style={{ padding: "10px 14px", background: COLORS.inner, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              {mergeTarget?.name} → {mergeTarget?.variants.find(v => v.id === mergeTargetVariantId)?.name}
              {mergeTargetSubId !== "none" && ` → ${mergeTarget?.variants.find(v => v.id === mergeTargetVariantId)?.subvariants?.find(s => s.id === mergeTargetSubId)?.name}`}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.red }}>This cannot be undone.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowMergeConfirm(false)} style={ghostBtn()}>Go Back</button>
              <button onClick={executeMerge} style={{ ...accentBtn(), background: COLORS.red }}>Delete & Merge</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Exercise Confirm */}
      {deletingExercise && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1002 }}>
          <div style={{ background: COLORS.card, borderRadius: 14, padding: 24, width: 420, border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.red }}>⚠ Delete "{deletingExercise.name}"?</h3>
            <p style={{ margin: 0, fontSize: 13, color: COLORS.dim, lineHeight: 1.6 }}>
              This will permanently delete <strong style={{ color: COLORS.text }}>{deletingExercise.name}</strong> from your workout library and remove it from any session templates it appears in.
            </p>
            <p style={{ margin: 0, fontSize: 13, color: COLORS.dim, lineHeight: 1.6 }}>
              All logged history and progress data for this exercise will be lost and cannot be recovered.
            </p>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.red, fontWeight: 600 }}>This cannot be undone.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeletingExercise(null)}
                style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.dim, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  wrappedSetExercises(exercises.filter(e => e.id !== deletingExercise.id));
                  setTemplates(templates.map(t => ({ ...t, exercises: t.exercises.filter(e => e.id !== deletingExercise.id) })));
                  setDeletingExercise(null);
                  setShowWorkoutPopup(false);
                  setEditingExercise(null);
                }}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: COLORS.red, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>

        {/* ═══════════════════════════════════════════════════════════════════
            COL 1 — Daily Tasks
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ ...colStyle, opacity: mergeSource ? 0.3 : 1, pointerEvents: mergeSource ? "none" : "auto", transition: "opacity 0.2s" }}>
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
        <div style={{ ...colStyle, opacity: mergeSource ? 0.3 : 1, pointerEvents: mergeSource ? "none" : "auto", transition: "opacity 0.2s" }}>
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
            {mergeSource ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: COLORS.orange + "18", border: `1px solid ${COLORS.orange}`, borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: COLORS.orange, flex: 1 }}>
                  Select a <strong>Multi-Variant</strong> workout to merge "{mergeSource.name}" into
                </span>
                <button onClick={cancelMerge} style={{ background: "none", border: "none", color: COLORS.dim, cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: 8 }}>
                <button onClick={addGroup} style={accentBtn({ width: "100%", whiteSpace: "nowrap" })}>+ New Group</button>
                <button onClick={() => { setEditingExercise(null); setShowWorkoutPopup(true); }} style={accentBtn({ width: "100%" })}>+ New Workout</button>
              </div>
            )}
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
                    {groupExs.map(ex => {
                      const isSelf = mergeSource?.id === ex.id;
                      const isMulti = ex.variants?.length > 1 || (ex.variants?.length === 1 && ex.variants[0].name !== "Standard");
                      const isValidTarget = mergeSource && !isSelf && isMulti;
                      const isGreyed = mergeSource && (isSelf || !isMulti);
                      return (
                        <button
                          key={ex.id}
                          onClick={() => {
                            if (mergeSource) {
                              if (isValidTarget) selectMergeTarget(ex);
                            } else {
                              setEditingExercise(ex);
                              setShowWorkoutPopup(true);
                            }
                          }}
                          style={{
                            padding: "4px 10px", borderRadius: 6,
                            border: `1px solid ${isValidTarget ? COLORS.accent : COLORS.border}`,
                            background: isValidTarget ? COLORS.accent + "18" : COLORS.inner,
                            color: isGreyed ? COLORS.border : isValidTarget ? COLORS.accent : COLORS.text,
                            cursor: isValidTarget ? "pointer" : isGreyed ? "default" : "pointer",
                            fontSize: 12, fontWeight: 500, transition: "border-color 0.15s, color 0.15s",
                            opacity: isGreyed ? 0.4 : 1,
                          }}
                          onMouseEnter={e => { if (!mergeSource) { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; } }}
                          onMouseLeave={e => { if (!mergeSource) { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.text; } }}
                        >
                          {ex.name}
                        </button>
                      );
                    })}
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