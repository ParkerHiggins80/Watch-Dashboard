"use client"
import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

const C = {
  bg: "#0a0a0f",
  cd: "#13131d",
  bd: "#1e1e2e",
  ac: "#6c5ce7",
  tx: "#e2e2e8",
  dm: "#8888a0",
  gn: "#00cec9",
  rd: "#ff6b6b",
};

const IN = {
  background: "#1a1a2e",
  border: `1px solid ${C.bd}`,
  borderRadius: 8,
  padding: "12px 16px",
  color: C.tx,
  fontSize: 14,
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const
};

interface AuthWrapperProps {
  children: (user: User, handleSignOut: () => Promise<void>) => React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        background: C.bg, 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: C.tx 
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>💪</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        background: C.bg, 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        padding: 20
      }}>
        <div style={{ 
          maxWidth: 400, 
          width: "100%",
          background: C.cd,
          borderRadius: 16,
          border: `1px solid ${C.bd}`,
          padding: 40
        }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💪</div>
            <h1 style={{ 
              margin: 0, 
              fontSize: 28, 
              fontWeight: 700, 
              color: C.tx,
              marginBottom: 8
            }}>
              Workout Dashboard
            </h1>
            <p style={{ margin: 0, color: C.dm, fontSize: 14 }}>
              Track your fitness journey
            </p>
          </div>

          <div style={{ 
            display: "flex", 
            gap: 8, 
            marginBottom: 24,
            background: C.bg,
            padding: 4,
            borderRadius: 8
          }}>
            <button
              onClick={() => setIsLogin(true)}
              style={{
                flex: 1,
                padding: "10px 20px",
                borderRadius: 6,
                border: "none",
                background: isLogin ? C.ac : "transparent",
                color: isLogin ? "#fff" : C.dm,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              style={{
                flex: 1,
                padding: "10px 20px",
                borderRadius: 6,
                border: "none",
                background: !isLogin ? C.ac : "transparent",
                color: !isLogin ? "#fff" : C.dm,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600
              }}
            >
              Sign Up
            </button>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: "block", 
                marginBottom: 8, 
                fontSize: 13, 
                color: C.dm,
                fontWeight: 600
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={IN}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: "block", 
                marginBottom: 8, 
                fontSize: 13, 
                color: C.dm,
                fontWeight: 600
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={IN}
              />
            </div>

            {error && (
              <div style={{ 
                padding: 12, 
                background: C.rd + "22", 
                border: `1px solid ${C.rd}`,
                borderRadius: 8,
                color: C.rd,
                fontSize: 13,
                marginBottom: 16
              }}>
                {error}
              </div>
            )}

            <button
              onClick={isLogin ? handleSignIn : handleSignUp}
              style={{
                width: "100%",
                padding: "12px 24px",
                borderRadius: 8,
                border: "none",
                background: C.ac,
                color: "#fff",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600
              }}
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </div>

          <div style={{ textAlign: "center", fontSize: 12, color: C.dm }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              style={{
                background: "none",
                border: "none",
                color: C.ac,
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: 12
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children(user, handleSignOut)}</>;
}