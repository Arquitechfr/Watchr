export const DEFAULT_REMOTE_CONFIG = {
  backend_url: "https://api.watchr.me",
  traffic_notice_enabled: false,
  auth_enabled: true,
  maintenance_enabled: false,
  comment_auto_hide_threshold: 5,
  comment_auto_spoiler_threshold: 3,
  rating_cooldown_days: 7,
  ai_spoiler_detection_enabled: false,
  ai_toxic_detection_enabled: false,
  ai_recommendations_enabled: false,
  ai_search_enabled: false,
  ai_import_matching_enabled: false,
  ai_news_summary_enabled: false,
  ai_thread_summary_enabled: false,
  ai_push_personalization_enabled: false,
  ai_insights_enabled: false,
  ai_mood_recommendations_enabled: false,
  ai_similar_shows_enabled: false,
  ai_email_digest_enabled: false,
  ai_semantic_search_enabled: false,
  ai_onboarding_suggestions_enabled: false,
  ai_admin_assistant_enabled: false,
  ai_news_filtering_enabled: false,
  ai_reengagement_enabled: false,
  ai_year_in_review_enabled: false,
  ai_anomaly_detection_enabled: false,
  ai_episode_summary_enabled: false,
  ai_tags_enrichment_enabled: false,
  ai_auto_translate_enabled: true,
} as const;

export type RemoteConfig = typeof DEFAULT_REMOTE_CONFIG;

export const DEFAULT_REMOTE_CONFIG_DESCRIPTIONS: Record<string, string> = {};

export type RemoteConfigDescriptions = Record<string, string>;
