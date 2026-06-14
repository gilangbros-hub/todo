import Image from 'next/image';

interface AuthCardProps {
  children: React.ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[480px] bg-sys-surface border border-sys-border rounded-xl p-8">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Renata Logo"
            width={80}
            height={80}
            className="rounded-lg"
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}
