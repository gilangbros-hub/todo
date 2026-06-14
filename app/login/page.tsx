"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthInput from "@/components/auth/AuthInput";
import AuthError from "@/components/auth/AuthError";
import { validateLoginInput } from "@/lib/auth/validation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const validation = validateLoginInput({ email, password });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else if (data.error) {
          setServerError(data.error);
        } else {
          setServerError("Something went wrong. Please try again later.");
        }
        return;
      }

      router.push("/");
    } catch {
      setServerError("Connection failed. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-sys-bg">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-shrink-0 flex-col justify-between bg-sys-primary px-12 py-16 relative overflow-hidden">
        {/* Subtle background texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />

        {/* Top — logo + name */}
        <div className="relative z-10 flex items-center gap-3">
          {/* Wordmark icon */}
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5 text-white"
              aria-hidden="true"
            >
              <path
                d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-outfit font-semibold text-lg text-white tracking-tight">
            Renata
          </span>
        </div>

        {/* Middle — headline */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="font-outfit font-semibold text-[2rem] leading-tight text-white">
              Requirements,
              <br />
              analyzed with AI.
            </p>
            <p className="font-geist text-[0.9375rem] leading-relaxed text-white/70 max-w-sm">
              Turn messy business documents into structured, traceable
              requirements — in seconds.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3" aria-label="Key features">
            {[
              "AI-powered BRD analysis",
              "Structured requirement extraction",
              "Real-time collaboration",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 12 12"
                    fill="none"
                    className="w-3 h-3 text-white"
                  >
                    <path
                      d="M2 6l2.5 2.5L10 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="font-geist text-sm text-white/80">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — tagline */}
        <p className="relative z-10 font-geist text-xs text-white/40 tracking-wide uppercase">
          Requirement Analytica
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo (hidden on lg+) */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-sys-primary flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-4 h-4 text-white"
                aria-hidden="true"
              >
                <path
                  d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-outfit font-semibold text-base text-sys-text">
              Renata
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-outfit text-[1.625rem] font-semibold text-sys-text leading-tight">
              Welcome back
            </h1>
            <p className="mt-1.5 font-geist text-sm text-sys-muted">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <AuthError message={serverError} />

            <AuthInput
              label="Email address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="font-geist text-sm font-medium text-sys-text"
                >
                  Password
                </label>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={errors.password ? "true" : undefined}
                aria-describedby={errors.password ? "password-error" : undefined}
                className={`w-full bg-sys-bg border rounded-lg px-3 py-2 font-geist text-base text-sys-text placeholder-sys-faint outline-none focus:border-sys-primary focus:ring-1 focus:ring-sys-primary transition-colors ${
                  errors.password ? "border-sys-error" : "border-sys-border"
                }`}
              />
              {errors.password && (
                <p
                  id="password-error"
                  className="font-geist text-sm text-sys-error mt-1"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sys-primary text-white font-geist font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-sys-primary/90 focus:outline-none focus:ring-2 focus:ring-sys-primary focus:ring-offset-2 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <div className="flex-1 h-px bg-sys-border" />
            <span className="font-geist text-xs text-sys-faint">or</span>
            <div className="flex-1 h-px bg-sys-border" />
          </div>

          {/* Register link */}
          <p className="font-geist text-sm text-sys-muted text-center">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-sys-primary font-medium hover:underline underline-offset-2"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
