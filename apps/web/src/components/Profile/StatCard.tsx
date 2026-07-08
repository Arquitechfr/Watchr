interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-surface rounded-lg p-4 flex flex-col items-center text-center">
      {icon && <div className="text-primary mb-2">{icon}</div>}
      <p className="text-text font-bold text-2xl">{value}</p>
      <p className="text-text-muted text-xs mt-1">{label}</p>
    </div>
  );
}
