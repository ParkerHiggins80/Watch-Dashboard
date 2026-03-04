"use client";
import { useState } from "react";
import { COLORS, formatDate, calculateVolume } from "../constants";

interface HistoryPageProps {
  history: any[];
  onDeleteWorkout: (id: string) => void;
}

export default function HistoryPage({ history, onDeleteWorkout }: HistoryPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cardStyle = {
    background: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    border: `1px solid ${COLORS.border}`,
    cursor: "pointer",
  };

  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));

  const deleteWorkout = (id: string) => {
    onDeleteWorkout(id);
    setExpandedId(null);
  };

  const getTotalVolume = (workout: any) => {
    return workout.exercises.reduce((total: number, ex: any) => total + calculateVolume(ex.sets), 0);
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>History</h1>

      {sorted.length === 0 ? (
        <div
          style={{
            background: COLORS.card,
            borderRadius: 12,
            padding: 40,
            border: `1px solid ${COLORS.border}`,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
          <p style={{ color: COLORS.dim, margin: 0 }}>No workouts yet. Complete your first workout to see it here!</p>
        </div>
      ) : (
        sorted.map((workout) => {
          const isExpanded = expandedId === workout.id;
          const totalVolume = getTotalVolume(workout);
          const duration = workout.endTime && workout.startTime
            ? Math.round((workout.endTime - workout.startTime) / 60000)
            : null;

          return (
            <div
              key={workout.id}
              style={cardStyle}
              onClick={() => setExpandedId(isExpanded ? null : workout.id)}
            >
              {/* Summary Row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{workout.name}</div>
                  <div style={{ fontSize: 13, color: COLORS.dim, marginTop: 2 }}>
                    {formatDate(workout.date)}
                    {duration && ` — ${duration} min`}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{totalVolume.toLocaleString()} lbs</div>
                  <div style={{ fontSize: 12, color: COLORS.dim }}>total volume</div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ marginTop: 16, borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
                  {workout.exercises.map((ex: any, i: number) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{ex.name}</div>
                      {ex.sets.map((set: any, j: number) => (
                        <div
                          key={j}
                          style={{
                            display: "flex",
                            gap: 12,
                            fontSize: 13,
                            color: set.type === "warmup" ? COLORS.orange : COLORS.dim,
                            padding: "2px 0",
                          }}
                        >
                          <span style={{ minWidth: 60 }}>Set {j + 1}</span>
                          <span>{set.weight} lbs</span>
                          <span>× {set.reps} reps</span>
                          {set.type !== "normal" && (
                            <span style={{ color: COLORS.orange, fontSize: 11 }}>({set.type})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWorkout(workout.id);
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: `1px solid ${COLORS.red}`,
                      background: "transparent",
                      color: COLORS.red,
                      cursor: "pointer",
                      fontSize: 13,
                      width: "100%",
                      marginTop: 8,
                    }}
                  >
                    Delete Workout
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}