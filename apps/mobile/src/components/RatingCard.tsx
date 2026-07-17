import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { CommunityRating } from "../services/ratings.service";

const STAR_SIZE = 22;

interface RatingCardProps {
  value?: number | null;
  onChange?: (value: number) => void;
  communityData?: CommunityRating | null;
}

function StarRow({
  count,
  interactive,
  onPress,
  colors,
}: {
  count: number;
  interactive: boolean;
  onPress?: (n: number) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.floor(count);
        const half = !interactive && !filled && n === Math.ceil(count) && count % 1 >= 0.5;
        const icon: "star" | "star-outline" | "star-half" = filled ? "star" : half ? "star-half" : "star-outline";
        const color = filled || half ? colors.primary : colors.textMuted;

        if (interactive && onPress) {
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onPress(n)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              className="mr-1"
              activeOpacity={0.6}
            >
              <Ionicons name={icon} size={STAR_SIZE} color={color} />
            </TouchableOpacity>
          );
        }

        return (
          <View key={n} className="mr-1">
            <Ionicons name={icon} size={STAR_SIZE} color={color} />
          </View>
        );
      })}
    </View>
  );
}

export function RatingCard({ value, onChange, communityData }: RatingCardProps) {
  const colors = useThemeColors();
  const { t } = useI18n();
  const isCommunity = communityData !== undefined;

  const userValue: number | null = value ?? null;
  const communityAverage: number | null = communityData?.average ?? null;
  const communityCount: number = communityData?.count ?? 0;
  const communityStars: number = communityAverage ?? 0;

  const handleStarPress = (n: number) => {
    if (onChange) {
      onChange(n);
    }
  };

  if (isCommunity) {
    return (
      <View className="bg-surface rounded-xl p-4 flex-1 min-w-[150px]">
        <Text className="text-text-muted text-xs uppercase tracking-wider mb-3">
          {t("screens.showDetail.communityRating")}
        </Text>

        {communityAverage !== null ? (
          <Animated.View entering={FadeIn.duration(250)}>
            <StarRow count={communityStars} interactive={false} colors={colors} />
            <View className="flex-row items-center mt-2">
              <Text className="text-text font-bold text-sm">
                {communityAverage.toFixed(1)}
              </Text>
              {communityCount > 0 && (
                <Text className="text-text-muted text-xs ml-1.5">
                  · {t("screens.showDetail.votes", { count: communityCount })}
                </Text>
              )}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(250)} className="flex-row items-center">
            <StarRow count={0} interactive={false} colors={colors} />
            <Text className="text-text-muted text-xs mt-2">
              {t("screens.showDetail.noRating")}
            </Text>
          </Animated.View>
        )}
      </View>
    );
  }

  return (
    <View className="bg-surface rounded-xl p-4 flex-1 min-w-[150px]">
      <Text className="text-text-muted text-xs uppercase tracking-wider mb-3">
        {t("screens.showDetail.yourRating")}
      </Text>

      <StarRow
        count={userValue ?? 0}
        interactive={!!onChange}
        onPress={handleStarPress}
        colors={colors}
      />

      <View className="mt-2 h-4">
        {userValue !== null ? (
          <Animated.View entering={FadeIn.duration(200)}>
            <Text className="text-text-muted text-xs">
              {userValue} / 5
            </Text>
          </Animated.View>
        ) : onChange ? (
          <Text className="text-text-muted text-xs">
            {t("screens.showDetail.tapToRate")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
