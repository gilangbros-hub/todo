"use client";

import React from "react";

interface AuthButtonProps {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "destructive";
  onClick?: () => void;
  children: React.ReactNode;
}

export default function AuthButton({
  type = "button",
  disabled = false,
  loading = false,
  variant = "primary",
  onClick,
  children,
}: AuthButtonProps) {
  const isDisabled = disabled || loading;

  const baseStyles =
    "w-full px-6 py-3 font-retro text-lg border-pixel rounded-pixel transition-all duration-100 ease-in-out cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

  const variantStyles =
    variant === "primary"
      ? "bg-rpg-legendary text-[#0d0d1a] border-[#b8941f] hover:shadow-[0_0_12px_rgba(240,192,64,0.6)]"
      : "bg-[#3a1a1a] text-red-400 border-red-900 hover:shadow-[0_0_12px_rgba(239,68,68,0.4)] hover:bg-[#4a1f1f]";

  const disabledHoverOverride = isDisabled ? "hover:shadow-none" : "";

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${disabledHoverOverride}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <LoadingSpinner />
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

function LoadingSpinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  );
}
