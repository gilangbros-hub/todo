"use client";

interface ConnectionStatusProps {
  isConnected: boolean;
}

export default function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-rpg-card pixel-border px-3 py-2">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isConnected ? "bg-green-500 shadow-[0_0_6px_#22c55e]" : "bg-red-500 shadow-[0_0_6px_#ef4444]"
        }`}
        aria-hidden="true"
      />
      <span className="font-pixel text-[8px] text-rpg-normal">
        {isConnected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}
