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
    "w-full px-6 py-3 font-geist text-base rounded-xl transition-all duration-100 ease-in-out cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

  const variantStyles =
    variant === "primary"
      ? "bg-sys-primary text-white hover:bg-sys-primary/90 shadow-sm"
      : "bg-sys-error/10 text-sys-error border border-sys-error/30 hover:bg-sys-error/20";

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
