import { PageWrapper } from "../../components/layout/PageWrapper";
import { DetailHeader } from "../../components/DetailHeader";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "../../hooks/useNotificationPreferences";
import { NotificationPreferences } from "../../services/auth.service";
import { useUIStore } from "../../store/uiStore";
import { useI18n } from "../../i18n/useI18n";

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

export function NotificationsPage() {
  const { t } = useI18n();
  const { showSnackbar } = useUIStore();
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  if (isLoading || !prefs) {
    return (
      <PageWrapper maxWidth="max-w-2xl">
        <DetailHeader title={t("screens.profile.notifications")} />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </PageWrapper>
    );
  }

  function handleChange(key: keyof NotificationPreferences, value: boolean) {
    updateMutation.mutate({ [key]: value } as Partial<NotificationPreferences>);
  }

  const currentOffset = prefs.notificationOffsetMinutes ?? 0;

  function handleOffsetChange(delta: number) {
    const next = Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, currentOffset + delta));
    if (next === currentOffset) return;
    updateMutation.mutate({ notificationOffsetMinutes: next });
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

  return (
    <PageWrapper maxWidth="max-w-2xl">
      <DetailHeader title={t("screens.profile.notifications")} />

      <div className="space-y-1">
        <div className="bg-surface rounded-lg p-4 mb-3">
          <p className="text-text font-medium text-sm mb-3">{t("screens.profile.notificationOffset")}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleOffsetChange(-OFFSET_STEP)}
              disabled={currentOffset <= OFFSET_MIN}
              className="w-10 h-10 rounded-full items-center justify-center bg-surface-light text-text disabled:opacity-40 transition-opacity"
            >
              −
            </button>
            <p className="text-text text-sm flex-1 text-center">
              {formatOffsetLabel(currentOffset, t)}
            </p>
            <button
              onClick={() => handleOffsetChange(OFFSET_STEP)}
              disabled={currentOffset >= OFFSET_MAX}
              className="w-10 h-10 rounded-full items-center justify-center bg-surface-light text-text disabled:opacity-40 transition-opacity"
            >
              +
            </button>
          </div>
        </div>

        {toggles.map((toggle) => (
          <div
            key={toggle.key}
            className="flex items-center justify-between px-4 py-3.5 bg-surface rounded-lg"
          >
            <span className="text-text text-sm font-medium flex-1">{toggle.label}</span>
            <button
              onClick={() => handleChange(toggle.key, !toggle.value)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                toggle.value ? "bg-primary" : "bg-surface-light"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  toggle.value ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
