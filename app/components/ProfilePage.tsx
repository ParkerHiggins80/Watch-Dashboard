"use client";
import { useState, useRef, useEffect } from "react";
import { COLORS } from "../constants";
import { auth } from "../firebase";
import { verifyBeforeUpdateEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

interface PR {
  exercise: string;
  date: string;
  weight: number;
  reps: number;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: { name: string; sets: number; repRange: string }[];
}

interface ProfilePageProps {
  history: any[];
  templates: WorkoutTemplate[];
  schedule: Record<string, string>;
  profileData: { name: string; bio: string; username: string; gyms: string[]; photo: string | null };
  setProfileData: (data: any) => void;
}

const SPLIT_COLORS: Record<string, { bg: string; text: string }> = {
  PUSH:   { bg: "#1e3a5f", text: "#60a5fa" },
  PULL:   { bg: "#2e1a4a", text: "#a78bfa" },
  LEGS:   { bg: "#1a3a2a", text: "#34d399" },
  REST:   { bg: "#1a1a1a", text: "#6b7280" },
  UPPER:  { bg: "#3a2a10", text: "#fbbf24" },
  LOWER:  { bg: "#3a1a1a", text: "#f87171" },
  CARDIO: { bg: "#1a3030", text: "#2dd4bf" },
};

const HEATMAP_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const SHORT_DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];

// ── Photo Crop Editor ────────────────────────────────────────────────────────

function PhotoEditor({ src, onSave, onClose }: { src: string; onSave: (cropped: string) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const PREVIEW_SIZE = 460;
  const CIRCLE_R = PREVIEW_SIZE / 2;
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const initScale = PREVIEW_SIZE / minDim;
      setScale(initScale);
      setOffset({ x: (PREVIEW_SIZE - img.naturalWidth * initScale) / 2, y: (PREVIEW_SIZE - img.naturalHeight * initScale) / 2 });
      setImgLoaded(true);
    };
    img.src = src;
  }, [src]);

  useEffect(() => { if (imgLoaded) draw(); }, [scale, offset, imgLoaded]);

  const draw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.drawImage(img, offset.x, offset.y, img.naturalWidth * scale, img.naturalHeight * scale);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.arc(CIRCLE_R, CIRCLE_R, CIRCLE_R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.arc(CIRCLE_R, CIRCLE_R, CIRCLE_R, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, offset.x, offset.y, img.naturalWidth * scale, img.naturalHeight * scale);
    ctx.restore();
    ctx.beginPath(); ctx.arc(CIRCLE_R, CIRCLE_R, CIRCLE_R - 1, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.setLineDash([6, 3]); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(CIRCLE_R, CIRCLE_R, CIRCLE_R - 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent) => { setDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); };
  const handleMouseMove = (e: React.MouseEvent) => { if (!dragging) return; setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const handleMouseUp = () => setDragging(false);
  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); setScale(s => Math.max(0.2, Math.min(5, s * (e.deltaY > 0 ? 0.95 : 1.05)))); };

  const handleSave = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    const img = imgRef.current!;
    const f = 400 / PREVIEW_SIZE;
    ctx.beginPath(); ctx.arc(200, 200, 200, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, offset.x * f, offset.y * f, img.naturalWidth * scale * f, img.naturalHeight * scale * f);
    onSave(canvas.toDataURL("image/jpeg", 0.92));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={onClose}>
      <div style={{ background: COLORS.card, borderRadius: 16, padding: 28, border: `1px solid ${COLORS.border}`, width: 520, display: "flex", flexDirection: "column", gap: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Add a profile photo</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.dim, cursor: "pointer", fontSize: 22 }}>×</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE}
            style={{ borderRadius: 8, cursor: dragging ? "grabbing" : "grab", display: "block" }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} />
        </div>
        
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: COLORS.accent, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Exact copy of the HomePage heatmap ──────────────────────────────────────

