import { useState, useEffect } from "react";
import { PageWrapper } from "../../components/layout/PageWrapper";
import { DetailHeader } from "../../components/DetailHeader";
import { getNotificationPreferences, updateNotificationPreferences } from "../../services/auth.service";
import type { NotificationPreferences } from "../../services/auth.service";
import { useUIStore } from "../../store/uiStore";
import { useI18n } from "../../i18n/useI18n";

export function NotificationsPage() {
  const { t } = useI18n();
  const { showSnackbar } = useUIStore();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotificationPreferences()
      .then((res: { notificationPreferences: NotificationPreferences }) => setPrefs(res.notificationPreferences))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(key: keyof NotificationPreferences) {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await updateNotificationPreferences(updated);
    } catch {
      showSnackbar(t("errors.unknown"), "error");
      setPrefs(prefs);
    }
  }

  if (loading) {
    return (
      <PageWrapper maxWidth="max-w-2xl">
        <DetailHeader title={t("screens.profile.notifications")} />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  const items: Array<{ key: keyof NotificationPreferences; label: string }> = [
    { key: "newReleases", label: t("screens.profile.notifNewEpisode") },
    { key: "commentReplies", label: t("screens.profile.notifNewReply") },
    { key: "commentReactions", label: t("screens.profile.notifNewReaction") },
    { key: "commentLikes", label: t("screens.profile.notifNewComment") },
  ];

  return (
    <PageWrapper maxWidth="max-w-2xl">
      <DetailHeader title={t("screens.profile.notifications")} />

      <div className="space-y-1">
        {items.map(({ key, label }) => (
          <div
            key={key as string}
            className="flex items-center justify-between px-4 py-3.5 bg-surface rounded-lg"
          >
            <span className="text-text text-sm font-medium">{label}</span>
            <button
              onClick={() => handleToggle(key)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                prefs?.[key] ? "bg-primary" : "bg-surface-light"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  prefs?.[key] ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
