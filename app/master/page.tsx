import Link from "next/link";

export default function MasterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <h1 className="font-pixel text-rpg-legendary text-sm sm:text-base">
        ⚙️ Master Data
      </h1>
      <p className="font-retro text-gray-400 text-xl text-center max-w-md">
        Manage the guilds and party members of your realm.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
        <Link
          href="/master/types"
          className="rpg-card p-6 flex flex-col items-center gap-4 hover:shadow-epic hover:-translate-y-1 transition-all duration-100"
        >
          <span className="text-4xl" aria-hidden="true">
            🏰
          </span>
          <span className="font-pixel text-rpg-epic text-xs text-center">
            Guild Types
          </span>
          <span className="font-retro text-gray-400 text-lg text-center">
            Manage quest categories
          </span>
        </Link>

        <Link
          href="/master/pics"
          className="rpg-card p-6 flex flex-col items-center gap-4 hover:shadow-rare hover:-translate-y-1 transition-all duration-100"
        >
          <span className="text-4xl" aria-hidden="true">
            ⚔️
          </span>
          <span className="font-pixel text-rpg-rare text-xs text-center">
            Party Members
          </span>
          <span className="font-retro text-gray-400 text-lg text-center">
            Manage PICs &amp; heroes
          </span>
        </Link>
      </div>

      <Link
        href="/"
        className="font-pixel text-xs text-gray-500 hover:text-rpg-rare transition-colors duration-200 mt-4"
      >
        ← Back to Quest Board
      </Link>
    </main>
  );
}
