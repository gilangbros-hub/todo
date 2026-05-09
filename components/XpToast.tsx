"use client";

import { useEffect, useState } from "react";

interface XpToastProps {
  amount: number;
  onDismiss: () => void;
}

export default function XpToast({ amount, onDismiss }: XpToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Trigger slide-in on mount
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    // Start fade-out before dismiss
    const fadeTimer = setTimeout(() => setIsFading(true), 2000);

    // Auto-dismiss after 2.5s
    const dismissTimer = setTimeout(() => onDismiss(), 2500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      } ${isFading ? "opacity-0" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={`Earned ${amount} XP`}
    >
      <div className="bg-rpg-card pixel-border px-5 py-3 shadow-legendary flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          ⚔️
        </span>
        <span
          className="font-pixel text-sm"
          style={{ color: "#f0c040", textShadow: "2px 2px 0px #000" }}
        >
          +{amount} XP
        </span>
      </div>
    </div>
  );
}
