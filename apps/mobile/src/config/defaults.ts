export const DEFAULT_REMOTE_CONFIG = {
  backend_url: "https://api.watchr.me",
  traffic_notice_enabled: false,
  auth_enabled: true,
  maintenance_enabled: false,
  comment_auto_hide_threshold: 5,
  comment_auto_spoiler_threshold: 3,
  ai_spoiler_detection_enabled: false,
  ai_toxic_detection_enabled: false,
  ai_recommendations_enabled: false,
  ai_search_enabled: false,
  ai_import_matching_enabled: false,
} as const;

export type RemoteConfig = typeof DEFAULT_REMOTE_CONFIG;

export const DEFAULT_REMOTE_CONFIG_DESCRIPTIONS: Record<string, string> = {};

export type RemoteConfigDescriptions = Record<string, string>;
