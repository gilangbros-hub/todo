interface AuthErrorProps {
  message: string | null | undefined;
}

export default function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;

  return (
    <div
      className="border-4 border-[#ef4444] rounded-[2px] bg-[rgba(239,68,68,0.1)] shadow-overdue p-3"
      role="alert"
    >
      <p className="font-retro text-lg text-[#ef4444]">{message}</p>
    </div>
  );
}
