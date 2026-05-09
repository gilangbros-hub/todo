'use client';

import Link from 'next/link';
import { PlayerStats } from '@/lib/types';
import { calculateLevel } from '@/lib/xp';

interface SidebarProps {
  playerStats: PlayerStats;
  activeRoute: string;
}

const NAV_LINKS = [
  { href: '/', label: 'Quest Board' },
  { href: '/master/types', label: 'Master Types' },
  { href: '/master/pics', label: 'Master PICs' },
  { href: '/account', label: 'Hero Profile' },
] as const;

export default function Sidebar({ playerStats, activeRoute }: SidebarProps) {
  const { level, xpInCurrentLevel, xpForNextLevel } = calculateLevel(playerStats.xp);
  const xpPercent = xpForNextLevel > 0 ? (xpInCurrentLevel / xpForNextLevel) * 100 : 0;

  return (
    <aside className="w-64 min-h-screen bg-rpg-card border-r-pixel border-rpg-border p-4 flex flex-col gap-6">
      {/* Player Stats Section */}
      <div className="flex flex-col gap-4">
        {/* Level Badge */}
        <div className="flex items-center justify-center">
          <div className="bg-rpg-dark pixel-border px-4 py-2 text-center">
            <p className="font-pixel text-[10px] text-rpg-legendary mb-1" style={{ textShadow: '0 0 8px #f0c040' }}>
              LEVEL
            </p>
            <p className="font-pixel text-2xl text-white" style={{ textShadow: '2px 2px 0px #000' }}>
              {level}
            </p>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="flex flex-col gap-1">
          <p className="font-pixel text-[8px] text-gray-400 uppercase tracking-wider">
            Experience
          </p>
          <div className="w-full h-4 bg-rpg-dark border-2 border-rpg-border rounded-pixel overflow-hidden">
            <div
              className="h-full bg-rpg-rare transition-all duration-300"
              style={{
                width: `${xpPercent}%`,
                boxShadow: '0 0 6px #4a9eff',
              }}
            />
          </div>
          <p className="font-retro text-sm text-gray-300 text-center">
            {xpInCurrentLevel} / {xpForNextLevel} XP
          </p>
        </div>

        {/* Streak */}
        <div className="flex items-center justify-center gap-2 bg-rpg-dark pixel-border px-3 py-2">
          <span className="text-lg" role="img" aria-label="streak fire">
            🔥
          </span>
          <span className="font-retro text-xl text-white">
            {playerStats.streak}
          </span>
          <span className="font-pixel text-[8px] text-gray-400">
            STREAK
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-2 mt-4" aria-label="Main navigation">
        {NAV_LINKS.map((link) => {
          const isActive = activeRoute === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                font-retro text-lg px-3 py-2 rounded-pixel border-2 transition-all duration-100
                ${
                  isActive
                    ? 'border-rpg-rare bg-rpg-dark text-rpg-rare shadow-rare'
                    : 'border-transparent text-gray-300 hover:border-rpg-border hover:text-white'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
