interface AuthErrorProps {
  message: string | null | undefined;
}

export default function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;

  return (
    <div
      className="border border-sys-error/30 rounded-lg bg-sys-error/10 p-3"
      role="alert"
    >
      <p className="font-geist text-sm text-sys-error">{message}</p>
    </div>
  );
}