function ActivityGrid({ history, templates }: { history: any[], templates: WorkoutTemplate[] }) {
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

    const prevWorkouts = workoutsOnDay.flatMap((w: any) => {
      const same = history
        .filter((h) => h.name === w.name && h.date < dateStr)
        .sort((a: any, b: any) => b.date.localeCompare(a.date));
      return same.length > 0 ? [same[0]] : [];
    });

    let prevVolume: number;
    if (prevWorkouts.length > 0) {
      prevVolume = prevWorkouts.reduce((sum: number, w: any) => sum + getVolume(w), 0) / prevWorkouts.length;
    } else {
      const allVolumes = history
        .filter((h) => h.date !== dateStr)
        .map((h) => getVolume(h))
        .filter((v) => v > 0);
      prevVolume = allVolumes.length > 0
        ? allVolumes.reduce((a: number, b: number) => a + b, 0) / allVolumes.length
        : dayVolume;
    }

    if (prevVolume === 0) return "#1e3a5f";
    const pct = (dayVolume - prevVolume) / prevVolume;
    if (pct >= 0.1)  return "#2563eb";
    if (pct >= 0)    return "#1d4ed8";
    if (pct >= -0.1) return "#1e3a5f";
    return "#162d4a";
  };

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

  const getFullYearGrid = () => {
    const year = new Date().getFullYear();
    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    const startDow = jan1.getDay();
    const padStart = Array(startDow).fill(null);
    const endDow = dec31.getDay();
    const padEnd = Array(endDow < 6 ? 6 - endDow : 0).fill(null);
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
      {/* Month labels */}
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
            return (
              <div
                key={col}
                title={(() => {
                if (!cell?.gym) return "";
                const workoutsOnDay = history.filter(w => w.date === cell.date);
                const getVolume = (w: any) =>
                  (w.exercises || []).reduce((total: number, ex: any) => {
                    const templateEx = templates.flatMap(t => t.exercises).find((te: any) => te.name === ex.name);
                    const repRange = templateEx?.repRange || "8-12";
                    const [minRep, maxRep] = repRange.split("-").map(Number);
                    const validSets = (ex.sets || []).filter((s: any) => { const r = Number(s.reps); return r >= (minRep || 1) && r <= (maxRep || 999); });
                    return total + validSets.reduce((st: number, s: any) => st + Number(s.weight) * Number(s.reps), 0);
                  }, 0);
                const dayVolume = workoutsOnDay.reduce((sum: number, w: any) => sum + getVolume(w), 0);
                const names = workoutsOnDay.map(w => w.name).join(" + ");
                const prevWorkouts = workoutsOnDay.flatMap((w: any) => {
                  const same = history.filter(h => h.name === w.name && h.date < cell.date).sort((a: any, b: any) => b.date.localeCompare(a.date));
                  return same.length > 0 ? [same[0]] : [];
                });
                if (prevWorkouts.length === 0) return `${cell.date} — ${names}\nFirst time logged`;
                const prevVolume = prevWorkouts.reduce((sum: number, w: any) => sum + getVolume(w), 0) / prevWorkouts.length;
                if (prevVolume === 0) return `${cell.date}\n${names}`;
                const pct = Math.round((dayVolume - prevVolume) / prevVolume * 100);
                const sign = pct >= 0 ? "+" : "";
                return `${cell.date}\n${names}\n${sign}${pct}%`;
              })()}
                style={{
                  flex: 1,
                  aspectRatio: "1",
                  borderRadius: 2,
                  background: isEmpty ? "transparent" : (cell.gym ? getWorkoutColor(cell.date) || COLORS.inner : COLORS.inner),
                  border: isEmpty ? "none" : `1px solid ${COLORS.border}`,
                  marginRight: 2,
                }}
              />
            );
          })}
        </div>
      ))}
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
  );
}

// ── PR Card ──────────────────────────────────────────────────────────────────

function PRCard({ pr }: { pr: PR }) {
  return (
    <div style={{
      background: COLORS.inner,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      padding: "10px 14px",
      minWidth: 140,
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 4 }}>{pr.date}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {pr.exercise}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.accent }}>
        {pr.weight} <span style={{ fontSize: 12, color: COLORS.dim }}>lbs</span>
      </div>
      <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 2 }}>{pr.reps} rep{pr.reps !== 1 ? "s" : ""}</div>
    </div>
  );
}

// ── Template Row ─────────────────────────────────────────────────────────────

