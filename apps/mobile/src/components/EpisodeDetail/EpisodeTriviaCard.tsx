import { View, Text, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { getProfileUrl } from "../../services/shows.service";
import type { EpisodeTrivia } from "../../services/shows.service";

interface EpisodeTriviaCardProps {
  trivia: EpisodeTrivia;
}

export function EpisodeTriviaCard({ trivia }: EpisodeTriviaCardProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  const hasGuestStars = trivia.guestStars.length > 0;
  const hasCrew = trivia.crew.length > 0;
  if (!hasGuestStars && !hasCrew) return null;

  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-text mb-3">
        {t("screens.episode.trivia")}
      </Text>

      {hasGuestStars && (
        <View className="mb-4">
          <Text className="text-text-muted text-sm mb-2">
            {t("screens.episode.guestStars")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
            {trivia.guestStars.map((star) => {
              const profileUrl = getProfileUrl(star.profilePath ?? undefined, 185);
              return (
                <View
                  key={star.id}
                  className="items-center mr-3 bg-surface rounded-lg p-3"
                  style={{ width: 80 }}
                >
                  {profileUrl ? (
                    <Image
                      source={{ uri: profileUrl }}
                      className="rounded-full mb-2"
                      style={{ width: 56, height: 56 }}
                    />
                  ) : (
                    <View
                      className="rounded-full mb-2 items-center justify-center bg-surfaceLight"
                      style={{ width: 56, height: 56 }}
                    >
                      <Ionicons name="person" size={24} color={colors.textMuted} />
                    </View>
                  )}
                  <Text className="text-text text-xs font-semibold text-center" numberOfLines={2}>
                    {star.name}
                  </Text>
                  {star.character && (
                    <Text className="text-text-muted text-[10px] text-center mt-0.5" numberOfLines={1}>
                      {star.character}
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {hasCrew && (
        <View>
          <Text className="text-text-muted text-sm mb-2">
            {t("screens.episode.crew")}
          </Text>
          <View className="bg-surface rounded-lg p-4">
            {trivia.crew.map((member, index) => (
              <View
                key={`${member.id}-${index}`}
                className="flex-row items-center justify-between py-2"
                style={index < trivia.crew.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: colors.border } : undefined}
              >
                <Text className="text-text text-sm flex-1">{member.name}</Text>
                <Text className="text-text-muted text-xs">{member.job}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
