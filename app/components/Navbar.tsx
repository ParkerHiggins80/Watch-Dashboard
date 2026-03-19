"use client";
import { useState, useEffect } from "react";
import { COLORS } from "../constants";

const mainTabs = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "templates", label: "Templates", emoji: "📋" },
  { id: "history", label: "History", emoji: "📚" },
  { id: "friends", label: "Friends", emoji: "👥" },
];
const profileTab = { id: "profile", label: "Profile", emoji: "👤" };

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const [windowWidth, setWindowWidth] = useState(1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  if (currentPage === "session") return null;

  

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 16,
        paddingBottom: 16,
        gap: 8,
        background: COLORS.card,
        borderRight: `1px solid ${COLORS.border}`,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", flex: 1 }}>
        {mainTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            title={tab.label}
            style={{
              width: 44, height: 44, borderRadius: 10, border: "none",
              background: currentPage === tab.id ? COLORS.accent : "transparent",
              color: currentPage === tab.id ? COLORS.text : COLORS.dim,
              cursor: "pointer", fontSize: 20, display: "flex",
              alignItems: "center", justifyContent: "center", transition: "all 0.2s",
            }}
          >
            {tab.emoji}
          </button>
        ))}
      </div>
      <button
        onClick={() => onNavigate("profile")}
        title="Profile"
        style={{
          width: 44, height: 44, borderRadius: 10, border: "none",
          background: currentPage === "profile" ? COLORS.accent : "transparent",
          color: currentPage === "profile" ? COLORS.text : COLORS.dim,
          cursor: "pointer", fontSize: 20, display: "flex",
          alignItems: "center", justifyContent: "center", transition: "all 0.2s",
        }}
      >
        👤
      </button>
    </div>
  );
}
