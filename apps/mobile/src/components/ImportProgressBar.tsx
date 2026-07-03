import { View, Text } from "react-native";
import { ImportProgress } from "../services/import.service";

interface ImportProgressBarProps {
  progress: ImportProgress;
}

export function ImportProgressBar({ progress }: ImportProgressBarProps) {
  const percentage =
    progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <View className="mb-4">
      <View className="h-3 bg-surface rounded-full overflow-hidden mb-2">
        <View
          className="h-full bg-primary"
          style={{ width: `${percentage}%` }}
        />
      </View>
      <Text className="text-text-muted text-sm text-center">
        {progress.processed} / {progress.total} ({percentage}%)
        {" · "}
        {progress.matched} importés, {progress.failed} échecs
      </Text>
    </View>
  );
}
