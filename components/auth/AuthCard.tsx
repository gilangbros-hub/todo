interface AuthCardProps {
  children: React.ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[480px] bg-rpg-card border-pixel border-rpg-border rounded-pixel p-8">
        {children}
      </div>
    </div>
  );
}
