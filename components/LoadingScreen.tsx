'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const LOADING_QUOTES = [
  "A hero's greatest weapon is persistence.",
  "Every quest begins with a single step... or a click.",
  "The grind never stops. Neither should you.",
  "Legends aren't born — they're checked off a to-do list.",
  "Rest at the inn, but never abandon the quest.",
  "Your XP bar won't fill itself, adventurer.",
  "Even the Demon King started with side quests.",
  "Critical hit! You actually opened your task list.",
  "The real treasure was the tasks you completed along the way.",
  "Beware of procrastination — it deals poison damage over time.",
  "A wise adventurer breaks big quests into smaller ones.",
  "Your streak is your shield. Don't let it break.",
  "No quest is too small if it grants experience.",
  "The quest board refreshes daily. Do you?",
  "Overdue quests attract monsters. Handle them quickly.",
  "Party members work best when everyone pulls their weight.",
  "Sometimes the hardest boss is just getting started.",
  "Rare quests demand rare dedication.",
  "Level up your focus. It's your most legendary stat.",
  "The adventurer who plans ahead never runs out of potions.",
] as const;

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [quote] = useState(() => LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)]);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Animate progress bar over ~2.5 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Random increment for a more "game-like" feel
        const increment = Math.random() * 15 + 5;
        return Math.min(100, prev + increment);
      });
    }, 200);

    // Start fade out at 2.5s, complete at 3s
    const fadeTimer = setTimeout(() => setFadeOut(true), 2500);
    const completeTimer = setTimeout(() => onComplete(), 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-rpg-dark transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Logo */}
      <div className="mb-8 animate-pulse">
        <Image
          src="/logo.png"
          alt="Quest Board"
          width={120}
          height={120}
          className="pixel-art"
          priority
        />
      </div>

      {/* Title */}
      <h1
        className="font-pixel text-lg text-rpg-legendary mb-8"
        style={{ textShadow: '0 0 10px #f0c040, 2px 2px 0px #000' }}
      >
        Quest Board
      </h1>

      {/* Progress Bar */}
      <div className="w-64 h-4 bg-rpg-card border-2 border-rpg-border rounded-pixel overflow-hidden mb-6">
        <div
          className="h-full bg-rpg-rare transition-all duration-200 ease-out"
          style={{
            width: `${progress}%`,
            boxShadow: '0 0 8px #4a9eff',
          }}
        />
      </div>

      {/* Loading text */}
      <p className="font-pixel text-[10px] text-gray-400 mb-6 animate-pulse">
        Loading quest data...
      </p>

      {/* Random Quote */}
      <div className="max-w-md px-6 text-center">
        <p className="font-retro text-lg text-gray-300 italic">
          &ldquo;{quote}&rdquo;
        </p>
      </div>

      {/* Decorative dots */}
      <div className="absolute bottom-8 flex gap-2">
        <span className="w-2 h-2 bg-rpg-legendary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-rpg-legendary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-rpg-legendary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
