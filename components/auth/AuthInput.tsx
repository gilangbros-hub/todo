"use client";

import { InputHTMLAttributes } from "react";

interface AuthInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  error?: string;
}

export default function AuthInput({
  label,
  name,
  type = "text",
  error,
  className = "",
  ...props
}: AuthInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className="font-geist text-sm font-medium text-sys-text"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className={`w-full bg-sys-bg border border-sys-border rounded-lg px-3 py-2 font-geist text-base text-sys-text placeholder-sys-faint outline-none focus:border-sys-primary focus:ring-1 focus:ring-sys-primary transition-colors ${
          error ? "border-sys-error" : ""
        } ${className}`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && (
        <p
          id={`${name}-error`}
          className="font-geist text-sm text-sys-error mt-1"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
