"use client";
import { useState, useEffect } from "react";
import { COLORS } from "../constants";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  bio?: string;
  homeGym?: string;
  photoURL?: string;
  split?: Record<string, string>; // { Monday: "Push", Tuesday: "Pull", ... }
  recentPRs?: { exercise: string; weight: number; reps: number; date: string }[];
  templates?: { name: string; exerciseCount: number }[];
  joinedDate?: string;
}

interface FriendsPageProps {
  currentUser: { uid: string; email: string };
  schedule?: Record<string, string>;
  templates?: { id: string; name: string; exercises: any[] }[];
  onTemplateSaved?: (template: any) => void;
}

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS     = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function buildAlphaGroups(users: UserProfile[]) {
  const groups: Record<string, UserProfile[]> = {};
  for (const u of users) {
    const letter = (u.displayName || u.email || "?")[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(u);
  }
  return groups;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ user, size = 40 }: { user: UserProfile; size?: number }) {
  const name = user.displayName || user.email;
  const photo = user.photoURL || (user as any).profileData?.photo;
  return photo ? (
    <img
      src={photo}
      alt={name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: COLORS.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.35,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function MiniCalendar({ joinedDate }: { joinedDate?: string }) {
  const today   = new Date();
  const year    = today.getFullYear();
  // Show 6 months starting from the month the friend joined (or current month)
  const startMonth = joinedDate ? new Date(joinedDate).getMonth() : today.getMonth();

  const months = Array.from({ length: 6 }, (_, i) => {
    const m = (startMonth + i) % 12;
    const y = year + Math.floor((startMonth + i) / 12);
    return { month: m, year: y };
  });

  const cellSize = 10;
  const gap = 2;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 12 }}>
        {months.map(({ month, year: y }) => {
          const daysInMonth = new Date(y, month + 1, 0).getDate();
          const firstDay    = new Date(y, month, 1).getDay(); // 0=Sun
          // Shift so Monday=0
          const offset = (firstDay + 6) % 7;

          // Build grid: 7 cols (Mon-Sun), rows as needed
          const cells: (number | null)[] = [
            ...Array(offset).fill(null),
            ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
          ];

          const rows: (number | null)[][] = [];
          for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

          return (
            <div key={`${y}-${month}`} style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: COLORS.dim, marginBottom: 4, textAlign: "center" }}>
                {MONTHS[month]}
              </div>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${cellSize}px)`, gap }}>
                {["M", "W", "F"].map((d, di) => (
                  // Show M, W, F headers only at positions 0, 2, 4
                  Array.from({ length: 7 }, (_, ci) => (
                    <div
                      key={ci}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        fontSize: 6,
                        color: COLORS.dim,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {ci === 0 ? "M" : ci === 2 ? "W" : ci === 4 ? "F" : ""}
                    </div>
                  ))
                )).flat().slice(0, 7)}
              </div>
              {/* Day cells */}
              {rows.map((row, ri) => (
                <div
                  key={ri}
                  style={{ display: "grid", gridTemplateColumns: `repeat(7, ${cellSize}px)`, gap, marginTop: gap }}
                >
                  {row.map((day, ci) => (
                    <div
                      key={ci}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 2,
                        background: day ? COLORS.border : "transparent",
                        border: day ? `1px solid ${COLORS.border}` : "none",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Activity Grid (same as ProfilePage) ──────────────────────────────────────

function ActivityGrid({ history }: { history: any[] }) {
  const getHeatmapDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const days: { date: string; gym: boolean }[] = [];
    const cursor = new Date(year, 0, 1);
    while (cursor <= today) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`;
      days.push({ date: dateStr, gym: history.some(w => w.date === dateStr) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  };
  const heatmapDays = getHeatmapDays();
  const year = new Date().getFullYear();
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const padStart = Array(jan1.getDay()).fill(null);
  const padEnd = Array(dec31.getDay() < 6 ? 6 - dec31.getDay() : 0).fill(null);
  const allDays: any[] = [];
  const cursor2 = new Date(year, 0, 1);
  while (cursor2 <= dec31) {
    const dateStr = `${cursor2.getFullYear()}-${String(cursor2.getMonth()+1).padStart(2,"0")}-${String(cursor2.getDate()).padStart(2,"0")}`;
    const found = heatmapDays.find(d => d.date === dateStr);
    allDays.push(found || { date: dateStr, gym: false });
    cursor2.setDate(cursor2.getDate() + 1);
  }
  const grid = [...padStart, ...allDays, ...padEnd];
  const totalWeeks = Math.ceil(grid.length / 7);
  const rows = Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: totalWeeks }, (_, col) => grid[col * 7 + row] ?? null)
  );
  const MONTHS2 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthCols: { label: string; col: number }[] = [];
  MONTHS2.forEach((m, mi) => {
    for (let col = 0; col < totalWeeks; col++) {
      const cell = rows[0][col] || rows[1][col];
      if (cell) {
        const d = new Date(cell.date + "T12:00:00");
        if (d.getMonth() === mi && d.getDate() <= 7) { monthCols.push({ label: m, col }); break; }
      }
    }
  });
  const DOW = ["Sun","","Tue","","Thu","","Sat"];
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", marginLeft: 28, marginBottom: 3 }}>
        {Array.from({ length: totalWeeks }, (_, col) => {
          const month = monthCols.find(mc => mc.col === col);
          return <div key={col} style={{ flex: 1, fontSize: 9, color: COLORS.text, overflow: "visible", whiteSpace: "nowrap" }}>{month ? month.label : ""}</div>;
        })}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
          <div style={{ width: 24, fontSize: 9, color: COLORS.text, textAlign: "right", paddingRight: 4, flexShrink: 0 }}>{DOW[ri]}</div>
          {row.map((cell, ci) => (
            <div key={ci} style={{ flex: 1, aspectRatio: "1", borderRadius: 2, background: !cell ? "transparent" : cell.gym ? "#1d4ed8" : COLORS.inner, border: !cell ? "none" : `1px solid ${COLORS.border}`, marginRight: 2 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Activity Card ─────────────────────────────────────────────────────────────

function ActivityCard({
  user,
  onJoin,
}: {
  user: UserProfile;
  onJoin: () => void;
}) {
  // Mock a recent session for the activity feed
  const sessionTime = "9:20pm";
  const location    = "Marina Recreation Center";
  const workoutType = "Push";

  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 200,
        flex: "0 0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{user.displayName || user.email}</span>
        <button
          onClick={onJoin}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: `1px solid ${COLORS.accent}`,
            background: COLORS.accent,
            color: "#fff",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Join
        </button>
      </div>
      <div style={{ fontSize: 11, color: COLORS.dim }}>{workoutType}</div>
      <div style={{ fontSize: 11, color: COLORS.dim }}>{sessionTime}</div>
      <div style={{ fontSize: 11, color: COLORS.dim }}>{location}</div>
      <div style={{ fontSize: 10, color: COLORS.dim, marginTop: 2 }}>
        123 Huntington Ave, Boston, MA 02115
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FriendsPage({ currentUser, schedule = {}, templates = [], onTemplateSaved }: FriendsPageProps) {
  const [allUsers,      setAllUsers]      = useState<UserProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [search,        setSearch]        = useState("");
  const [loading,       setLoading]       = useState(true);
  const [friendHistory, setFriendHistory] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  async function saveTemplate(t: any) {
    if (!auth.currentUser) return;
    const newTemplate = {
      ...t,
      id: `copied_${t.id ?? t.name}_${Date.now()}`,
      copiedFrom: selectedFriend?.uid ?? null,
    };
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(userRef);
      const existing: any[] = snap.data()?.templates ?? [];
      await updateDoc(userRef, { templates: [...existing, newTemplate] });
      setSavedIds(prev => new Set(prev).add(t.id ?? t.name));
      onTemplateSaved?.(newTemplate);
    } catch (e) {
      console.error("Failed to save template:", e);
    }
  }

  useEffect(() => {
    if (!selectedFriend) return;
    async function loadFriendHistory() {
      try {
        const { collection: col, getDocs: gd } = await import("firebase/firestore");
        const snap = await gd(col(db, "users", selectedFriend!.uid, "workouts"));
        const loaded = snap.docs.map(d => d.data());
        setFriendHistory(loaded);
      } catch (e) {
        setFriendHistory([]);
      }
    }
    loadFriendHistory();
  }, [selectedFriend]);

  // Plan a Session state
  const [planTemplate, setPlanTemplate]   = useState(templates[0]?.name ?? "");
  const [planTime,     setPlanTime]       = useState("8:30pm");
  const [planLocation, setPlanLocation]   = useState("");
  const [planShow,     setPlanShow]       = useState("All Friends");
  const [planInvite,   setPlanInvite]     = useState("");

  // ── Fetch all users from Firestore ─────────────────────────────────────────
  useEffect(() => {
    async function loadUsers() {
      try {
        const snap = await getDocs(collection(db, "users"));
        const users: UserProfile[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              email: data.email || data.profileData?.email || d.id,
              displayName: data.displayName || data.profileData?.name || data.email || d.id,
              ...data,
            } as UserProfile;
          })
          .filter((u) => u.uid !== currentUser.uid);
        console.log("Loaded users:", users);
        setAllUsers(users);
      } catch (e) {
        console.error("Failed to load users:", e);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [currentUser.uid]);

  // ── Filtered + grouped users ───────────────────────────────────────────────
  const filtered = allUsers.filter((u) => {
    const name = (u.displayName || u.email || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });
  const alphaGroups = buildAlphaGroups(filtered.filter(u => u.displayName || u.email));
  const sortedLetters = Object.keys(alphaGroups).sort();

  // ── Shared card style ──────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 16,
  };

  const inp: React.CSSProperties = {
    padding: "8px 10px",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    background: COLORS.inner,
    color: COLORS.text,
    outline: "none",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
  };

  // ── Left Sidebar ───────────────────────────────────────────────────────────
  const sidebar = (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "calc(100vh - 120px)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 14px 8px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>My Friends</div>
        {/* Search + Add */}
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Friends"
            style={{ ...inp, flex: 1 }}
          />
          <button
            title="Add Friend (coming soon)"
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.inner,
              color: COLORS.dim,
              cursor: "default",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ overflowY: "auto", flex: 1, padding: "0 8px 12px" }}>
        {loading ? (
          <div style={{ color: COLORS.dim, fontSize: 12, padding: "12px 6px" }}>Loading…</div>
        ) : allUsers.length === 0 ? (
          <div style={{ color: COLORS.dim, fontSize: 12, padding: "12px 6px" }}>
            No other users yet.
          </div>
        ) : (
          sortedLetters.map((letter) => (
            <div key={letter}>
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.dim,
                  padding: "6px 6px 2px",
                  fontWeight: 600,
                  letterSpacing: 1,
                }}
              >
                {letter}
              </div>
              {alphaGroups[letter].map((u) => {
                const name    = u.displayName || u.email;
                const isSelected = selectedFriend?.uid === u.uid;
                return (
                  <button
                    key={u.uid}
                    onClick={() => setSelectedFriend(isSelected ? null : u)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: isSelected ? COLORS.accent + "33" : "transparent",
                      color: isSelected ? COLORS.accent : COLORS.text,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 400,
                      display: "block",
                    }}
                  >
                    {u.displayName && u.displayName !== u.uid
                      ? u.displayName
                      : u.email && u.email !== u.uid
                      ? u.email
                      : "Unknown User"}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Profile icon at bottom */}
      <div
        style={{
          borderTop: `1px solid ${COLORS.border}`,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: COLORS.dim,
          }}
        >
          👤
        </div>
        <span style={{ fontSize: 11, color: COLORS.dim }}>{currentUser.email}</span>
      </div>
    </div>
  );

  // ── Default View (no friend selected) ─────────────────────────────────────
  const defaultView = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
      {/* Next session banner */}
      <div
        style={{
          ...card,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 2 }}>Next Session</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>2/3/26 — 9pm • Push</div>
        </div>
        <button
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: `1px solid ${COLORS.accent}`,
            background: "transparent",
            color: COLORS.accent,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Invite to Session
        </button>
      </div>

      {/* Friends Activity */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Friends Activity</span>
          {/* Filter chips */}
          <div
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              background: COLORS.inner,
              border: `1px solid ${COLORS.border}`,
              fontSize: 11,
              color: COLORS.dim,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Marina Recreation Center ✕
          </div>
          <div
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              background: COLORS.inner,
              border: `1px solid ${COLORS.border}`,
              fontSize: 11,
              color: COLORS.dim,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            8–10pm ✕
          </div>
        </div>

        {/* Horizontally scrollable activity cards */}
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
          {allUsers.slice(0, 6).map((u) => (
            <ActivityCard
              key={u.uid}
              user={u}
              onJoin={() => setSelectedFriend(u)}
            />
          ))}
          {allUsers.length === 0 && (
            <div style={{ color: COLORS.dim, fontSize: 13 }}>No friends active yet.</div>
          )}
        </div>
      </div>

      {/* Plan a Session + Recent PRs side by side */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Plan a Session */}
        <div style={{ ...card, flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Plan a Session</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: COLORS.dim, width: 80, flexShrink: 0 }}>Template:</span>
              <select
                value={planTemplate}
                onChange={(e) => setPlanTemplate(e.target.value)}
                style={{ ...inp }}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
                {templates.length === 0 && <option>No templates</option>}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: COLORS.dim, width: 80, flexShrink: 0 }}>Start Time:</span>
              <input value={planTime} onChange={(e) => setPlanTime(e.target.value)} style={inp} placeholder="8:30pm" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: COLORS.dim, width: 80, flexShrink: 0 }}>Location:</span>
              <input value={planLocation} onChange={(e) => setPlanLocation(e.target.value)} style={inp} placeholder="Gym name or address" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: COLORS.dim, width: 80, flexShrink: 0 }}>Show:</span>
              <select value={planShow} onChange={(e) => setPlanShow(e.target.value)} style={inp}>
                <option>All Friends</option>
                <option>Best Friends</option>
                <option>Nobody</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: COLORS.dim, width: 80, flexShrink: 0 }}>Invite:</span>
              <select value={planInvite} onChange={(e) => setPlanInvite(e.target.value)} style={inp}>
                <option value="">— select friend —</option>
                {allUsers.map((u) => (
                  <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                ))}
              </select>
            </div>
            <button
              style={{
                marginTop: 4,
                padding: "10px 0",
                borderRadius: 8,
                border: "none",
                background: COLORS.accent,
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Plan Session
            </button>
          </div>
        </div>

        {/* Recent PRs */}
        <div style={{ ...card, flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Recent PRs</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: 300 }}>
            {allUsers.slice(0, 5).map((u) => (
              <div
                key={u.uid}
                style={{
                  borderBottom: `1px solid ${COLORS.border}`,
                  paddingBottom: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>{u.displayName || u.email}</span>
                <span style={{ fontSize: 11, color: COLORS.dim }}>2/13/26 — Bench 225 lbs × 1 rep</span>
              </div>
            ))}
            {allUsers.length === 0 && (
              <div style={{ color: COLORS.dim, fontSize: 12 }}>No PRs yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

 // ── Profile View (friend selected) ────────────────────────────────────────
  const profileView = selectedFriend && (() => {
    const f = selectedFriend as any;
    const pd = f.profileData || {};
    const photo = f.photoURL || pd.photo || null;
    const name = pd.name || f.displayName || f.email || "";
    const username = pd.username || "@" + name.replace(/\s+/g, "").toLowerCase();
    const bio = pd.bio || "";
    const gyms: string[] = pd.gyms || [];
    const friendTemplates: any[] = f.templates || [];
    const friendSchedule: Record<string, string> = f.schedule || {};

    // Build split
    const FULL_DAYS2 = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const SHORT_DAYS2 = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
    const splitDays = FULL_DAYS2.map((d, i) => {
      const tid = friendSchedule[d];
      const tmpl = friendTemplates.find((t: any) => t.id === tid);
      return { day: SHORT_DAYS2[i], type: tmpl ? tmpl.name.toUpperCase().slice(0, 6) : "REST" };
    });

    // Build PRs from history stored on friend (recentPRs field)
    const recentPRs: { exercise: string; date: string; weight: number; reps: number }[] = f.recentPRs || [];

    const sectionTitle = (t: string) => (
      <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, marginBottom: 14 }}>{t}</div>
    );

    const cardStyle: React.CSSProperties = {
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 12,
      padding: 16,
    };

    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Back button */}
        <button
          onClick={() => setSelectedFriend(null)}
          style={{ background: "none", border: "none", color: COLORS.accent, cursor: "pointer", fontSize: 13, padding: "0 0 12px 0", fontWeight: 600, display: "block" }}
        >
          ← Back to Friends
        </button>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

          {/* ── Left Panel ── */}
          <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Avatar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ width: 220, height: 220, borderRadius: "50%", overflow: "hidden", border: `2px solid ${COLORS.accent}`, background: COLORS.inner, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {photo
                  ? <img src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 60, fontWeight: 700, color: "#fff" }}>{name ? name[0].toUpperCase() : "?"}</span>
                }
              </div>
              {pd.joinedDate && (
                <div style={{ fontSize: 12, color: COLORS.dim }}>Since {new Date(pd.joinedDate).toLocaleDateString()}</div>
              )}
            </div>

            {/* Profile info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {name && <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{name}</div>}
              {bio && <div style={{ fontSize: 13, color: COLORS.dim, lineHeight: 1.5 }}>{bio}</div>}
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 13, color: COLORS.dim }}>{username}</div>
                <div style={{ fontSize: 13, color: COLORS.dim }}>{f.email !== f.uid ? f.email : ""}</div>
              </div>
              {gyms.filter((g: string) => g.trim()).length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, textTransform: "uppercase", letterSpacing: 1, marginTop: 12, textDecoration: "underline" }}>Gyms</div>
                  {gyms.filter((g: string) => g.trim()).map((g: string, i: number) => {
                    const parts = g.split(" — ");
                    const gymName = parts[0];
                    const address = parts.slice(1).join(" — ");
                    return (
                      <div key={i} style={{ fontSize: 13, color: COLORS.dim }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: COLORS.text, fontWeight: 600 }}>{gymName}</span>
                          {i === 0 && <span style={{ fontSize: 11, color: COLORS.accent, fontWeight: 700 }}>Home</span>}
                        </div>
                        {address && <div style={{ fontSize: 11, marginTop: 2 }}>{address}</div>}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>

            {/* Activity */}
            <div style={cardStyle}>
              {sectionTitle(`${new Date().getFullYear()} Activity`)}
              <ActivityGrid history={friendHistory} />
            </div>

            {/* Recent PRs */}
            <div style={cardStyle}>
              {sectionTitle("Recent PRs")}
              {recentPRs.length > 0 ? (
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                  {recentPRs.map((pr, i) => (
                    <div key={i} style={{ background: COLORS.inner, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", minWidth: 140, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 4 }}>{pr.date}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>{pr.exercise}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.accent }}>{pr.weight} <span style={{ fontSize: 12, color: COLORS.dim }}>lbs</span></div>
                      <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 2 }}>{pr.reps} rep{pr.reps !== 1 ? "s" : ""}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: COLORS.dim, fontSize: 13 }}>No PRs recorded yet.</div>
              )}
            </div>

            {/* Split + Templates side by side */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>

              {/* Split */}
              <div style={{ ...cardStyle, flex: 1 }}>
                {sectionTitle("Their Split")}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {splitDays.map(({ day, type }) => (
                    <div key={day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 12, color: COLORS.dim, fontWeight: 600, width: 32, flexShrink: 0 }}>{day.slice(0, 3)}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, background: COLORS.inner, borderRadius: 6, padding: "5px 10px", flex: 1, textAlign: "center" as const }}>
                        {type.charAt(0) + type.slice(1).toLowerCase()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Templates */}
              <div style={{ ...cardStyle, flex: 2, maxHeight: 340, boxSizing: "border-box" as const, display: "flex", flexDirection: "column" }}>
                {sectionTitle("Their Templates")}
                {friendTemplates.filter((t: any) => t.name?.toLowerCase() !== "rest" && (t.exercises?.length ?? 0) > 0).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
                    {friendTemplates.filter((t: any) => t.name?.toLowerCase() !== "rest" && (t.exercises?.length ?? 0) > 0).map((t: any, i: number) => (
                      <div key={i} style={{ background: COLORS.inner, borderRadius: 10, border: `1px solid ${COLORS.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</span>
                          <span style={{ fontSize: 12, color: COLORS.dim }}>{t.exercises?.length ?? 0} exercises</span>
                        </div>
                        <button
                          onClick={() => saveTemplate(t)}
                          disabled={savedIds.has(t.id ?? t.name)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 7,
                            border: `1px solid ${COLORS.accent}`,
                            background: savedIds.has(t.id ?? t.name) ? COLORS.inner : COLORS.accent,
                            color: savedIds.has(t.id ?? t.name) ? COLORS.dim : "#fff",
                            cursor: savedIds.has(t.id ?? t.name) ? "default" : "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {savedIds.has(t.id ?? t.name) ? "Saved ✓" : "Save to My Templates"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: COLORS.dim, fontSize: 13 }}>No templates yet.</div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  })();

  // ── Page Layout ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      {sidebar}
      {selectedFriend ? profileView : defaultView}
    </div>
  );
}