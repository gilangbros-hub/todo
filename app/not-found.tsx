import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-6xl" aria-hidden="true">
        💀
      </div>
      <h1 className="font-pixel text-rpg-legendary text-sm sm:text-base">
        Quest Not Found
      </h1>
      <p className="font-retro text-gray-400 text-xl max-w-md">
        The path you seek does not exist in this realm. The quest scroll has been
        lost to the void.
      </p>
      <Link
        href="/"
        className="rpg-card px-6 py-3 font-pixel text-xs text-rpg-rare hover:shadow-rare transition-shadow duration-200"
      >
        ← Return to Quest Board
      </Link>
    </main>
  );
}
