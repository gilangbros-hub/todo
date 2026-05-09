"use client";

import { useEffect } from "react";

interface XpGainAnimationProps {
  amount: number;
  onComplete: () => void;
}

export default function XpGainAnimation({
  amount,
  onComplete,
}: XpGainAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <span
      className="inline-block font-pixel text-sm animate-xp-float pointer-events-none"
      style={{ color: "#f0c040", textShadow: "2px 2px 0px #000" }}
      aria-live="polite"
      aria-label={`Gained ${amount} XP`}
      role="status"
    >
      +{amount} XP
    </span>
  );
}
