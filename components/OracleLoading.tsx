'use client';

import { useState, useEffect, useRef } from 'react';

const GAMING_QUOTES = [
  { quote: "It's dangerous to go alone! Take this.", source: "The Legend of Zelda" },
  { quote: "War. War never changes.", source: "Fallout" },
  { quote: "The cake is a lie.", source: "Portal" },
  { quote: "Do a barrel roll!", source: "Star Fox 64" },
  { quote: "Stay awhile and listen.", source: "Diablo II" },
  { quote: "Would you kindly?", source: "BioShock" },
  { quote: "I used to be an adventurer like you, then I took an arrow in the knee.", source: "Skyrim" },
  { quote: "A man chooses, a slave obeys.", source: "BioShock" },
  { quote: "Nothing is true, everything is permitted.", source: "Assassin's Creed" },
  { quote: "The right man in the wrong place can make all the difference in the world.", source: "Half-Life 2" },
  { quote: "What is better — to be born good, or to overcome your evil nature through great effort?", source: "Skyrim" },
  { quote: "We all make choices, but in the end our choices make us.", source: "BioShock" },
  { quote: "It's a-me, Mario!", source: "Super Mario 64" },
  { quote: "Hey! Listen!", source: "The Legend of Zelda: Ocarina of Time" },
  { quote: "Praise the Sun!", source: "Dark Souls" },
  { quote: "You Died.", source: "Dark Souls" },
  { quote: "Snake? Snake?! SNAAAAKE!", source: "Metal Gear Solid" },
  { quote: "Boy.", source: "God of War" },
  { quote: "Protocol 3: Protect the Pilot.", source: "Titanfall 2" },
  { quote: "Had to be me. Someone else might have gotten it wrong.", source: "Mass Effect" },
  { quote: "The numbers, Mason! What do they mean?", source: "Call of Duty: Black Ops" },
  { quote: "Kept you waiting, huh?", source: "Metal Gear Solid" },
  { quote: "I should go.", source: "Mass Effect" },
  { quote: "Wasted.", source: "Grand Theft Auto" },
  { quote: "Finish him!", source: "Mortal Kombat" },
  { quote: "All your base are belong to us.", source: "Zero Wing" },
  { quote: "Thank you Mario! But our princess is in another castle!", source: "Super Mario Bros." },
  { quote: "A hero need not speak. When he is gone, the world will speak for him.", source: "Halo" },
  { quote: "Stand amongst the ashes of a trillion dead souls, and ask the ghosts if honor matters.", source: "Mass Effect 3" },
  { quote: "Time is money, friend!", source: "World of Warcraft" },
  { quote: "Do you get to the Cloud District very often? Oh, what am I saying, of course you don't.", source: "Skyrim" },
  { quote: "Hesitation is defeat.", source: "Sekiro" },
  { quote: "Wind's howling.", source: "The Witcher 3" },
  { quote: "How about a round of Gwent?", source: "The Witcher 3" },
  { quote: "You're finally awake.", source: "Skyrim" },
] as const;

interface OracleLoadingProps {
  title: string;
  elapsed: number;
  onKill?: () => void;
  reasoning?: string;
  status?: string;
  phase?: string;
}

export default function OracleLoading({ title, elapsed, onKill, reasoning, status, phase }: OracleLoadingProps) {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * GAMING_QUOTES.length));
  const [fade, setFade] = useState(true);
  const reasoningEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll reasoning panel to bottom
  useEffect(() => {
    reasoningEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reasoning]);

  // Cycle quotes every 10 seconds with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % GAMING_QUOTES.length);
        setFade(true);
      }, 400);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentQuote = GAMING_QUOTES[quoteIndex];

  return (
    <div className="max-w-lg mx-auto text-center py-12">
      {/* Animated crystal ball */}
      <div className="relative mb-8 inline-block">
        <div className="text-6xl animate-bounce" style={{ animationDuration: '2s' }}>
          🔮
        </div>
        {/* Orbiting particles */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
          <span className="absolute top-0 left-1/2 -translate-x-1/2 text-xs opacity-60">✨</span>
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs opacity-40">⭐</span>
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
          <span className="absolute top-1/2 right-0 -translate-y-1/2 text-xs opacity-50">💫</span>
        </div>
      </div>

      {/* Status text */}
      <p className="font-pixel text-xs text-rpg-legendary mb-2">
        The Oracle is reading your scroll...
      </p>
      <p className="font-retro text-sm text-gray-400 mb-8">
        Deciphering &ldquo;{title}&rdquo;
      </p>

      {/* Progress bar */}
      <div className="w-64 h-2 bg-rpg-card border border-rpg-border rounded-full mx-auto mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-rpg-rare via-rpg-epic to-rpg-legendary rounded-full transition-all"
          style={{
            width: `${Math.min(95, elapsed * 2)}%`,
            transition: 'width 1s linear',
          }}
        />
      </div>

      {/* Status indicator */}
      {status && (
        <p className="font-retro text-xs text-rpg-rare mb-4 animate-pulse">
          {phase === 'core' ? '⚔️' : '💡'} {status}
        </p>
      )}

      {/* Live Reasoning Stream */}
      {reasoning && (
        <div className="w-full max-w-2xl mx-auto mb-6 rpg-card p-4 max-h-48 overflow-y-auto text-left">
          <p className="font-pixel text-[8px] text-rpg-rare mb-2">🧠 Oracle is thinking...</p>
          <p className="font-retro text-[11px] text-gray-400 whitespace-pre-wrap leading-relaxed">
            {reasoning.slice(-2000)}
          </p>
          <div ref={reasoningEndRef} />
        </div>
      )}

      {/* Gaming quote — only show when no reasoning is streaming */}
      {!reasoning && (
        <div className={`rpg-card p-5 mx-auto max-w-md transition-opacity duration-400 ${fade ? 'opacity-100' : 'opacity-0'}`}>
          <p className="font-retro text-sm text-gray-200 italic mb-2">
            &ldquo;{currentQuote.quote}&rdquo;
          </p>
          <p className="font-pixel text-[8px] text-rpg-rare">
            — {currentQuote.source}
          </p>
        </div>
      )}

      {/* Timer */}
      <p className="font-retro text-xs text-gray-600 mt-4">
        {elapsed}s elapsed
      </p>

      {/* Kill button — appears after 5 seconds */}
      {onKill && elapsed >= 5 && (
        <button
          onClick={onKill}
          className="mt-4 px-4 py-2 font-retro text-xs text-red-400 pixel-border border-red-500/40 hover:border-red-500 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          ✕ Stop Analysis
        </button>
      )}
    </div>
  );
}
