interface EmptyStateProps {
  message: string;
  icon?: string;
}

export default function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && (
        <span className="text-4xl mb-4 block" role="img" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="font-pixel text-xs text-rpg-normal text-center leading-relaxed">
        {message}
      </p>
    </div>
  );
}
