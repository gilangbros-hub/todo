"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AuthError from "@/components/auth/AuthError";
import { validateRegistrationInput } from "@/lib/auth/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    // Client-side validation
    const validation = validateRegistrationInput({
      email,
      password,
      confirmPassword,
    });

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
        } else if (data.error) {
          setServerError(data.error);
        } else {
          setServerError("Registration failed. Please try again.");
        }
        return;
      }

      // Success — redirect to dashboard
      router.push("/");
    } catch {
      setServerError("Connection failed. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <h1
        className="font-pixel text-lg text-rpg-legendary text-center mb-8"
        style={{ textShadow: "2px 2px 0px #000" }}
      >
        Create Your Hero
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AuthError message={serverError} />

        <AuthInput
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          placeholder="hero@questboard.gg"
          autoComplete="email"
        />

        <AuthInput
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          placeholder="••••••"
          autoComplete="new-password"
        />

        <AuthInput
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          placeholder="••••••"
          autoComplete="new-password"
        />

        <AuthButton type="submit" loading={loading}>
          Begin Adventure
        </AuthButton>
      </form>

      <p className="text-center mt-6 font-retro text-lg text-gray-400">
        Already a hero?{" "}
        <Link
          href="/login"
          className="text-rpg-legendary hover:underline"
        >
          Enter the Realm
        </Link>
      </p>
    </AuthCard>
  );
}
