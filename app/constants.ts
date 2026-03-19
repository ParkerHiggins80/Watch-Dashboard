// ============ COLORS ============
export const COLORS = {
  bg: "#0a0a0a",
  card: "#1a1a1a",
  inner: "#141414",
  border: "#2a2a2a",
  text: "#ffffff",
  dim: "#888888",
  accent: "#3b82f6",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  yellow: "#feca57",
  purple: "#a29bfe",
  pink: "#fd79a8",
};

// ============ DAYS ============
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const TODAY_INDEX = (new Date().getDay() + 6) % 7; // 0 = Monday

// ============ SET TYPES ============
export const SET_TYPES = [
  { id: "normal", label: "Normal", color: COLORS.text },
  { id: "warmup", label: "Warmup", color: COLORS.orange },
  { id: "drop", label: "Drop Set", color: COLORS.orange },
];

// ============ VARIANT TYPES ============

export interface DataField {
  id: string;
  name: string;
  type: "weight" | "reps" | "time" | "custom" | "number";
  unit?: string;
}

export interface Subvariant {
  id: string;
  name: string;
  isDefault: boolean;
  order: number;
  sets?: number;
  repRange?: string;
  dataFields?: DataField[];
}

export interface Variant {
  id: string;
  name: string;
  isDefault: boolean;
  order: number;
  sets: number;
  repRange: string;
  dataFields: DataField[];
  subvariants?: Subvariant[];
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  sets: number;
  repRange: string;
  groupIds: string[];
  variants: Variant[];
}

// ============ EQUIPMENT PRESETS ============

export const EQUIPMENT_PRESETS = [
  "Barbell",
  "Dumbbell",
  "Cable",
  "Machine",
  "Smith Machine",
  "Kettlebell",
  "Bodyweight",
  "Bands",
];

// ============ DEFAULT DATA FIELDS ============

export const DEFAULT_DATA_FIELDS: DataField[] = [
  { id: "weight", name: "Weight", type: "weight", unit: "lbs" },
  { id: "reps",   name: "Reps",   type: "reps" },
];

export const OPTIONAL_DATA_FIELDS: DataField[] = [
  { id: "weight", name: "Weight", type: "number", unit: "lbs" },
  { id: "reps", name: "Reps", type: "number" },
  { id: "time", name: "Time", type: "time", unit: "min:sec" },
];

// ============ DEFAULT TASKS ============
export const DEFAULT_TASKS: string[] = [
  "Protein Shake",
  "Creatine",
  "8hrs Sleep",
  "Macros",
  "",
  "",
  "",
];

// ============ EXERCISE LIBRARY ============
export const EXERCISES: Record<string, string[]> = {
  Chest: [
    "Bench Press", "Incline Bench Press", "Decline Bench Press",
    "Dumbbell Press", "Incline Dumbbell Press", "Chest Fly",
    "Cable Fly", "Push-ups", "Dips",
  ],
  Back: [
    "Deadlift", "Barbell Row", "Dumbbell Row", "Pull-ups",
    "Lat Pulldown", "Seated Row", "T-Bar Row", "Face Pulls",
  ],
  Shoulders: [
    "Overhead Press", "Arnold Press", "Lateral Raise",
    "Front Raise", "Rear Delt Fly", "Upright Row", "Shrugs",
  ],
  Arms: [
    "Barbell Curl", "Dumbbell Curl", "Hammer Curl",
    "Preacher Curl", "Cable Curl", "Tricep Pushdown",
    "Overhead Extension", "Skull Crushers", "Close Grip Bench",
  ],
  Legs: [
    "Squat", "Front Squat", "Leg Press", "Leg Extension",
    "Leg Curl", "Romanian Deadlift", "Lunges",
    "Bulgarian Split Squat", "Calf Raise",
  ],
  Core: [
    "Crunches", "Leg Raises", "Planks",
    "Russian Twist", "Cable Crunch", "Ab Wheel",
  ],
};

// ============ DEFAULT TEMPLATES ============

const mkEx = (name: string, sets: number, repRange: string, variantName = "Barbell") => ({
  name,
  sets,
  repRange,
  variants: [{
    id: `${name}-v0`,
    name: variantName,
    isDefault: true,
    order: 0,
    sets,
    repRange,
    dataFields: [...DEFAULT_DATA_FIELDS],
  }],
});

export const DEFAULT_TEMPLATES = [
  {
    id: "push",
    name: "Push Day",
    exercises: [
      mkEx("Bench Press",            4, "6-8"),
      mkEx("Overhead Press",         3, "8-10"),
      mkEx("Incline Dumbbell Press", 3, "8-12",  "Dumbbell"),
      mkEx("Tricep Pushdown",        3, "10-12", "Cable"),
      mkEx("Lateral Raise",          3, "12-15", "Dumbbell"),
    ],
  },
  {
    id: "pull",
    name: "Pull Day",
    exercises: [
      mkEx("Deadlift",      3, "5"),
      mkEx("Barbell Row",   3, "6-8"),
      mkEx("Lat Pulldown",  3, "8-12",  "Cable"),
      mkEx("Dumbbell Curl", 3, "10-12", "Dumbbell"),
      mkEx("Face Pulls",    3, "15-20", "Cable"),
    ],
  },
  {
    id: "legs",
    name: "Leg Day",
    exercises: [
      mkEx("Squat",             4, "5"),
      mkEx("Leg Press",         3, "8-12",  "Machine"),
      mkEx("Romanian Deadlift", 3, "8-10"),
      mkEx("Calf Raise",        3, "15-20", "Machine"),
      mkEx("Leg Curl",          3, "10-12", "Machine"),
    ],
  },
  {
    id: "rest",
    name: "Rest",
    exercises: [],
  },
];

// ============ DEFAULT SCHEDULE ============
export const DEFAULT_SCHEDULE: Record<string, string> = {
  Monday: "push",
  Tuesday: "pull",
  Wednesday: "rest",
  Thursday: "legs",
  Friday: "push",
  Saturday: "pull",
  Sunday: "rest",
};

// ============ HELPER FUNCTIONS ============
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

// ============ VARIANT HELPER ============

export const makeDefaultVariant = (sets: number, repRange: string): Variant => ({
  id: generateId(),
  name: "Barbell",
  isDefault: true,
  order: 0,
  sets,
  repRange,
  dataFields: [...DEFAULT_DATA_FIELDS],
});

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

export const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const calculateVolume = (sets: any[]) => {
  return sets
    .filter((s: any) => s.type !== "warmup")
    .reduce((total: number, s: any) => total + (s.reps || 0) * (s.weight || 0), 0);
};

export const calculateMax = (sets: any[]) => {
  const weights = sets.filter((s: any) => s.type !== "warmup").map((s: any) => s.weight || 0);
  return weights.length > 0 ? Math.max(...weights) : 0;
};

export const estimate1RM = (weight: number, reps: number) => {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

export const getFormattedDate = () => {
  const today = new Date();
  const day = today.getDate();

  // Figure out the suffix (st, nd, rd, th)
  const suffix =
    day % 10 === 1 && day !== 11 ? "st"
    : day % 10 === 2 && day !== 12 ? "nd"
    : day % 10 === 3 && day !== 13 ? "rd"
    : "th";

  const weekday = today.toLocaleDateString("en-US", { weekday: "long" });
  const month = today.toLocaleDateString("en-US", { month: "long" });
  const year = today.getFullYear();

  return `${weekday}, ${month} ${day}${suffix}, ${year}`;
};