'use client';

interface ScoreOrbProps {
  score: number;
  label?: string;
}

export function ScoreOrb({ score, label = 'Verdict' }: ScoreOrbProps) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  // Circle geometry
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-44 h-44 flex items-center justify-center animate-score-orb-pulse">
        {/* Background circle */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(200, 169, 110, 0.1)"
            strokeWidth="8"
          />
          {/* Animated fill circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#goldGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-score-orb-fill"
            style={{
              '--score-offset': `${offset}`,
              '--circumference': `${circumference}`,
            } as React.CSSProperties}
          />
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ecc14f" />
              <stop offset="100%" stopColor="#ffdf95" />
            </linearGradient>
          </defs>
        </svg>

        {/* Score number */}
        <span className="font-oracle-display text-4xl text-oracle-gold relative z-10">
          {clampedScore}
        </span>
      </div>

      {/* Label */}
      <span className="font-oracle-mono text-sm text-oracle-muted uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
