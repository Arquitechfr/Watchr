import { useI18n } from "../i18n/useI18n";

interface WeekSectionHeaderProps {
  title: string;
  count?: number;
}

export function WeekSectionHeader({ title, count }: WeekSectionHeaderProps) {
  return (
    <h3 className="text-text font-semibold text-sm px-1 py-2 sticky top-0 bg-background z-10">
      {title} {count !== undefined && `(${count})`}
    </h3>
  );
}
