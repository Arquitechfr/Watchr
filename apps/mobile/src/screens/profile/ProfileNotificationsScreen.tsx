import { View, Text, Switch, ActivityIndicator, Pressable } from "react-native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "../../hooks/useNotificationPreferences";
import { NotificationPreferences } from "../../services/auth.service";
import { Seo } from "../../components/Seo";

const OFFSET_STEP = 15;
const OFFSET_MIN = -60;
const OFFSET_MAX = 180;

function formatOffsetLabel(minutes: number, t: (key: string, params?: Record<string, unknown>) => string): string {
  if (minutes === 0) return t("screens.profile.notificationOffsetAtAir");

  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;

  if (hours > 0 && mins > 0) {
    const template = minutes < 0 ? "screens.profile.notificationOffsetBefore" : "screens.profile.notificationOffsetAfter";
    return t(template, { hours, minutes: mins });
  }
  if (hours > 0) {
    const template = minutes < 0 ? "screens.profile.notificationOffsetBefore" : "screens.profile.notificationOffsetAfter";
    return t(template, { hours, minutes: 0 });
  }
  const template = minutes < 0 ? "screens.profile.notificationOffsetBefore" : "screens.profile.notificationOffsetAfter";
  return t(template, { hours: 0, minutes: mins });
}

export function ProfileNotificationsScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
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

  const currentOffset = prefs.notificationOffsetMinutes ?? 0;

  function handleOffsetChange(delta: number) {
    const next = Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, currentOffset + delta));
    if (next === currentOffset) return;
    updateMutation.mutate({ notificationOffsetMinutes: next });
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.profileNotifications")} />
      <SubScreenHeader title={t("screens.profile.notifications")} />
      <View className="md:max-w-lg md:mx-auto w-full">
      <View className="gap-3">
        <View
          className="rounded-lg p-4"
          style={{ backgroundColor: colors.surface }}
        >
          <Text className="text-text text-base mb-3">{t("screens.profile.notificationOffset")}</Text>
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => handleOffsetChange(-OFFSET_STEP)}
              disabled={currentOffset <= OFFSET_MIN}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surfaceLight, opacity: currentOffset <= OFFSET_MIN ? 0.4 : 1 }}
              hitSlop={8}
            >
              <Text className="text-text text-xl font-bold">−</Text>
            </Pressable>
            <Text className="text-text text-base flex-1 text-center">
              {formatOffsetLabel(currentOffset, t)}
            </Text>
            <Pressable
              onPress={() => handleOffsetChange(OFFSET_STEP)}
              disabled={currentOffset >= OFFSET_MAX}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surfaceLight, opacity: currentOffset >= OFFSET_MAX ? 0.4 : 1 }}
              hitSlop={8}
            >
              <Text className="text-text text-xl font-bold">+</Text>
            </Pressable>
          </View>
        </View>

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
      </View>
    </ScreenContainer>
  );
}
