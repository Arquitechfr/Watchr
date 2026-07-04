import { View, Text, Switch, ActivityIndicator } from "react-native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useI18n } from "../../i18n/useI18n";
import { colors } from "../../theme/colors";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "../../hooks/useNotificationPreferences";
import { NotificationPreferences } from "../../services/auth.service";

export function ProfileNotificationsScreen() {
  const { t } = useI18n();
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  if (isLoading || !prefs) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const toggles: {
    key: keyof NotificationPreferences;
    label: string;
    value: boolean;
  }[] = [
    { key: "pushEnabled", label: t("screens.profile.pushNotifications"), value: prefs.pushEnabled },
    { key: "emailEnabled", label: t("screens.profile.emailNotifications"), value: prefs.emailEnabled },
    { key: "newReleases", label: t("screens.profile.newReleases"), value: prefs.newReleases },
    { key: "commentReplies", label: t("screens.profile.commentReplies"), value: prefs.commentReplies },
    { key: "commentReactions", label: t("screens.profile.commentReactions"), value: prefs.commentReactions },
    { key: "commentLikes", label: t("screens.profile.commentLikes"), value: prefs.commentLikes },
  ];

  function handleChange(key: keyof NotificationPreferences, value: boolean) {
    updateMutation.mutate({ [key]: value } as Partial<NotificationPreferences>);
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <Text className="text-text-muted text-center mb-6">{t("screens.profile.notifications")}</Text>
      <View className="gap-3">
        {toggles.map((toggle) => (
          <View
            key={toggle.key}
            className="flex-row items-center justify-between rounded-lg p-4"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-text text-base flex-1">{toggle.label}</Text>
            <Switch
              value={toggle.value}
              onValueChange={(v) => handleChange(toggle.key, v)}
              trackColor={{ false: colors.surfaceLight, true: colors.primary }}
              thumbColor={toggle.value ? colors.background : colors.textMuted}
            />
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}
