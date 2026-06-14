import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-sys-primary-container/20 flex items-center justify-center mb-2">
        <span className="material-symbols-outlined text-sys-primary text-4xl">search_off</span>
      </div>
      <h1 className="font-outfit text-2xl font-semibold text-sys-text">
        Page Not Found
      </h1>
      <p className="font-geist text-sys-muted max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-sys-primary text-white rounded-xl font-geist text-sm font-semibold hover:bg-sys-primary/90 transition-colors shadow-sm"
      >
        Return to Home
      </Link>
    </main>
  );
}
