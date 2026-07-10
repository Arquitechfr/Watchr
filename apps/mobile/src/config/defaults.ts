export const DEFAULT_REMOTE_CONFIG = {
  backend_url: "https://api.watchr.me",
  traffic_notice_enabled: false,
  auth_enabled: true,
  maintenance_enabled: false,
  comment_auto_hide_threshold: 5,
  comment_auto_spoiler_threshold: 3,
} as const;

export type RemoteConfig = typeof DEFAULT_REMOTE_CONFIG;
