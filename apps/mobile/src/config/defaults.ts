export const DEFAULT_REMOTE_CONFIG = {
  backend_url: "https://api.watchr.me",
  traffic_notice_enabled: false,
} as const;

export type RemoteConfig = typeof DEFAULT_REMOTE_CONFIG;