function TemplateRow({ template, highlighted }: { template: WorkoutTemplate; highlighted?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: COLORS.inner, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", background: "none", border: "none", color: COLORS.text, cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: highlighted ? COLORS.accent : COLORS.text }}>{template.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: COLORS.dim }}>{template.exercises.length} exercises</span>
          <span style={{ color: COLORS.dim, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {template.exercises.map((ex, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.dim, padding: "4px 0", borderTop: `1px solid ${COLORS.border}` }}>
              <span style={{ color: COLORS.text }}>{ex.name}</span>
              <span>{ex.sets} × {ex.repRange}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ProfilePage({ history, templates, schedule, profileData, setProfileData }: ProfilePageProps) {
  const { photo } = profileData;
  const setPhoto = (v: string | null) => setProfileData({ ...profileData, photo: v });
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [pendingPhotoSrc, setPendingPhotoSrc] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(profileData.name);
  const [draftBio, setDraftBio] = useState(profileData.bio);
  const [draftUsername, setDraftUsername] = useState(profileData.username || "@pjhiggs80");
  const [draftGyms, setDraftGyms] = useState<string[]>(profileData.gyms?.length > 0 ? profileData.gyms : [""]);
  const fileRef = useRef<HTMLInputElement>(null);
  const gymInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [dropdownPos, setDropdownPos] = useState<Record<number, {top: number; left: number; width: number}>>({});
  const [gymSearch, setGymSearch] = useState<Record<number, string>>({});
  const [gymSuggestions, setGymSuggestions] = useState<Record<number, any[]>>({});
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState("");
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleEmailChange = async () => {
    if (!isValidEmail(newEmail)) { setEmailError("Invalid email address."); return; }
    if (!emailPassword) { setEmailError("Please enter your current password."); return; }
    setEmailLoading(true);
    setEmailError("");
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("Not logged in");
      const cred = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, cred);
      await verifyBeforeUpdateEmail(user, newEmail);
      setEmailSuccess(`Verification sent to ${newEmail}. Check your inbox — your login email will update after you verify.`);
      setShowEmailChange(false);
      setNewEmail("");
      setEmailPassword("");
    } catch (err: any) {
      if (err.code === "auth/wrong-password") setEmailError("Incorrect password.");
      else if (err.code === "auth/email-already-in-use") setEmailError("An account with this email already exists.");
      else if (err.code === "auth/invalid-email") setEmailError("Invalid email address.");
      else setEmailError("Something went wrong. Try again.");
    }
    setEmailLoading(false);
  };

  const MAPBOX_TOKEN = "pk.eyJ1IjoicGFya2VyaGlnZ2luczgwIiwiYSI6ImNtbTl1a2VlcDA2czYyb29sYWhpY2M4NmcifQ.y6hc3bV79bqoKHyRL--HbA";

  const searchGyms = async (query: string, index: number) => {
    if (!query.trim()) { setGymSuggestions(s => ({ ...s, [index]: [] })); return; }
    try {
      const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(query)}&types=poi&poi_category=gym,fitness_center&limit=6&session_token=gym-search-${index}&access_token=${MAPBOX_TOKEN}`);
      const data = await res.json();
      console.log("searchbox response", JSON.stringify(data).slice(0, 300));
      setGymSuggestions(s => ({ ...s, [index]: data.suggestions || [] }));
    } catch (e) { console.error(e); setGymSuggestions(s => ({ ...s, [index]: [] })); }
  };

  useEffect(() => {
    if (editingProfile) {
      const init: Record<number, string> = {};
      draftGyms.forEach((g, i) => { init[i] = g; });
      setGymSearch(init);
    }
  }, [editingProfile]);

  const username = profileData.username || "@pjhiggs80";
  const sinceDate = (profileData as any).joinedDate ?? "";

  // ── Compute PRs from history ──
  const prMap: Record<string, PR> = {};
  history.forEach(w => {
    const dateStr = w.date
      ? new Date(w.date + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })
      : "";
    (w.exercises || []).forEach((ex: any) => {
      const workSets = (ex.sets || []).filter((s: any) => s.type !== "warmup");
      if (!workSets.length) return;
      const bestSet = workSets.reduce((best: any, s: any) => ((s.weight ?? s.w ?? 0) > (best?.weight ?? best?.w ?? 0) ? s : best), null);
      if (!bestSet) return;
      const w_ = bestSet.weight ?? bestSet.w ?? 0;
      const r_ = bestSet.reps ?? bestSet.r ?? 0;
      if (!prMap[ex.name] || w_ > prMap[ex.name].weight) {
        prMap[ex.name] = { exercise: ex.name, date: dateStr, weight: w_, reps: r_ };
      }
    });
  });
  const recentPRs = Object.values(prMap).slice(0, 9);

  // ── Build split from schedule ──
  const splitDays = FULL_DAYS.map((d, i) => {
    const template = templates.find(t => t.id === schedule[d]);
    return { day: SHORT_DAYS[i], type: template ? template.name.toUpperCase().slice(0, 6) : "REST" };
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setPendingPhotoSrc(ev.target?.result as string); setShowEditMenu(false); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: `1px solid ${COLORS.border}`, background: COLORS.inner,
    color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{ background: COLORS.card, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}`, ...extra }}>
      {children}
    </div>
  );

  const sectionTitle = (t: string) => (
    <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, marginBottom: 14 }}>{t}</div>
  );

  return (
    <div style={{ display: "flex", gap: 16, padding: "0 0 20px 0", boxSizing: "border-box", minHeight: "min-content" }}>

      {/* ── Left Panel — 40% ── */}
      <div style={{ width: 440, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Avatar card */}
        {pendingPhotoSrc && (
          <PhotoEditor src={pendingPhotoSrc} onSave={cropped => { setPhoto(cropped); setPendingPhotoSrc(null); }} onClose={() => setPendingPhotoSrc(null)} />
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
          <div style={{ position: "relative", display: "inline-block" }} onMouseLeave={() => setShowEditMenu(false)}>
            <div style={{ width: 400, height: 400, borderRadius: "50%", background: photo ? "transparent" : COLORS.inner, border: `2px solid ${COLORS.accent}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {photo
                ? <img src={photo} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 40, color: COLORS.dim }}>📷</span>
              }
            </div>
            <button onClick={() => setShowEditMenu(m => !m)} style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: "rgba(20,20,20,0.88)", border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
              ✏️ Edit
            </button>
            {showEditMenu && (
              <div style={{ position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%) translateY(100%)", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, minWidth: 180, zIndex: 100, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                <button onClick={() => { setShowEditMenu(false); fileRef.current?.click(); }} style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", color: COLORS.text, cursor: "pointer", textAlign: "left", fontSize: 14 }}
                  onMouseEnter={e => (e.currentTarget.style.background = COLORS.inner)} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  Upload a photo…
                </button>
                {photo && (
                  <button onClick={() => { setPhoto(null); setShowEditMenu(false); }} style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", color: COLORS.red, cursor: "pointer", textAlign: "left", fontSize: 14, borderTop: `1px solid ${COLORS.border}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = COLORS.inner)} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                    Remove photo
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: COLORS.dim }}>Since {sinceDate}</div>
        </div>

        {/* View / Edit mode */}
        {!editingProfile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {profileData.name && <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{profileData.name}</div>}
            {profileData.bio && <div style={{ fontSize: 13, color: COLORS.dim, lineHeight: 1.5 }}>{profileData.bio}</div>}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, color: COLORS.dim }}>{username}</div>
              <div style={{ fontSize: 13, color: COLORS.dim }}>{auth.currentUser?.email}</div>
            </div>
            {profileData.gyms?.filter(g => g.trim()).length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, textTransform: "uppercase", letterSpacing: 1, marginTop: 12, textDecoration: "underline" }}>Gyms</div>
            )}
            {profileData.gyms?.filter(g => g.trim()).map((g, i) => {
              const parts = g.split(" — ");
              const name = parts[0];
              const address = parts.slice(1).join(" — ");
              return (
                <div key={i} style={{ fontSize: 13, color: COLORS.dim }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: COLORS.text, fontWeight: 600 }}>{name}</span>
                    {i === 0 && <span style={{ fontSize: 11, color: COLORS.accent, fontWeight: 700 }}>Home</span>}
                  </div>
                  {address && <div style={{ fontSize: 11, marginTop: 2 }}>{address}</div>}
                </div>
              );
            })}
            {!profileData.name && !profileData.bio && !profileData.gyms?.some(g => g.trim()) && (
              <div style={{ fontSize: 13, color: COLORS.dim }}>No profile info yet.</div>
            )}
            <button
              onClick={() => {
                setDraftName(profileData.name);
                setDraftBio(profileData.bio);
                setDraftUsername(profileData.username || "@pjhiggs80");
                setDraftGyms(profileData.gyms?.filter(g => g.trim()).length > 0 ? profileData.gyms.filter(g => g.trim()) : [""]);
                setEditingProfile(true);
              }}
              style={{ marginTop: 8, width: "100%", padding: "9px 0", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
            >
              Edit profile
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Name</div>
              <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Your name" style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Username</div>
              <input value={draftUsername} onChange={e => setDraftUsername(e.target.value)} placeholder="@username" style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Email</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.inner, color: COLORS.dim, fontSize: 13 }}>
                  {auth.currentUser?.email}
                </div>
                <button
                  onClick={() => { setShowEmailChange(!showEmailChange); setEmailError(""); setNewEmail(""); setEmailPassword(""); }}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}
                >
                  Change
                </button>
              </div>
              {emailSuccess && <div style={{ fontSize: 12, color: COLORS.green, marginTop: 6 }}>{emailSuccess}</div>}
              {showEmailChange && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.inner }}>
                  <div style={{ fontSize: 12, color: COLORS.dim, lineHeight: 1.5 }}>
                    ⚠️ You will need to verify your new email before it becomes active. Make sure you have access to it.
                  </div>
                  <input
                    value={newEmail}
                    onChange={e => {
                      setNewEmail(e.target.value);
                      if (e.target.value && !isValidEmail(e.target.value)) setEmailError("Invalid email address.");
                      else setEmailError("");
                    }}
                    placeholder="New email address"
                    style={{ ...inp, border: `1px solid ${emailError && newEmail ? COLORS.red : COLORS.border}` }}
                  />
                  {emailError && newEmail && <div style={{ fontSize: 12, color: COLORS.red, marginTop: -4 }}>{emailError}</div>}
                  <input
                    value={emailPassword}
                    onChange={e => setEmailPassword(e.target.value)}
                    placeholder="Current password (to confirm)"
                    type="password"
                    style={{ ...inp }}
                  />
                  {emailError && !newEmail && <div style={{ fontSize: 12, color: COLORS.red }}>{emailError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleEmailChange}
                      disabled={emailLoading || !isValidEmail(newEmail) || !emailPassword}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: isValidEmail(newEmail) && emailPassword ? COLORS.accent : COLORS.border, color: "#fff", cursor: isValidEmail(newEmail) && emailPassword ? "pointer" : "default", fontWeight: 700, fontSize: 13 }}
                    >
                      {emailLoading ? "Sending…" : "Send Verification"}
                    </button>
                    <button
                      onClick={() => { setShowEmailChange(false); setEmailError(""); setNewEmail(""); setEmailPassword(""); }}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Bio</div>
              <textarea value={draftBio} onChange={e => setDraftBio(e.target.value)} placeholder="Tell us about yourself…" rows={3} style={{ ...inp, resize: "none", fontFamily: "inherit" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Gyms</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {draftGyms.map((g, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ flex: 1, position: "relative", zIndex: 300 }}>
                      <input
                        ref={el => { gymInputRefs.current[i] = el; }}
                        value={gymSearch[i] ?? g}
                        style={{ ...inp, paddingRight: i === 0 ? 48 : 10 }}
                        onChange={e => {
                          const val = e.target.value;
                          setGymSearch(s => ({ ...s, [i]: val }));
                          const u = [...draftGyms]; u[i] = val; setDraftGyms(u);
                          if (val.length >= 3) {
                            const el = gymInputRefs.current[i];
                            if (el) {
                              const r = el.getBoundingClientRect();
                              const spaceBelow = window.innerHeight - r.bottom;
                              const top = spaceBelow < 220 ? r.top - 202 : r.bottom + 2;
                              setDropdownPos(p => ({ ...p, [i]: { top, left: r.left, width: r.width } }));
                            }
                            searchGyms(val, i);
                          } else setGymSuggestions(s => ({ ...s, [i]: [] }));
                        }}
                        onFocus={() => {
                          const el = gymInputRefs.current[i];
                          if (el) {
                            const r = el.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - r.bottom;
                            const top = spaceBelow < 220 ? r.top - 202 : r.bottom + 2;
                            setDropdownPos(p => ({ ...p, [i]: { top, left: r.left, width: r.width } }));
                          }
                        }}
                        onBlur={() => setTimeout(() => setGymSuggestions(s => ({ ...s, [i]: [] })), 150)}
                        placeholder={i === 0 ? "Search home gym…" : "Search gym…"}
                      />
                      {i === 0 && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: COLORS.accent, fontWeight: 700, pointerEvents: "none", background: COLORS.inner, paddingLeft: 6 }}>HOME</span>}
                      {(gymSuggestions[i] || []).length > 0 && (
                        <div style={{
                          position: "fixed",
                          top: dropdownPos[i]?.top ?? 0,
                          left: dropdownPos[i]?.left ?? 0,
                          width: dropdownPos[i]?.width ?? 320,
                          background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, zIndex: 9999, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
                        }}>
                          {gymSuggestions[i].map((f: any, j: number) => (
                            <button
                              key={j}
                              onMouseDown={() => {
                                const name = f.name;
                                const address = f.full_address || f.place_formatted || "";
                                const label = `${name} — ${address}`;
                                const u = [...draftGyms]; u[i] = label; setDraftGyms(u);
                                setGymSearch(s => ({ ...s, [i]: label }));
                                setGymSuggestions(s => ({ ...s, [i]: [] }));
                              }}
                              style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", color: COLORS.text, cursor: "pointer", textAlign: "left", fontSize: 12, borderBottom: `1px solid ${COLORS.border}` }}
                              onMouseEnter={e => (e.currentTarget.style.background = COLORS.inner)}
                              onMouseLeave={e => (e.currentTarget.style.background = "none")}
                            >
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
                              <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.full_address || f.place_formatted}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {i > 0 && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => { const u = [...draftGyms]; [u[0], u[i]] = [u[i], u[0]]; setDraftGyms(u); }}
                          title="Set as home gym"
                          style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: COLORS.inner, color: COLORS.accent, cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                          Set Home
                        </button>
                        <button
                          onClick={() => setDraftGyms(draftGyms.filter((_, j) => j !== i))}
                          style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: COLORS.inner, color: COLORS.red, cursor: "pointer", fontSize: 14 }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setDraftGyms([...draftGyms, ""])}
                  style={{ marginTop: 2, fontSize: 12, color: COLORS.accent, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500, textAlign: "left" as const }}
                >
                  + Add Gym
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={() => {
                  setProfileData({ ...profileData, name: draftName, bio: draftBio, username: draftUsername, gyms: draftGyms.filter(g => g.trim()) });
                  setEditingProfile(false);
                }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
              >
                Save
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel — 60% ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>

        {/* Activity */}
        {card(<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text }}>{new Date().getFullYear()} Activity</div>
            <button
              onClick={() => { import("firebase/auth").then(({ signOut }) => signOut(auth)); }}
              style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.dim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              Sign out
            </button>
          </div>
          <ActivityGrid history={history} templates={templates} />
        </>)}

        {/* Recent PRs */}
        {card(<>
          {sectionTitle("Recent PRs")}
          {recentPRs.length > 0 ? (
            <div style={{
              display: "flex", gap: 10, overflow: "hidden",
              WebkitMaskImage: "linear-gradient(to right, black 88%, transparent 100%)",
            }}>
              {recentPRs.map((pr, i) => <PRCard key={i} pr={pr} />)}
            </div>
          ) : (
            <div style={{ color: COLORS.dim, fontSize: 13 }}>No PRs logged yet. Start a workout to track your bests!</div>
          )}
        </>)}

        {/* My Split + My Templates — two column */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>

          {/* My Split */}
          {card(<>
            {sectionTitle("My Split")}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {splitDays.map(({ day, type }) => (
                <div key={day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 12, color: COLORS.dim, fontWeight: 600, width: 32, flexShrink: 0 }}>
                    {day.slice(0, 3)}
                  </div>
                  <div style={{
                    fontSize: 15, fontWeight: 600, color: COLORS.text,
                    background: COLORS.inner, borderRadius: 6,
                    padding: "5px 10px", flex: 1,
                    textAlign: "center" as const,
                  }}>
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </div>
                </div>
              ))}
            </div>
          </>, { flex: "1" as any })}

          {/* My Templates — only ones used in split */}
          <div style={{ flex: 2, background: COLORS.card, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}`, height: 325, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
            {sectionTitle("My Templates")}
            {(() => {
              const usedNames = new Set(splitDays.map(d => d.type.charAt(0) + d.type.slice(1).toLowerCase()));
              const inSplit = templates.filter(t => usedNames.has(t.name) && t.name.toLowerCase() !== "rest" && t.exercises.length > 0);
              const notInSplit = templates.filter(t => !usedNames.has(t.name) && t.name.toLowerCase() !== "rest" && t.exercises.length > 0);
              const ordered = [...inSplit, ...notInSplit];
              return ordered.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "scroll", flex: 1, minHeight: 0 }}>
                  {ordered.map(t => (
                    <TemplateRow key={t.id} template={t} highlighted={inSplit.some(s => s.id === t.id)} />
                  ))}
                </div>
              ) : (
                <div style={{ color: COLORS.dim, fontSize: 13 }}>No templates yet.</div>
              );
            })()}
          </div>

        </div>

      </div>
    </div>
  );
}