import { useI18n } from "../i18n/useI18n";
import { format } from "date-fns";

interface WeekSectionHeaderProps {
  date: Date;
}

export function WeekSectionHeader({ date }: WeekSectionHeaderProps) {
  const { t, dateFnsLocale } = useI18n();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(date);
  cmp.setHours(0, 0, 0, 0);
  const diffDays = Math.round((cmp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let label: string;
  if (diffDays === 0) label = t("screens.series.today");
  else if (diffDays > 0 && diffDays <= 7) label = t("screens.series.thisWeek");
  else if (diffDays > 7 && diffDays <= 14) label = t("screens.series.nextWeek");
  else label = format(date, "EEEE d MMMM", { locale: dateFnsLocale });

  return (
    <h3 className="text-text font-semibold text-sm px-1 py-2 sticky top-0 bg-background z-10">
      {label}
    </h3>
  );
}
