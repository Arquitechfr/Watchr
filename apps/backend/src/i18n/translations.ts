export const SUPPORTED_LOCALES = ["en", "fr"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

const fr = {
  errors: {
    UNAUTHORIZED: "Non autorisé.",
    MISSING_TOKEN: "Token manquant.",
    INVALID_TOKEN: "Token invalide ou expiré.",
    SHOW_NOT_FOUND: "Série ou film introuvable.",
    USER_NOT_FOUND: "Utilisateur introuvable.",
    COMMENT_NOT_FOUND: "Commentaire introuvable.",
    PARENT_COMMENT_NOT_FOUND: "Commentaire parent introuvable.",
    NESTING_TOO_DEEP: "Impossible de répondre à une réponse.",
    SHOW_MISMATCH: "Le commentaire parent appartient à une autre série.",
    RATING_NOT_FOUND: "Note introuvable.",
    TRACKING_NOT_FOUND: "Suivi introuvable.",
    INVALID_SOURCE: "Source d'actualités invalide.",
    NEWS_FETCH_ERROR: "Impossible de récupérer les actualités.",
    IMPORT_FAILED: "L'import a échoué.",
    VALIDATION_ERROR: "Validation échouée.",
    TOO_MANY_AUTH_ATTEMPTS: "Trop de tentatives d'authentification. Réessaie plus tard.",
    NO_FILE_UPLOADED: "Aucun fichier envoyé.",
    INVALID_FILE_TYPE: "Type de fichier invalide.",
    IMPORT_TOO_LARGE: "Fichier d'import trop volumineux.",
    EPISODE_NOT_FOUND: "Épisode introuvable.",
    SEASON_NOT_FOUND: "Saison introuvable.",
    UNAUTHORIZED_DELETE: "Tu ne peux pas supprimer cette ressource.",
    ALREADY_TRACKED: "Déjà suivi.",
    UNKNOWN: "Une erreur est survenue.",
  },
};

const en = {
  errors: {
    UNAUTHORIZED: "Unauthorized.",
    MISSING_TOKEN: "Missing token.",
    INVALID_TOKEN: "Invalid or expired token.",
    SHOW_NOT_FOUND: "Show or movie not found.",
    USER_NOT_FOUND: "User not found.",
    COMMENT_NOT_FOUND: "Comment not found.",
    PARENT_COMMENT_NOT_FOUND: "Parent comment not found.",
    NESTING_TOO_DEEP: "Cannot reply to a reply.",
    SHOW_MISMATCH: "Parent comment belongs to another show.",
    RATING_NOT_FOUND: "Rating not found.",
    TRACKING_NOT_FOUND: "Tracking entry not found.",
    INVALID_SOURCE: "Invalid news source.",
    NEWS_FETCH_ERROR: "Failed to fetch news.",
    IMPORT_FAILED: "Import failed.",
    VALIDATION_ERROR: "Validation failed.",
    TOO_MANY_AUTH_ATTEMPTS: "Too many auth attempts. Try again later.",
    NO_FILE_UPLOADED: "No file uploaded.",
    INVALID_FILE_TYPE: "Invalid file type.",
    IMPORT_TOO_LARGE: "Import file too large.",
    EPISODE_NOT_FOUND: "Episode not found.",
    SEASON_NOT_FOUND: "Season not found.",
    UNAUTHORIZED_DELETE: "You are not allowed to delete this resource.",
    ALREADY_TRACKED: "Already tracked.",
    UNKNOWN: "Something went wrong.",
  },
};

export const translations = { en, fr };

export function normalizeLocale(raw: string | undefined): SupportedLocale {
  if (!raw) return DEFAULT_LOCALE;
  const base = raw.split("-")[0].toLowerCase() as SupportedLocale;
  return SUPPORTED_LOCALES.includes(base) ? base : DEFAULT_LOCALE;
}
