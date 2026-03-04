"use client";
import { useState, useEffect } from "react";
import {
  COLORS,
  DAYS,
  TODAY_INDEX,
  DEFAULT_TEMPLATES,
  DEFAULT_SCHEDULE,
  DEFAULT_TASKS,
  generateId,
  getToday,
} from "./constants";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import TemplatesPage from "./components/TemplatesPage";
import HistoryPage from "./components/HistoryPage";
import SessionPage from "./components/SessionPage";
import ProfilePage from "./components/ProfilePage";
import FriendsPage from "./components/FriendsPage";
import LoginPage from "./components/LoginPage";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("currentPage");
      if (saved && saved !== "session") return saved;
    }
    return "home";
  });
  const [templates, setTemplates] = useState<any[]>(
    DEFAULT_TEMPLATES.map((t) => ({
      ...t,
      exercises: t.exercises.map((ex) => ({ repRange: "8-12", ...ex })),
    })),
  );
  const [schedule, setSchedule] =
    useState<Record<string, string>>(DEFAULT_SCHEDULE);
  const [history, setHistory] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number>(0);
  const [tasks, setTasks] = useState<string[]>(DEFAULT_TASKS);
  const [taskCompletions, setTaskCompletions] = useState<
    Record<string, boolean[]>
  >({});
  const [windowWidth, setWindowWidth] = useState(1200);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saveEnabled, setSaveEnabled] = useState(false);
  const [dayOverrides, setDayOverrides] = useState<Record<string, string>>({});
  const [exercises, setExercises] = useState<any[]>([]);
  const [workoutGroups, setWorkoutGroups] = useState<any[]>([]);
  const [profileData, setProfileData] = useState({ name: "", bio: "", gym: "", secondaryGym: "", photo: null as string | null });

  // Auth + load data from Firestore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          // Load user doc (templates, schedule, tasks)
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) {
            const d = snap.data();
            if (d.templates) setTemplates(d.templates);
            if (d.schedule) setSchedule(d.schedule);
            if (d.tasks) setTasks(d.tasks);
            if (d.taskCompletions) setTaskCompletions(d.taskCompletions);
            if (d.exercises) setExercises(d.exercises);
            if (d.workoutGroups) setWorkoutGroups(d.workoutGroups);
            if (d.profileData) setProfileData(d.profileData);
            if (d.activeSessions && Array.isArray(d.activeSessions)) {
              const validSessions = d.activeSessions.filter(
                (s: any) => s?.id && s?.exercises?.length > 0 && s?.name
              );
              if (validSessions.length > 0) {
                setActiveSessions(validSessions);
                setActiveSessionIndex(d.activeSessionIndex ?? 0);
                setCurrentPage("session");
              }
            }
          }
          // Load workouts subcollection
          const { collection, getDocs } = await import("firebase/firestore");
          const workoutsSnap = await getDocs(
            collection(db, "users", u.uid, "workouts"),
          );
          const loaded = workoutsSnap.docs.map((d) => {
            const w = d.data();
            return {
              ...w,
              exercises: (w.exercises || []).map((ex: any) => ({
                ...ex,
                sets: (ex.sets || []).map((s: any) => ({
                  ...s,
                  weight: s.weight ?? s.w ?? 0,
                  reps: s.reps ?? s.r ?? 0,
                })),
              })),
            };
          });
          const sorted = loaded.sort((a: any, b: any) =>
            a.date.localeCompare(b.date),
          );
          setHistory(sorted);
          setDataLoaded(true);
          setTimeout(() => setSaveEnabled(true), 500);
        } catch (err) {
          console.error("Firestore error:", err);
          setDataLoaded(true);
        }
      } else {
        setDataLoaded(false);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Save data to Firestore on changes
  useEffect(() => {
    if (!user || !saveEnabled) return;
    const save = setTimeout(() => {
      const cleanSessions = activeSessions.map((s: any) => ({
        id: s.id,
        date: s.date,
        name: s.name,
        templateId: s.templateId ?? null,
        startTime: s.startTime ?? null,
        endTime: s.endTime ?? null,
        _completed: s._completed ?? false,
        _editing: s._editing ?? false,
        exercises: (s.exercises || []).map((ex: any) => ({
          name: ex.name,
          sets: (ex.sets || []).map((set: any) => ({
            weight: set.weight ?? 0,
            reps: set.reps ?? 0,
            type: set.type ?? "normal",
            _touched: set._touched ?? false,
          })),
        })),
      }));
      const cleanTemplates = templates.map((t: any) => ({
        id: t.id ?? null,
        name: t.name ?? "",
        exercises: (t.exercises || []).map((ex: any) => ({
          name: ex.name ?? "",
          sets: ex.sets ?? 0,
          repRange: ex.repRange ?? "8-12",
        })),
      }));

      const cleanTasks = tasks.map((t: any) => t ?? "");

      const cleanTaskCompletions: Record<string, boolean[]> = {};
      for (const [k, v] of Object.entries(taskCompletions)) {
        cleanTaskCompletions[k] = (v as any[]).map((b) => b ?? false);
      }

      const cleanExercises = exercises.map((ex: any) => ({
        id: ex.id ?? null,
        name: ex.name ?? "",
        sets: ex.sets ?? 3,
        repRange: ex.repRange ?? "8-12",
        groupIds: ex.groupIds ?? [],
      }));

      const cleanWorkoutGroups = workoutGroups.map((g: any) => ({
        id: g.id ?? null,
        name: g.name ?? "",
      }));

      const payload = JSON.parse(JSON.stringify({
        email: user.email,
        displayName: profileData.name || user.email,
        templates: cleanTemplates,
        schedule: Object.fromEntries(
          Object.entries(schedule).map(([k, v]) => [k, v ?? null]),
        ),
        tasks: cleanTasks,
        taskCompletions: cleanTaskCompletions,
        activeSessions: cleanSessions,
        activeSessionIndex,
        exercises: cleanExercises,
        workoutGroups: cleanWorkoutGroups,
        profileData,
      }));
      setDoc(doc(db, "users", user.uid), payload);
    }, 1000);
    return () => clearTimeout(save);
  }, [
    templates,
    schedule,
    tasks,
    taskCompletions,
    activeSessions,
    activeSessionIndex,
    exercises,
    workoutGroups,
    profileData,
    user,
    saveEnabled,
  ]);

  // Window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const todayDay = DAYS[TODAY_INDEX];
  const todayStr = getToday();
  const todayTemplateId = schedule[todayDay];
  const todayTemplate = templates.find((t) => t.id === todayTemplateId) || {
    name: "Rest",
    exercises: [],
  };

  const startWorkout = (template: any, editingCompleted?: any, dateStr?: string) => {
    if (editingCompleted) {
      // Check if this workout is already in activeSessions
      const existingIdx = activeSessions.findIndex(
        (s: any) => s.id === editingCompleted.id,
      );
      if (existingIdx !== -1) {
        // Already there (marked _completed), just reopen it as editable
        const updated = activeSessions.map((s: any, i: number) =>
          i === existingIdx ? { ...s, _completed: false, _editing: true } : s,
        );
        setActiveSessions(updated);
        setActiveSessionIndex(existingIdx);
      } else {
        // Not in activeSessions yet (e.g. loaded from history), add it
        // Ensure every exercise has at least one editable set
        const editableSession = {
          ...editingCompleted,
          _editing: true,
          _completed: false,
          exercises: (editingCompleted.exercises || []).map((ex: any) => ({
            ...ex,
            sets:
              ex.sets?.length > 0
                ? ex.sets
                : [{ weight: 0, reps: 0, type: "normal" }],
          })),
        };
        const idx = activeSessions.length;
        setActiveSessions([...activeSessions, editableSession]);
        setActiveSessionIndex(idx);
      }
      setCurrentPage("session");
      return;
    }
    if (activeSessions.some((s) => !s._completed)) {
      // There's already an active in-progress session, just go to it
      setCurrentPage("session");
      return;
    }
    const session = {
      id: generateId(),
      date: dateStr || getToday(),
      name: template.name,
      templateId: template.id,
      startTime: Date.now(),
      exercises: template.exercises.map((ex: any) => ({
        name: ex.name,
        sets: Array.from({ length: ex.sets }, () => ({
          weight: 0,
          reps: 0,
          type: "normal",
        })),
      })),
    };
    const newSessions = [...activeSessions, session];
    setActiveSessions(newSessions);
    setActiveSessionIndex(newSessions.length - 1);
    setCurrentPage("session");
  };

  const addNewSession = (template: any) => {
    if (activeSessions.length >= 5) return;
    const session = {
      id: generateId(),
      date: getToday(),
      name: template.name,
      templateId: template.id,
      startTime: Date.now(),
      _pending: true,
      exercises: template.exercises.map((ex: any) => ({
        name: ex.name,
        sets: Array.from({ length: ex.sets }, () => ({
          weight: 0,
          reps: 0,
          type: "normal",
        })),
      })),
    };
    const newSessions = [...activeSessions, session];
    setActiveSessions(newSessions);
    setActiveSessionIndex(newSessions.length - 1);
    // Stay on home page — user clicks LOG on the card to start logging
  };

  const finishWorkout = async (session: any) => {
    const cleanExercises = (session.exercises || [])
      .map((ex: any) => ({
        ...ex,
        sets: (ex.sets || []).filter(
          (s: any) =>
            !isNaN(Number(s.weight)) &&
            !isNaN(Number(s.reps)) &&
            Number(s.weight) > 0 &&
            Number(s.reps) > 0,
        ),
      }))
      .filter((ex: any) => ex.sets.length > 0);
    const workout = {
      ...session,
      endTime: Date.now(),
      exercises: cleanExercises,
    };
    // Update or add to history
    const exists = history.find((w: any) => w.id === workout.id);
    const newHistory = exists
      ? history.map((w: any) => (w.id === workout.id ? workout : w))
      : [...history, workout];
    setHistory(newHistory.sort((a, b) => a.date.localeCompare(b.date)));
    if (user) {
      setDoc(doc(db, "users", user.uid, "workouts", workout.id), workout);
    }
    // Remove the finished session from activeSessions entirely
    const updated = activeSessions.filter((_, i) => i !== activeSessionIndex);
    setActiveSessions(updated);
    setActiveSessionIndex(Math.max(0, updated.length - 1));
    setCurrentPage("home");
  };

  const saveAndReturnHome = () => {
    setCurrentPage("home");
  };

  const deleteWorkout = async (id: string) => {
    const newHistory = history.filter((w: any) => w.id !== id);
    setHistory(newHistory);
    // Also remove from activeSessions so home page doesn't show stale completed state
    const updatedSessions = activeSessions.filter((s: any) => s.id !== id);
    setActiveSessions(updatedSessions);
    setActiveSessionIndex(Math.max(0, updatedSessions.length - 1));
    if (user) {
      const { deleteDoc } = await import("firebase/firestore");
      deleteDoc(doc(db, "users", user.uid, "workouts", id));
    }
  };

  const finishAndSwitch = (templateId: string) => {
    if (activeSessions.length > 0) {
      const session = activeSessions[activeSessionIndex];
      const cleanExercises = (session.exercises || [])
        .map((ex: any) => ({
          ...ex,
          sets: (ex.sets || []).filter(
            (s: any) => Number(s.weight) > 0 && Number(s.reps) > 0,
          ),
        }))
        .filter((ex: any) => ex.sets.length > 0);
      if (cleanExercises.length > 0) {
        const workout = {
          ...session,
          endTime: Date.now(),
          exercises: cleanExercises,
        };
        const newHistory = [...history, workout].sort((a, b) =>
          a.date.localeCompare(b.date),
        );
        setHistory(newHistory);
        if (user)
          setDoc(doc(db, "users", user.uid, "workouts", workout.id), workout);
      }
    }
    setActiveSessions([]);
    setActiveSessionIndex(0);
    setDayOverrides((prev: any) => ({ ...prev, [getToday()]: templateId }));
    setCurrentPage("home");
  };

  const deleteAndSwitch = (templateId: string) => {
    setActiveSessions([]);
    setActiveSessionIndex(0);
    setDayOverrides((prev) => ({ ...prev, [getToday()]: templateId }));
    setCurrentPage("home");
  };

  const cancelWorkout = () => {
    // Remove the current in-progress session (don't remove completed ones)
    const updated = activeSessions.filter((_, i) => i !== activeSessionIndex);
    setActiveSessions(updated);
    setActiveSessionIndex(Math.max(0, updated.length - 1));
    setCurrentPage("home");
  };

  useEffect(() => {
    if (currentPage !== "session") {
      sessionStorage.setItem("currentPage", currentPage);
    }
  }, [currentPage]);

  const renderPage = () => {
    const safeIndex = Math.min(Math.max(0, activeSessionIndex), Math.max(0, activeSessions.length - 1));
    const currentSession = activeSessions.length > 0 ? activeSessions[safeIndex] : null;
    if (currentPage === "session") {
      if (!currentSession?.exercises) {
        return null;
      }
      return (
        <SessionPage
          session={currentSession}
          setSession={(s: any) => {
            const updated = activeSessions.map((sess, i) =>
              i === activeSessionIndex ? s : sess,
            );
            setActiveSessions(updated);
          }}
          onFinish={finishWorkout}
          onSaveAndReturn={saveAndReturnHome}
          onCancel={cancelWorkout}
          history={history}
        />
      );
    }
    switch (currentPage) {
      case "home":
        return (
          <HomePage
            todayDay={todayDay}
            todayTemplate={todayTemplate}
            schedule={schedule}
            templates={templates}
            history={history}
            onStartWorkout={(template, editingCompleted, dateStr) => startWorkout(template, editingCompleted, dateStr)}
            tasks={tasks}
            taskCompletions={taskCompletions}
            setTaskCompletions={setTaskCompletions}
            onScheduleChange={setSchedule}
            dayOverrides={dayOverrides}
            setDayOverrides={setDayOverrides}
            activeSessions={activeSessions}
            activeSessionIndex={activeSessionIndex}
            onContinueWorkout={(idx: number) => {
              const updated = activeSessions.map((s, i) => i === idx ? { ...s, _pending: false } : s);
              setActiveSessions(updated);
              setActiveSessionIndex(idx);
              setCurrentPage("session");
            }}
            onUpdatePendingSession={(sessionId: string, templateId: string) => {
              const template = templates.find(t => t.id === templateId);
              if (!template) return;
              const updated = activeSessions.map((s) =>
                s.id === sessionId ? {
                  ...s,
                  templateId: template.id,
                  name: template.name,
                  exercises: template.exercises.map((ex: any) => ({
                    name: ex.name,
                    sets: Array.from({ length: ex.sets }, () => ({ weight: 0, reps: 0, type: "normal" })),
                  })),
                } : s
              );
              setActiveSessions(updated);
            }}
            onAddNewSession={addNewSession}
            onFinishAndSwitch={finishAndSwitch}
            onDeleteAndSwitch={deleteAndSwitch}
          />
        );
      case "templates":
        return (
          <TemplatesPage
            templates={templates}
            setTemplates={setTemplates}
            tasks={tasks}
            setTasks={setTasks}
            exercises={exercises}
            setExercises={setExercises}
            workoutGroups={workoutGroups}
            setWorkoutGroups={setWorkoutGroups}
          />
        );
      case "history":
        return (
          <HistoryPage
            key="history"
            history={history}
            onDeleteWorkout={deleteWorkout}
          />
        );
      case "profile":
        return (
          <ProfilePage
            history={history}
            templates={templates}
            schedule={schedule}
            profileData={profileData}
            setProfileData={setProfileData}
          />
        );
      case "friends":
        return (
          <FriendsPage
            currentUser={user}
            schedule={schedule}
            templates={templates}
          />
        );
        return null;
    }
  };

  if (authLoading) return null;
  if (!user) return <LoginPage />;

  return (
    <div
      style={{
        background: COLORS.bg,
        minHeight: "100vh",
        color: COLORS.text,
        fontFamily: "system-ui",
      }}
    >
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div
        style={{
          padding: "0 20px",
          marginLeft: windowWidth >= 768 ? 60 : 0,
          height: "100vh",
          overflowY: currentPage === "profile" || currentPage === "friends" ? "auto" : "hidden",
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
          <div style={{ fontSize: 15, color: COLORS.dim }}>
            {currentPage === "session"
              ? `${user.email}/home/log`
              : `${profileData.username || user.email}/${currentPage}`}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => signOut(auth)}
              style={{
                background: "transparent",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: "6px 12px",
                color: COLORS.dim,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Sign out
            </button>
            <button
              onClick={() => {}}
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: COLORS.dim,
                fontSize: 18,
              }}
            >
              ⚙
            </button>
          </div>
        </div>
        {renderPage()}
      </div>
    </div>
  );
}
