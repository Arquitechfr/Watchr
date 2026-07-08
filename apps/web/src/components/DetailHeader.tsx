import { BackButton } from "./BackButton";

interface DetailHeaderProps {
  title: string;
}

export function DetailHeader({ title }: DetailHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <BackButton />
      <h1 className="text-text font-bold text-xl truncate">{title}</h1>
    </div>
  );
}
