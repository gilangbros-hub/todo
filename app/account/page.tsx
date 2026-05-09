"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthError from "@/components/auth/AuthError";
import { PlayerStats } from "@/lib/types";
import { getPlayerStats } from "@/lib/services/player-stats";
import { createClient } from "@/lib/supabase/client";
import { calculateLevel } from "@/lib/xp";

export default function AccountPage() {
  return <AccountPanel />;
}

function AccountPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    id: "",
    user_id: "",
    xp: 0,
    level: 1,
    streak: 0,
    last_completed_date: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch user data and player stats on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setEmail(user.email ?? "");
        setDisplayName(user.user_metadata?.display_name ?? "");

        const stats = await getPlayerStats();
        setPlayerStats(stats);
      } catch (err) {
        console.error("Failed to fetch account data:", err);
        setError("Failed to load account data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to update profile. Please try again.");
        return;
      }

      setSuccessMessage("Profile updated successfully!");
    } catch {
      setError("Connection failed. Please check your network and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setError(null);
    setLoggingOut(true);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!res.ok) {
        setError("Failed to log out. Please try again.");
        return;
      }

      router.push("/login");
    } catch {
      setError("Connection failed. Please check your network and try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  const { level, xpInCurrentLevel, xpForNextLevel } = calculateLevel(
    playerStats.xp
  );
  const xpPercent =
    xpForNextLevel > 0 ? (xpInCurrentLevel / xpForNextLevel) * 100 : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar playerStats={playerStats} activeRoute="/account" />
        <main className="flex-1 p-8 flex items-center justify-center">
          <p className="font-retro text-xl text-gray-400">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar playerStats={playerStats} activeRoute="/account" />

      <main className="flex-1 p-8">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
          {/* Page Heading */}
          <h1
            className="font-pixel text-xl text-rpg-legendary"
            style={{ textShadow: "2px 2px 0px #000" }}
          >
            Hero Profile
          </h1>

          {/* Player Stats Panel */}
          <StatsDisplay
            level={level}
            xpInCurrentLevel={xpInCurrentLevel}
            xpForNextLevel={xpForNextLevel}
            xpPercent={xpPercent}
            streak={playerStats.streak}
            totalXp={playerStats.xp}
          />

          {/* Profile Form */}
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <AuthError message={error} />

            {successMessage && (
              <div
                className="border-4 border-green-500 rounded-[2px] bg-[rgba(34,197,94,0.1)] shadow-[0_0_8px_rgba(34,197,94,0.3)] p-3"
                role="status"
              >
                <p className="font-retro text-lg text-green-400">
                  {successMessage}
                </p>
              </div>
            )}

            {/* Email (read-only) */}
            <div className="flex flex-col gap-1">
              <label className="font-retro text-lg text-white">Email</label>
              <div className="w-full bg-[#1a1a2e] border-[4px] border-[#2a2a4a] rounded-[2px] px-3 py-2 font-retro text-xl text-gray-400">
                {email}
              </div>
            </div>

            {/* Display Name */}
            <AuthInput
              label="Display Name"
              name="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your hero name"
              autoComplete="name"
            />

            <AuthButton type="submit" loading={saving} disabled={saving}>
              Save Changes
            </AuthButton>
          </form>

          {/* Logout Section */}
          <div className="border-t border-[#2a2a4a] pt-6">
            <AuthButton
              variant="destructive"
              loading={loggingOut}
              disabled={loggingOut}
              onClick={handleLogout}
            >
              Log Out
            </AuthButton>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Stats Display Component ---
interface StatsDisplayProps {
  level: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  xpPercent: number;
  streak: number;
  totalXp: number;
}

function StatsDisplay({
  level,
  xpInCurrentLevel,
  xpForNextLevel,
  xpPercent,
  streak,
  totalXp,
}: StatsDisplayProps) {
  return (
    <div className="rpg-card p-6 flex flex-col gap-4">
      <h2
        className="font-pixel text-xs text-rpg-rare uppercase tracking-wider"
        style={{ textShadow: "0 0 6px #4a9eff" }}
      >
        Player Stats
      </h2>

      <div className="grid grid-cols-3 gap-4">
        {/* Level */}
        <div className="flex flex-col items-center gap-1 bg-rpg-dark pixel-border p-3">
          <span className="font-pixel text-[8px] text-rpg-legendary uppercase">
            Level
          </span>
          <span
            className="font-pixel text-2xl text-white"
            style={{ textShadow: "2px 2px 0px #000" }}
          >
            {level}
          </span>
        </div>

        {/* Total XP */}
        <div className="flex flex-col items-center gap-1 bg-rpg-dark pixel-border p-3">
          <span className="font-pixel text-[8px] text-rpg-rare uppercase">
            Total XP
          </span>
          <span
            className="font-pixel text-2xl text-white"
            style={{ textShadow: "2px 2px 0px #000" }}
          >
            {totalXp}
          </span>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center gap-1 bg-rpg-dark pixel-border p-3">
          <span className="font-pixel text-[8px] text-orange-400 uppercase">
            Streak
          </span>
          <span className="flex items-center gap-1">
            <span className="text-lg" role="img" aria-label="streak fire">
              🔥
            </span>
            <span
              className="font-pixel text-2xl text-white"
              style={{ textShadow: "2px 2px 0px #000" }}
            >
              {streak}
            </span>
          </span>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="flex flex-col gap-1">
        <p className="font-pixel text-[8px] text-gray-400 uppercase tracking-wider">
          Progress to Next Level
        </p>
        <div className="w-full h-4 bg-rpg-dark border-2 border-rpg-border rounded-pixel overflow-hidden">
          <div
            className="h-full bg-rpg-rare transition-all duration-300"
            style={{
              width: `${xpPercent}%`,
              boxShadow: "0 0 6px #4a9eff",
            }}
          />
        </div>
        <p className="font-retro text-sm text-gray-300 text-center">
          {xpInCurrentLevel} / {xpForNextLevel} XP
        </p>
      </div>
    </div>
  );
}
