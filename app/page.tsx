"use client";
import { useState, useEffect, useRef } from "react";
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
      if (saved) return saved;
    }
    return "home";
  });
  const [templates, setTemplates] = useState<any[]>(
    DEFAULT_TEMPLATES.map((t) => ({
      ...t,
      exercises: t.exercises.map((ex) => ({
        ...ex,
        repRange: ex.repRange ?? "8-12",
      })),
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
  const isSaving = useRef(false);
  const saveTimeout = useRef<any>(null);
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  const [dayOverrides, setDayOverrides] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [exercises, setExercises] = useState<any[]>([]);
  const [workoutGroups, setWorkoutGroups] = useState<any[]>([]);
  const [profileData, setProfileData] = useState({
    name: "",
    bio: "",
    gym: "",
    secondaryGym: "",
    gyms: [] as string[],
    photo: null as string | null,
    joinedDate: new Date().toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
    }),
  });

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
            if (d.profileData)
              setProfileData((prev) => ({
                ...prev,
                ...d.profileData,
                joinedDate:
                  d.profileData.joinedDate ??
                  prev.joinedDate ??
                  new Date().toLocaleDateString("en-US", {
                    month: "numeric",
                    day: "numeric",
                    year: "2-digit",
                  }),
              }));
            if (d.activeSessions && Array.isArray(d.activeSessions)) {
              const validSessions = d.activeSessions.filter(
                (s: any) => s?.id && s?.name,
              );
              if (validSessions.length > 0) {
                const loadedExercises = d.exercises ?? [];
                const loadedGroups = d.workoutGroups ?? [];
                setActiveSessions(
                  validSessions.map((s: any) => ({
                    ...s,
                    _exercises: loadedExercises,
                    _workoutGroups: loadedGroups,
                  })),
                );
                setActiveSessionIndex(d.activeSessionIndex ?? 0);
                if (
                  validSessions.some(
                    (s: any) =>
                      !s._completed &&
                      !s._editing &&
                      !s._pending &&
                      !s._savedHome,
                  )
                )
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

          // ── Backfill exercise index if not done yet ──
          try {
            const { setDoc: setDocFn, getDoc: getDocFn } =
              await import("firebase/firestore");
            const metaRef = doc(db, "users", u.uid, "exerciseIndex", "_meta");
            const metaSnap = await getDocFn(metaRef);
          if (!metaSnap.exists() || !metaSnap.data()?.backfilledV6) {
              const { writeBatch: writeBatchFn } = await import("firebase/firestore");

              // Load current exercises to get ids + variant info
              const userSnap = await getDoc(doc(db, "users", u.uid));
              const userExercises: any[] = userSnap.exists()
                ? (userSnap.data()?.exercises ?? [])
                : [];

              // ── Step 1: Add isMultivariant to exercise definitions ──
              const updatedExercises = userExercises.map((ex: any) => ({
                ...ex,
                isMultivariant: (ex.variants?.length ?? 0) > 1 ? true : undefined,
              }));
              // Strip undefined isMultivariant so standard exercises don't store the field
              const cleanedExercises = updatedExercises.map((ex: any) => {
                const { isMultivariant, ...rest } = ex;
                return isMultivariant ? { ...rest, isMultivariant: true } : rest;
              });
              await setDocFn(doc(db, "users", u.uid), { exercises: cleanedExercises }, { merge: true });
              console.log("V6 backfill: updated exercise definitions with isMultivariant");

              // ── Step 2: Rebuild index with new structure ──
              const indexMap: Record<string, { exerciseId: string; exerciseName: string; isMultivariant: boolean; points: any[] }> = {};

              for (const workout of sorted as any[]) {
                for (const ex of (workout.exercises || []) as any[]) {
                  const exDef = userExercises.find((e: any) => e.name === ex.name)
                    ?? userExercises.find((e: any) => ex.exerciseId && e.id === ex.exerciseId);
                  if (!exDef?.id) continue;

                  const isMultivariant = (exDef.variants?.length ?? 0) > 1;
                  const workingSets = (ex.sets || []).filter(
                    (s: any) => s.type !== "warmup" && s.weight > 0 && s.reps > 0,
                  );
                  if (workingSets.length === 0) continue;

                  if (!indexMap[exDef.id]) {
                    indexMap[exDef.id] = {
                      exerciseId: exDef.id,
                      exerciseName: ex.name,
                      isMultivariant,
                      points: [],
                    };
                  }

                  // Remove existing point for this date
                  indexMap[exDef.id].points = indexMap[exDef.id].points.filter(
                    (p: any) => p.date !== workout.date,
                  );

                  let newPoint: any;
                  if (isMultivariant) {
                    // Group sets by variantName
                    const defVariant = exDef.variants.find((v: any) => v.isDefault)?.name ?? exDef.variants[0]?.name ?? "Standard";
                    const variantMap: Record<string, { sets: any[] }> = {};
                    for (const s of workingSets) {
                      const vName = s.variantName ?? ex.variantName ?? defVariant;
                      if (!variantMap[vName]) variantMap[vName] = { sets: [] };
                      variantMap[vName].sets.push({
                        weight: s.weight,
                        reps: s.reps,
                        type: s.type ?? "normal",
                      });
                    }
                    newPoint = { date: workout.date, variants: variantMap };
                  } else {
                    // Standard — flat sets, maxWeight
                    newPoint = {
                      date: workout.date,
                      maxWeight: Math.max(...workingSets.map((s: any) => s.weight ?? 0)),
                      sets: workingSets.map((s: any) => ({
                        weight: s.weight,
                        reps: s.reps,
                        type: s.type ?? "normal",
                      })),
                    };
                  }
                  indexMap[exDef.id].points.push(newPoint);
                }
              }

              // Write rebuilt index documents
              const bfBatch = writeBatchFn(db);
              for (const [, indexDoc] of Object.entries(indexMap)) {
                indexDoc.points.sort((a: any, b: any) => a.date.localeCompare(b.date));
                bfBatch.set(
                  doc(db, "users", u.uid, "exerciseIndex", indexDoc.exerciseId),
                  indexDoc,
                );
              }
              await bfBatch.commit();
              console.log(`V6 backfill: rebuilt index for ${Object.keys(indexMap).length} exercise(s)`);

              // Mark complete
              await setDocFn(metaRef, {
                backfilled: true,
                backfilledV2: true,
                backfilledV3: true,
                backfilledV4: true,
                backfilledV5: true,
                backfilledV6: true,
                backfilledAt: Date.now(),
              });
              console.log("V6 backfill complete");
            }
          } catch (err) {
            console.error("Backfill error:", err);
          }
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
    console.log(
      "[SAVE EFFECT] triggered, page:",
      currentPage,
      "saveEnabled:",
      saveEnabled,
    );
    if (!user || !saveEnabled) return;
    console.log("[SAVE EFFECT] ref page:", currentPageRef.current);
    if (currentPageRef.current === "session") {
      return; // Session saves handled explicitly via setSession
    }
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
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
          exerciseId: ex.exerciseId ?? null,
          variantName: ex.variantName ?? null,
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
          variants: (ex.variants ?? []).map((v: any) => ({
            id: v.id ?? null,
            name: v.name ?? "",
            isDefault: v.isDefault ?? false,
            order: v.order ?? 0,
            sets: v.sets ?? 3,
            repRange: v.repRange ?? "8-12",
            dataFields: v.dataFields ?? [],
            subvariants: (v.subvariants ?? []).map((s: any) => ({
              id: s.id ?? null,
              name: s.name ?? "",
              isDefault: s.isDefault ?? false,
              order: s.order ?? 0,
              sets: s.sets ?? null,
              repRange: s.repRange ?? null,
              dataFields: s.dataFields ?? null,
            })),
          })),
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
        variants: (ex.variants ?? []).map((v: any) => ({
          id: v.id ?? null,
          name: v.name ?? "",
          isDefault: v.isDefault ?? false,
          order: v.order ?? 0,
          sets: v.sets ?? 3,
          repRange: v.repRange ?? "8-12",
          dataFields: v.dataFields ?? [],
          subvariants: (v.subvariants ?? []).map((s: any) => ({
            id: s.id ?? null,
            name: s.name ?? "",
            isDefault: s.isDefault ?? false,
            order: s.order ?? 0,
            sets: s.sets ?? null,
            repRange: s.repRange ?? null,
            dataFields: s.dataFields ?? null,
          })),
        })),
      }));

      const cleanWorkoutGroups = workoutGroups.map((g: any) => ({
        id: g.id ?? null,
        name: g.name ?? "",
      }));

      const payload = JSON.parse(
        JSON.stringify({
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
        }),
      );
      if (isSaving.current) {
        console.log("[SAVE EFFECT] blocked — already saving");
        return;
      }
      console.log("[SAVE EFFECT] writing to Firestore");
      isSaving.current = true;
      setDoc(doc(db, "users", user.uid), payload)
        .catch(() => {
          // Concurrent write — safe to ignore, next save will succeed
        })
        .finally(() => {
          isSaving.current = false;
        });
    }, 3000);
    return () => clearTimeout(saveTimeout.current);
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

  const startWorkout = (
    template: any,
    editingCompleted?: any,
    dateStr?: string,
  ) => {
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
          _exercises: exercises,
          _workoutGroups: workoutGroups,
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
      _templates: templates,
      _exercises: exercises,
      _workoutGroups: workoutGroups,
      exercises: template.exercises.map((ex: any) => {
        const exDef =
          exercises.find((e: any) => e.name === ex.name) ??
          exercises.find((e: any) => ex.exerciseId && e.id === ex.exerciseId);
        const defVariant = exDef?.variants?.find((v: any) => v.isDefault);
        const vName = defVariant?.name ?? null;
        return {
          name: ex.name,
          exerciseId: exDef?.id ?? null,
          variantName: vName,
          sets: Array.from({ length: ex.sets }, () => ({
            weight: 0,
            reps: 0,
            type: "normal",
            variantName: vName,
          })),
        };
      }),
    };
    const newSessions = [...activeSessions, session];
    setActiveSessions(newSessions);
    setActiveSessionIndex(newSessions.length - 1);
    setCurrentPage("session");
  };

  const addNewSession = (template: any, dateStr?: string) => {
    if (activeSessions.length >= 5) return;
    const session = {
      id: generateId(),
      date: dateStr || getToday(),
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
            s._touched &&
            !isNaN(Number(s.weight)) &&
            !isNaN(Number(s.reps)) &&
            Number(s.weight) > 0 &&
            Number(s.reps) > 0,
        ),
      }))
      .filter((ex: any) => ex.sets.length > 0);
    const { _templates, _exercises, _workoutGroups, ...sessionClean } = session;
    const workout = {
      ...sessionClean,
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
      setDoc(doc(db, "users", user.uid, "workouts", workout.id), workout).catch(
        () => {},
      );

      // ── Write exercise index ──
      try {
        const { getDoc: getDocFn, writeBatch } =
          await import("firebase/firestore");
        const batch = writeBatch(db);

        for (const ex of cleanExercises) {
          if (!ex.exerciseId) continue;
          const exDef = exercises.find((e: any) => e.id === ex.exerciseId);
          const isMultivariant = (exDef?.variants?.length ?? 0) > 1;
          const workingSets = ex.sets.filter(
            (s: any) => s.type !== "warmup" && s.weight > 0 && s.reps > 0,
          );
          if (workingSets.length === 0) continue;

          const idxRef = doc(
            db,
            "users",
            user.uid,
            "exerciseIndex",
            ex.exerciseId,
          );
          const idxSnap = await getDocFn(idxRef);
          const existingPoints = idxSnap.exists()
            ? (idxSnap.data().points ?? []).filter(
                (p: any) => p.date !== workout.date,
              )
            : [];

          let newPoint: any;
          if (isMultivariant) {
            // Group sets by variantName
            const variantMap: Record<string, { sets: any[] }> = {};
            for (const s of workingSets) {
              const vName = s.variantName ?? ex.variantName ?? "Standard";
              if (!variantMap[vName]) variantMap[vName] = { sets: [] };
              variantMap[vName].sets.push({
                weight: s.weight ?? 0,
                reps: s.reps ?? 0,
                type: s.type ?? "normal",
              });
            }
            newPoint = { date: workout.date, variants: variantMap };
          } else {
            // Standard — flat sets, no variant fields
            newPoint = {
              date: workout.date,
              maxWeight: Math.max(
                ...workingSets.map((s: any) => s.weight ?? 0),
              ),
              sets: workingSets.map((s: any) => ({
                weight: s.weight ?? 0,
                reps: s.reps ?? 0,
                type: s.type ?? "normal",
              })),
            };
          }

          batch.set(idxRef, {
            exerciseId: ex.exerciseId,
            exerciseName: ex.name,
            isMultivariant,
            points: [...existingPoints, newPoint].sort((a: any, b: any) =>
              a.date.localeCompare(b.date),
            ),
          });
        }
        await batch.commit();
      } catch (err) {
        console.error("Exercise index write error:", err);
      }
    }
    // Remove the finished session from activeSessions entirely
    const updated = activeSessions.filter((_, i) => i !== activeSessionIndex);
    setActiveSessions(updated);
    setActiveSessionIndex(Math.max(0, updated.length - 1));
    if (session.date) setSelectedDate(new Date(session.date + "T12:00:00"));
    setSaveEnabled(false);
    setTimeout(() => setSaveEnabled(true), 3000);
    setCurrentPage("home");
  };

  const saveAndReturnHome = (sessionDate?: string) => {
    if (sessionDate) setSelectedDate(new Date(sessionDate + "T12:00:00"));
    const updated = activeSessions.map((s, i) =>
      i === activeSessionIndex
        ? { ...s, _pending: false, _savedHome: true }
        : s,
    );
    setActiveSessions(updated);
    // Force immediate save to Firestore with _pending: true
    if (user) {
      const cleanSessions = updated.map((s: any) => ({
        id: s.id,
        date: s.date,
        name: s.name,
        templateId: s.templateId ?? null,
        startTime: s.startTime ?? null,
        endTime: s.endTime ?? null,
        _completed: s._completed ?? false,
        _editing: s._editing ?? false,
        _pending: s._pending ?? false,
        _savedHome: s._savedHome ?? false,
        exercises: (s.exercises || []).map((ex: any) => ({
          name: ex.name,
          exerciseId: ex.exerciseId ?? null,
          variantName: ex.variantName ?? null,
          sets: (ex.sets || []).map((set: any) => ({
            weight: set.weight ?? 0,
            reps: set.reps ?? 0,
            type: set.type ?? "normal",
            _touched: set._touched ?? false,
          })),
        })),
      }));
      setDoc(
        doc(db, "users", user.uid),
        { activeSessions: cleanSessions },
        { merge: true },
      ).catch(() => {});
    }
    setCurrentPage("home");
  };

  const deleteWorkout = async (id: string) => {
    const newHistory = history.filter((w: any) => w.id !== id);
    setHistory(newHistory);
    const updatedSessions = activeSessions.filter((s: any) => s.id !== id);
    setActiveSessions(updatedSessions);
    setActiveSessionIndex(Math.max(0, updatedSessions.length - 1));
    const deletedSession = activeSessions.find((s: any) => s.id === id);
    if (deletedSession?.date)
      setSelectedDate(new Date(deletedSession.date + "T12:00:00"));
    setCurrentPage("home");
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
          setDoc(
            doc(db, "users", user.uid, "workouts", workout.id),
            workout,
          ).catch(() => {});
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

  const saveSessionToFirestore = (sessions: any[]) => {
    if (!user) return;
    const cleanSessions = sessions.map((s: any) => ({
      id: s.id,
      date: s.date,
      name: s.name,
      templateId: s.templateId ?? null,
      startTime: s.startTime ?? null,
      _completed: s._completed ?? false,
      _editing: s._editing ?? false,
      _pending: s._pending ?? false,
      _savedHome: false,
      exercises: (s.exercises || []).map((ex: any) => ({
        name: ex.name,
        exerciseId: ex.exerciseId ?? null,
        variantName: ex.variantName ?? null,
        sets: (ex.sets || []).map((set: any) => ({
          weight: set.weight ?? 0,
          reps: set.reps ?? 0,
          type: set.type ?? "normal",
          _touched: set._touched ?? false,
        })),
      })),
      currentExerciseIndex: s.currentExerciseIndex ?? 0,
      currentSetIndex: s.currentSetIndex ?? 0,
    }));
    setDoc(
      doc(db, "users", user.uid),
      { activeSessions: cleanSessions, activeSessionIndex },
      { merge: true },
    ).catch(() => {});
  };

  const saveEdits = async (session: any) => {
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
    const { _templates, _exercises, _workoutGroups, ...sessionClean } = session;
    const workout = {
      ...sessionClean,
      exercises: cleanExercises,
      _editing: false,
      _completed: false,
    };
    const newHistory = history.map((w: any) =>
      w.id === workout.id ? workout : w,
    );
    setHistory(newHistory.sort((a, b) => a.date.localeCompare(b.date)));
    if (user) {
      setDoc(doc(db, "users", user.uid, "workouts", workout.id), workout).catch(() => {});
    }
    // Remove the editing session from activeSessions entirely
    const updated = activeSessions.filter((_, i) => i !== activeSessionIndex);
    setActiveSessions(updated);
    setActiveSessionIndex(Math.max(0, updated.length - 1));
    if (session.date) setSelectedDate(new Date(session.date + "T12:00:00"));
    setCurrentPage("home");
  };

  const cancelWorkout = () => {
    const session = activeSessions[activeSessionIndex];
    // If cancelling an edit, just remove from activeSessions — don't touch history
    const updated = activeSessions.filter((_, i) => i !== activeSessionIndex);
    setActiveSessions(updated);
    setActiveSessionIndex(Math.max(0, updated.length - 1));
    if (session?.date) setSelectedDate(new Date(session.date + "T12:00:00"));
    setCurrentPage("home");
  };

  useEffect(() => {
    sessionStorage.setItem("currentPage", currentPage);
  }, [currentPage]);

  const renderPage = () => {
    const safeIndex = Math.min(
      Math.max(0, activeSessionIndex),
      Math.max(0, activeSessions.length - 1),
    );
    const currentSession =
      activeSessions.length > 0 ? activeSessions[safeIndex] : null;
    if (currentPage === "session") {
      if (!currentSession?.exercises) {
        if (!dataLoaded)
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                color: COLORS.dim,
                fontSize: 16,
              }}
            >
              Loading...
            </div>
          );
        setCurrentPage("home");
        return null;
      }
      return (
        <SessionPage
          session={currentSession}
          setSession={(s: any) => {
            const updated = activeSessions.map((sess, i) =>
              i === activeSessionIndex
                ? { ...s, _exercises: exercises, _workoutGroups: workoutGroups }
                : sess,
            );
            setActiveSessions(updated);
            saveSessionToFirestore(updated);
          }}
          exercises={exercises}
          setExercises={setExercises}
          workoutGroups={workoutGroups}
          onFinish={finishWorkout}
          onSaveAndReturn={() => saveAndReturnHome(currentSession?.date)}
          onCancel={cancelWorkout}
          onSaveEdits={saveEdits}
          onDeleteWorkout={deleteWorkout}
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
            onStartWorkout={(template, editingCompleted, dateStr) =>
              startWorkout(template, editingCompleted, dateStr)
            }
            tasks={tasks}
            taskCompletions={taskCompletions}
            setTaskCompletions={setTaskCompletions}
            onScheduleChange={setSchedule}
            dayOverrides={dayOverrides}
            setDayOverrides={setDayOverrides}
            activeSessions={activeSessions}
            activeSessionIndex={activeSessionIndex}
            onContinueWorkout={(idx: number) => {
              const updated = activeSessions.map((s, i) =>
                i === idx
                  ? {
                      ...s,
                      _pending: false,
                      _savedHome: false,
                      _exercises: exercises,
                      _workoutGroups: workoutGroups,
                    }
                  : s,
              );
              setActiveSessions(updated);
              setActiveSessionIndex(idx);
              setCurrentPage("session");
            }}
            onUpdatePendingSession={(sessionId: string, templateId: string) => {
              const template = templates.find((t) => t.id === templateId);
              if (!template) return;
              const updated = activeSessions.map((s) =>
                s.id === sessionId
                  ? {
                      ...s,
                      templateId: template.id,
                      name: template.name,
                      exercises: template.exercises.map((ex: any) => ({
                        name: ex.name,
                        sets: Array.from({ length: ex.sets }, () => ({
                          weight: 0,
                          reps: 0,
                          type: "normal",
                        })),
                      })),
                    }
                  : s,
              );
              setActiveSessions(updated);
            }}
            onAddNewSession={addNewSession}
            onRemovePendingSession={(sessionId: string) => {
              setActiveSessions((prev) =>
                prev.filter((s) => s.id !== sessionId),
              );
            }}
            onFinishAndSwitch={finishAndSwitch}
            onDeleteAndSwitch={deleteAndSwitch}
            gyms={profileData.gyms ?? []}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
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
            profileData={{
              ...profileData,
              username: (profileData as any).username ?? "",
              gyms: (profileData as any).gyms ?? [],
            }}
            setProfileData={setProfileData}
          />
        );
      case "friends":
        return (
          <FriendsPage
            currentUser={{ uid: user!.uid, email: user!.email ?? "" }}
            schedule={schedule}
            templates={templates}
            onTemplateSaved={(t) => setTemplates((prev) => [...prev, t])}
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
          padding: "16px 20px",
          marginLeft: currentPage === "session" ? 0 : 60,
          height: "100vh",
          overflowY:
            currentPage === "profile" || currentPage === "friends"
              ? "auto"
              : "hidden",
        }}
      >
        
        {renderPage()}
      </div>
    </div>
  );
}
