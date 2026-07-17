import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { ScrollArrows } from "../ScrollArrows";
import { CastMemberCard, CrewMemberCard } from "./PersonCards";
import type { CastMember, CrewMember } from "../../services/shows.service";
import { useRef } from "react";

interface CastCrewSectionProps {
  cast?: CastMember[];
  crew?: CrewMember[];
  type: "tv" | "movie";
}

export function CastCrewSection({ cast, crew, type }: CastCrewSectionProps) {
  const { t } = useI18n();
  const castScrollRef = useRef<ScrollView>(null);
  const crewScrollRef = useRef<ScrollView>(null);

  const hasCast = cast && cast.length > 0;
  const hasCrew = crew && crew.length > 0;

  if (!hasCast && !hasCrew) return null;

  return (
    <>
      {hasCast && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.cast")}</Text>
          <View className="relative">
            <ScrollView ref={castScrollRef} horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
              {cast!.slice(0, 15).map((member, index) => (
                <CastMemberCard key={`${member.id}-${index}`} member={member} />
              ))}
            </ScrollView>
            <ScrollArrows scrollRef={castScrollRef} />
          </View>
        </View>
      )}

      {hasCrew && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-text mb-2">
            {type === "tv" ? t("screens.showDetail.creators") : t("screens.showDetail.directors")}
          </Text>
          <View className="relative">
            <ScrollView ref={crewScrollRef} horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
              {crew!.slice(0, 10).map((member, index) => (
                <CrewMemberCard key={`${member.id}-${member.job ?? index}`} member={member} />
              ))}
            </ScrollView>
            <ScrollArrows scrollRef={crewScrollRef} />
          </View>
        </View>
      )}
    </>
  );
}
