"use client";
import { useState, useEffect } from "react";
import { COLORS } from "../constants";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
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

export default function FriendsPage({ currentUser, schedule = {}, templates = [] }: FriendsPageProps) {
  const [allUsers,      setAllUsers]      = useState<UserProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [search,        setSearch]        = useState("");
  const [loading,       setLoading]       = useState(true);

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
  const profileView = selectedFriend && (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
      {/* Back */}
      <button
        onClick={() => setSelectedFriend(null)}
        style={{
          alignSelf: "flex-start",
          background: "none",
          border: "none",
          color: COLORS.accent,
          cursor: "pointer",
          fontSize: 13,
          padding: 0,
          fontWeight: 600,
        }}
      >
        ← Back to Friends
      </button>

      {/* Profile header */}
      <div style={{ ...card, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Avatar user={selectedFriend} size={80} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>
            {selectedFriend.displayName || selectedFriend.email}
          </div>
          <div style={{ fontSize: 12, color: COLORS.dim, marginBottom: 4 }}>
            @{(selectedFriend.displayName || selectedFriend.email).replace(/\s+/g, "").toLowerCase()}
          </div>
          {((selectedFriend as any).profileData?.bio || selectedFriend.bio) && (
            <div style={{ fontSize: 13, marginBottom: 4 }}>{(selectedFriend as any).profileData?.bio || selectedFriend.bio}</div>
          )}
          <div style={{ fontSize: 12, color: COLORS.dim }}>
            🏠 {(selectedFriend as any).profileData?.gym || selectedFriend.homeGym || "No gym listed"}
          </div>
          {selectedFriend.joinedDate && (
            <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 4 }}>
              Since {new Date(selectedFriend.joinedDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Session Calendar */}
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Session History</div>
        <MiniCalendar joinedDate={selectedFriend.joinedDate} />
      </div>

      {/* Recent PRs */}
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Recent PRs</div>
        {selectedFriend.recentPRs && selectedFriend.recentPRs.length > 0 ? (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {selectedFriend.recentPRs.map((pr, i) => (
              <div
                key={i}
                style={{
                  background: COLORS.inner,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  flexShrink: 0,
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600 }}>{pr.exercise}</div>
                <div style={{ color: COLORS.dim }}>{pr.weight} lbs × {pr.reps} rep{pr.reps > 1 ? "s" : ""}</div>
                <div style={{ color: COLORS.dim, fontSize: 11 }}>{pr.date}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: COLORS.dim }}>No PRs recorded yet.</div>
        )}
      </div>

      {/* My Split */}
      {selectedFriend.split && (
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Their Split</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {DAYS_SHORT.map((d, i) => {
              const full = DAYS_FULL[i];
              const val  = selectedFriend.split?.[full] || "Rest";
              return (
                <div key={d} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: COLORS.dim, marginBottom: 4 }}>{d}</div>
                  <div
                    style={{
                      background: COLORS.inner,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 6,
                      padding: "6px 2px",
                      fontSize: 10,
                      fontWeight: val !== "Rest" ? 600 : 400,
                      color: val !== "Rest" ? COLORS.text : COLORS.dim,
                    }}
                  >
                    {val}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

{/* Templates */}
      {(selectedFriend as any).templates && (selectedFriend as any).templates.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>My Templates</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(selectedFriend as any).templates.map((t: any, i: number) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: COLORS.inner,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                <span style={{ fontSize: 12, color: COLORS.dim }}>{t.exercises?.length ?? 0} exercises</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Page Layout ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      {sidebar}
      {selectedFriend ? profileView : defaultView}
    </div>
  );
}