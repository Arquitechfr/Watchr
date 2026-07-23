import { View, Text, TouchableOpacity, Platform } from "react-native";
import { useMemo, useState } from "react";
import { useThemeColors } from "../../theme/useThemeColors";
import { useI18n } from "../../i18n/useI18n";
import { format } from "date-fns";

interface StreakHeatmapProps {
  watchedDates: string[];
  weeks?: number;
}

const DEFAULT_WEEKS = 52;

const DAY_LABEL_INDICES = [0, 1, 2, 3, 4, 5, 6];
const VISIBLE_DAYS = new Set([1, 3, 5]);

function getIntensityColor(count: number, colors: ReturnType<typeof useThemeColors>): string {
  if (count === 0) return colors.surface;
  if (count <= 2) return colors.primary + "60";
  if (count <= 4) return colors.primary + "90";
  return colors.primary;
}

function buildHeatmapData(watchedDates: string[], weeks: number) {
  const dateCountMap = new Map<string, number>();
  for (const date of watchedDates) {
    const day = date.split("T")[0];
    dateCountMap.set(day, (dateCountMap.get(day) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const startDate = new Date(startOfWeek);
  startDate.setDate(startOfWeek.getDate() - (weeks - 1) * 7);

  const columns: { date: Date; count: number }[][] = [];
  const cursor = new Date(startDate);

  for (let w = 0; w < weeks; w++) {
    const column: { date: Date; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split("T")[0];
      const count = dateCountMap.get(dateStr) ?? 0;
      column.push({ date: new Date(cursor), count });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(column);
  }

  return columns;
}

export function StreakHeatmap({ watchedDates, weeks = DEFAULT_WEEKS }: StreakHeatmapProps) {
  const colors = useThemeColors();
  const { t, dateFnsLocale } = useI18n();
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const columns = useMemo(() => buildHeatmapData(watchedDates, weeks), [watchedDates, weeks]);

  const dayLabels = useMemo(() => {
    const sunday = new Date(2024, 0, 7);
    return DAY_LABEL_INDICES.map((i) => {
      if (!VISIBLE_DAYS.has(i)) return "";
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return format(d, "EEE", { locale: dateFnsLocale });
    });
  }, [dateFnsLocale]);

  const cellSize = Platform.OS === "web" ? 12 : 11;
  const cellGap = 3;
  const colWidth = cellSize + cellGap;

  return (
    <View>
      <Text className="text-text font-semibold text-base mb-3">
        {t("screens.profile.watchingActivity")}
      </Text>

      <View className="flex-row" style={{ gap: cellGap }}>
        <View style={{ width: 24, gap: cellGap }}>
          {dayLabels.map((label, i) => (
            <View key={i} style={{ height: cellSize, justifyContent: "center" }}>
              {label ? (
                <Text style={{ fontSize: 9, color: colors.textMuted }}>{label}</Text>
              ) : null}
            </View>
          ))}
        </View>

        <View className="flex-1 flex-row overflow-hidden" style={{ gap: cellGap }}>
          {columns.map((column, weekIdx) => (
            <View key={weekIdx} style={{ gap: cellGap }}>
              {column.map((cell, dayIdx) => {
                const isFuture = cell.date > new Date();
                return (
                  <TouchableOpacity
                    key={dayIdx}
                    onPress={() => {
                      if (!isFuture) {
                        setTooltip({
                          date: format(cell.date, "d MMM yyyy", { locale: dateFnsLocale }),
                          count: cell.count,
                          x: weekIdx * colWidth,
                          y: dayIdx * (cellSize + cellGap),
                        });
                        setTimeout(() => setTooltip(null), 2500);
                      }
                    }}
                    disabled={isFuture}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 2,
                      backgroundColor: isFuture ? "transparent" : getIntensityColor(cell.count, colors),
                      borderWidth: cell.count === 0 && !isFuture ? 0.5 : 0,
                      borderColor: colors.border,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {tooltip && (
        <View
          style={{
            position: "absolute",
            left: 30 + tooltip.x,
            top: 30 + tooltip.y,
            backgroundColor: colors.surfaceLight,
            borderRadius: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            zIndex: 10,
          }}
        >
          <Text style={{ fontSize: 11, color: colors.text }}>
            {tooltip.count > 0
              ? t("screens.profile.episodesOnDay", { count: tooltip.count, date: tooltip.date })
              : t("screens.profile.noEpisodesOnDay", { date: tooltip.date })}
          </Text>
        </View>
      )}

      <View className="flex-row items-center mt-3" style={{ gap: 6 }}>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>{t("screens.profile.less")}</Text>
        {[0, 1, 2, 3].map((level) => (
          <View
            key={level}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: 2,
              backgroundColor: getIntensityColor(level === 0 ? 0 : level * 2, colors),
              borderWidth: level === 0 ? 0.5 : 0,
              borderColor: colors.border,
            }}
          />
        ))}
        <Text style={{ fontSize: 10, color: colors.textMuted }}>{t("screens.profile.more")}</Text>
      </View>
    </View>
  );
}
