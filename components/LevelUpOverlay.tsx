"use client";

import { useEffect, useState } from "react";

interface LevelUpOverlayProps {
  newLevel: number;
  onDismiss: () => void;
}

export default function LevelUpOverlay({
  newLevel,
  onDismiss,
}: LevelUpOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss after 3s
    const dismissTimer = setTimeout(() => onDismiss(), 3000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
      role="alert"
      aria-live="assertive"
      aria-label={`Level up! You reached level ${newLevel}`}
    >
      {/* Pixel confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${Math.random() * 1.5}s`,
              animationDuration: `${2 + Math.random() * 1.5}s`,
            }}
          />
        ))}
      </div>

      {/* Level up text */}
      <div className="text-center z-10">
        <p
          className="font-pixel text-lg md:text-2xl mb-4 animate-pulse"
          style={{ color: "#f0c040", textShadow: "2px 2px 0px #000" }}
        >
          LEVEL UP!
        </p>
        <p
          className="font-pixel text-3xl md:text-5xl animate-pulse"
          style={{ color: "#f0c040", textShadow: "3px 3px 0px #000" }}
        >
          LV. {newLevel}
        </p>
      </div>
    </div>
  );
}

const CONFETTI_COLORS = [
  "#f0c040", // gold
  "#4a9eff", // blue
  "#a78bfa", // purple
  "#ef4444", // red
  "#22c55e", // green
  "#f97316", // orange
];
