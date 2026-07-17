import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";

interface BioGenresCardProps {
  bio?: string;
  favoriteGenres?: string[];
}

export function BioGenresCard({ bio, favoriteGenres }: BioGenresCardProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  const hasBio = bio && bio.trim().length > 0;
  const hasGenres = favoriteGenres && favoriteGenres.length > 0;

  if (!hasBio && !hasGenres) return null;

  return (
    <View className="mb-6">
      {(hasBio || hasGenres) && (
        <Text className="text-text font-semibold text-base mb-3">
          {t("screens.profile.aboutMe")}
        </Text>
      )}
      {hasBio && (
        <View className="bg-surface rounded-lg p-4 mb-3">
          <Text className="text-text text-sm leading-relaxed">{bio}</Text>
        </View>
      )}
      {hasGenres && (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {favoriteGenres!.map((genre) => (
            <View
              key={genre}
              className="flex-row items-center rounded-full px-3 py-1.5"
              style={{ backgroundColor: colors.primary + "15" }}
            >
              <Ionicons name="pricetag" size={12} color={colors.primary} />
              <Text className="text-primary text-xs font-medium ml-1.5">{genre}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
