"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthError from "@/components/auth/AuthError";
import { validateLoginInput } from "@/lib/auth/validation";

export default function LoginPage() {
  return <LoginForm />;
}

function LoginForm() {
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
    <AuthCard>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <h1 className="font-outfit text-2xl text-center text-sys-text font-semibold">
          Sign In
        </h1>

        <AuthError message={serverError} />

        <AuthInput
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="email@example.com"
          autoComplete="email"
        />

        <AuthInput
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="••••••"
          autoComplete="current-password"
        />

        <AuthButton type="submit" loading={loading} disabled={loading}>
          Sign In
        </AuthButton>

        <p className="text-center font-geist text-sm text-sys-muted">
          No account?{" "}
          <Link
            href="/register"
            className="text-sys-primary hover:underline font-medium"
          >
            Create Account
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
