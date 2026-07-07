import { ScrollView, Text, TouchableOpacity } from "react-native";
import { cn } from "../utils/cn";

export interface FilterChipOption {
  label: string;
  value: string | number;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  selectedValue?: string | number;
  onSelect: (value: string | number | undefined) => void;
  allLabel: string;
}

export function FilterChips({ options, selectedValue, onSelect, allLabel }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-3"
    >
      <TouchableOpacity
        onPress={() => onSelect(undefined)}
        activeOpacity={0.8}
        className={cn(
          "px-3 py-1.5 rounded-full mr-2",
          selectedValue === undefined ? "bg-primary" : "bg-surface",
        )}
      >
        <Text
          className={cn(
            "text-sm font-medium",
            selectedValue === undefined ? "text-background" : "text-text-muted",
          )}
        >
          {allLabel}
        </Text>
      </TouchableOpacity>
      {options.map((option) => {
        const isActive = selectedValue === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
            className={cn(
              "px-3 py-1.5 rounded-full mr-2",
              isActive ? "bg-primary" : "bg-surface",
            )}
          >
            <Text
              className={cn(
                "text-sm font-medium",
                isActive ? "text-background" : "text-text-muted",
              )}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
