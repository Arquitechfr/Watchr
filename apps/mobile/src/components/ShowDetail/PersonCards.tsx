import { View, Text } from "react-native";
import { CachedImage as Image } from "../CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { getProfileUrl, type CastMember, type CrewMember } from "../../services/shows.service";

export function CastMemberCard({ member }: { member: CastMember }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const profileUrl = getProfileUrl(member.profilePath, 200);
  return (
    <View className="mr-3 items-center" style={{ width: 80 }}>
      {profileUrl ? (
        <Image
          source={{ uri: profileUrl }}
          style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceLight, marginBottom: 8 }}
        />
      ) : (
        <View className="w-20 h-20 rounded-full bg-surface-light items-center justify-center mb-2">
          <Ionicons name="person-outline" size={28} color={colors.textMuted} />
        </View>
      )}
      <Text className="text-text text-xs font-medium text-center" numberOfLines={2}>
        {member.name ?? t("common.unknown")}
      </Text>
      {member.character && (
        <Text className="text-text-muted text-xs text-center mt-0.5" numberOfLines={1}>
          {member.character}
        </Text>
      )}
    </View>
  );
}

export function CrewMemberCard({ member }: { member: CrewMember }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const profileUrl = getProfileUrl(member.profilePath, 200);
  return (
    <View className="mr-3 items-center" style={{ width: 80 }}>
      {profileUrl ? (
        <Image
          source={{ uri: profileUrl }}
          style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceLight, marginBottom: 8 }}
        />
      ) : (
        <View className="w-20 h-20 rounded-full bg-surface-light items-center justify-center mb-2">
          <Ionicons name="person-outline" size={28} color={colors.textMuted} />
        </View>
      )}
      <Text className="text-text text-xs font-medium text-center" numberOfLines={2}>
        {member.name ?? t("common.unknown")}
      </Text>
      {member.job && (
        <Text className="text-text-muted text-xs text-center mt-0.5" numberOfLines={1}>
          {member.job}
        </Text>
      )}
    </View>
  );
}
