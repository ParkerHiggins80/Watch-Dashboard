"use client";
import { useState } from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { COLORS } from "../constants";

export default function LoginPage() {
  const [mode, setMode]       = useState<"login" | "signup">("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const inp: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    background: COLORS.inner,
    color: COLORS.text,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (mode === "signup" && password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // auth state change in page.tsx will handle the redirect automatically
    } catch (e: any) {
      const msg: Record<string, string> = {
        "auth/user-not-found":    "No account found with that email.",
        "auth/wrong-password":    "Incorrect password.",
        "auth/email-already-in-use": "An account with that email already exists.",
        "auth/invalid-email":     "Invalid email address.",
        "auth/invalid-credential": "Incorrect email or password.",
      };
      setError(msg[e.code] || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 400,
        background: COLORS.card,
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        padding: 32,
      }}>
        {/* Title */}
        <h1 style={{ fontSize: 26, fontWeight: 700, color: COLORS.text, margin: "0 0 4px" }}>
          Workout Dashboard
        </h1>
        <p style={{ fontSize: 14, color: COLORS.dim, margin: "0 0 28px" }}>
          {mode === "login" ? "Sign in to your account" : "Create a new account"}
        </p>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, background: COLORS.inner, borderRadius: 10, padding: 4 }}>
          {(["login", "signup"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 7,
                border: "none",
                background: mode === m ? COLORS.accent : "transparent",
                color: mode === m ? COLORS.text : COLORS.dim,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {m === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            style={inp}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          <input
            style={inp}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          {mode === "signup" && (
            <input
              style={inp}
              type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: 13, color: "#f87171", margin: "12px 0 0", textAlign: "center" }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "13px 0",
            borderRadius: 10,
            border: "none",
            background: COLORS.accent,
            color: COLORS.text,
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
        </button>
      </div>
    </div>
  );
}