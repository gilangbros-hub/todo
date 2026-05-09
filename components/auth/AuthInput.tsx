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
        className="font-retro text-lg text-white"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className={`w-full bg-[#1a1a2e] border-[4px] border-[#2a2a4a] rounded-[2px] px-3 py-2 font-retro text-xl text-white placeholder-gray-500 outline-none focus:border-rpg-legendary transition-colors ${
          error ? "border-red-500" : ""
        } ${className}`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && (
        <p
          id={`${name}-error`}
          className="font-retro text-base text-red-400 mt-1"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
