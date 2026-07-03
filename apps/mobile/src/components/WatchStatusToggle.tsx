import { View, Text, TouchableOpacity } from "react-native";
import { WatchStatus } from "../services/tracking.service";

interface WatchStatusToggleProps {
  value: WatchStatus;
  onChange: (status: WatchStatus) => void;
  disabled?: boolean;
}

const statuses: { key: WatchStatus; label: string }[] = [
  { key: "watching", label: "En cours" },
  { key: "completed", label: "Terminé" },
  { key: "plan_to_watch", label: "À voir" },
  { key: "dropped", label: "Abandonné" },
];

export function WatchStatusToggle({ value, onChange, disabled }: WatchStatusToggleProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {statuses.map((status) => {
        const isActive = value === status.key;
        return (
          <TouchableOpacity
            key={status.key}
            className={`px-4 py-2 rounded-full border ${
              isActive ? "bg-primary border-primary" : "bg-surface border-border"
            }`}
            onPress={() => onChange(status.key)}
            disabled={disabled}
          >
            <Text
              className={`font-medium ${isActive ? "text-background" : "text-text"}`}
            >
              {status.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
