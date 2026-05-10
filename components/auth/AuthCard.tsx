import Image from 'next/image';

interface AuthCardProps {
  children: React.ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[480px] bg-rpg-card border-pixel border-rpg-border rounded-pixel p-8">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Quest Board Logo"
            width={80}
            height={80}
            className="pixel-art"
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}
