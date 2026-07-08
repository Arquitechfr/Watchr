import { Plus } from "lucide-react";

interface FixedTrackingButtonProps {
  onClick: () => void;
  label?: string;
}

export function FixedTrackingButton({ onClick, label }: FixedTrackingButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 lg:bottom-6 right-6 z-40 flex items-center gap-2 bg-primary text-background px-5 py-3 rounded-full shadow-lg hover:bg-primary-dark transition-colors"
    >
      <Plus size={22} />
      {label && <span className="font-medium text-sm">{label}</span>}
    </button>
  );
}
