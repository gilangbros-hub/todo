"use client";

interface ProgressBarProps {
  current: number;
  max: number;
  color?: string;
}

export default function ProgressBar({
  current,
  max,
  color = "#f0c040",
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  return (
    <div
      className="w-full h-4 bg-rpg-dark pixel-border overflow-hidden"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${Math.round(percentage)}% progress`}
    >
      <div
        className="h-full transition-all duration-300 ease-in-out"
        style={{
          width: `${percentage}%`,
          backgroundColor: color,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
