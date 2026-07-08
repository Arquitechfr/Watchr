import { BackButton } from "./BackButton";

interface DetailHeaderProps {
  title: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export function DetailHeader({ title, onBack, rightElement }: DetailHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <BackButton onClick={onBack} />
      <h1 className="text-text font-bold text-xl truncate flex-1">{title}</h1>
      {rightElement}
    </div>
  );
}
