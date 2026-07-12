import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { CommunityRating } from "../services/ratings.service";

interface RatingCardProps {
  value?: number | null;
  onChange?: (value: number) => void;
  communityData?: CommunityRating | null;
}

export function RatingCard({ value, onChange, communityData }: RatingCardProps) {
  const colors = useThemeColors();
  const { t } = useI18n();
  const isCommunity = communityData !== undefined;
  const [showInput, setShowInput] = useState(false);

  const displayValue: number | null = isCommunity
    ? (communityData?.average ?? null)
    : (value ?? null);
  const voteCount = isCommunity ? communityData?.count ?? 0 : 0;

  const handleNumberPress = (num: number) => {
    if (onChange) {
      onChange(num);
    }
    setShowInput(false);
  };

  const handleCardPress = () => {
    if (!isCommunity && onChange) {
      setShowInput((prev) => !prev);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      activeOpacity={onChange || isCommunity ? 0.8 : 1}
      disabled={isCommunity}
      className="bg-surface rounded-xl p-4 flex-1 min-w-[140px]"
    >
      <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">
        {isCommunity ? t("screens.showDetail.communityRating") : t("screens.showDetail.yourRating")}
      </Text>

      <Animated.View layout={Layout.springify().damping(20).stiffness(200)}>
        {showInput && !isCommunity ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="flex-row items-center"
          >
            {[1, 2, 3, 4, 5].map((num) => {
              const isSelected = displayValue !== null && num === displayValue;
              const isHighlighted = displayValue !== null && num <= displayValue;
              return (
                <TouchableOpacity
                  key={num}
                  onPress={() => handleNumberPress(num)}
                  className={`mr-1.5 px-3 py-2 rounded-lg ${
                    isSelected
                      ? "bg-primary"
                      : isHighlighted
                        ? "bg-primary/20"
                        : "bg-background"
                  }`}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Animated.View layout={Layout}>
                    <Text
                      className={`font-bold text-lg ${
                        isSelected
                          ? "text-white"
                          : isHighlighted
                            ? "text-primary"
                            : "text-text-muted"
                      }`}
                    >
                      {num}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
            <Text className="text-text-muted text-sm ml-1">/5</Text>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="flex-row items-center"
          >
            {displayValue !== null ? (
              <>
                <Ionicons name="star" size={32} color={colors.primary} />
                <Text className="text-text font-bold text-2xl ml-2">
                  {displayValue.toFixed(1)}
                </Text>
                <Text className="text-text-muted text-sm ml-1">/5</Text>
              </>
            ) : (
              <View className="flex-row items-center py-1">
                <Ionicons name="star-outline" size={28} color={colors.textMuted} />
                <Text className="text-text-muted ml-2 text-sm">
                  {isCommunity ? t("screens.showDetail.noRating") : t("screens.showDetail.tapToRate")}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </Animated.View>

      {isCommunity && voteCount > 0 && (
        <Text className="text-text-muted text-xs mt-1">
          {t("screens.showDetail.votes", { count: voteCount })}
        </Text>
      )}
    </TouchableOpacity>
  );
}
