import { useState } from "react";
import { ChevronDown, ChevronUp, Languages, Loader2 } from "lucide-react";
import type { JobStatus, JobTranslation } from "../../hooks/useJobPolling";
import { Badge } from "./Badge";
import { LANGUAGE_FLAGS, LANGUAGE_NAMES } from "../../lib/languages";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Translating...", className: "bg-blue-500/20 text-blue-400" },
  completed: { label: "Translated", className: "bg-green-500/20 text-green-400" },
  failed: { label: "Translation failed", className: "bg-red-500/20 text-red-400" },
  skipped: { label: "Skipped (VO)", className: "bg-yellow-500/20 text-yellow-400" },
};

interface TranslationProgressProps {
  job: JobStatus | null;
}

export function TranslationProgress({ job }: TranslationProgressProps) {
  const [expanded, setExpanded] = useState(false);

  if (!job || !job.translationStatus) return null;

  const statusConfig = STATUS_CONFIG[job.translationStatus] ?? STATUS_CONFIG.skipped;
  const translations = job.translations ?? {};
  const translatedLangs = Object.keys(translations);

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Languages size={16} className="text-text-muted" />
          <span className="text-sm font-medium text-text">Auto-translation</span>
          {job.sourceLanguage && (
            <span className="text-xs text-text-muted">
              Source: {LANGUAGE_FLAGS[job.sourceLanguage] ?? ""} {LANGUAGE_NAMES[job.sourceLanguage] ?? job.sourceLanguage}
            </span>
          )}
        </div>
        <Badge className={statusConfig.className}>
          {job.translationStatus === "pending" && <Loader2 size={10} className="mr-1 animate-spin" />}
          {statusConfig.label}
        </Badge>
      </div>

      {translatedLangs.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {translatedLangs.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs text-text"
                title={LANGUAGE_NAMES[lang] ?? lang}
              >
                {LANGUAGE_FLAGS[lang] ?? ""} {lang.toUpperCase()}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Hide" : "Show"} translations
          </button>

          {expanded && (
            <div className="space-y-2 max-h-64 overflow-auto">
              {translatedLangs.map((lang) => {
                const t: JobTranslation = translations[lang];
                return (
                  <div key={lang} className="rounded-md bg-background p-3 space-y-1">
                    <div className="text-xs font-medium text-text-muted">
                      {LANGUAGE_FLAGS[lang] ?? ""} {LANGUAGE_NAMES[lang] ?? lang}
                    </div>
                    {t.subject && (
                      <div className="text-sm text-text">
                        <span className="text-text-muted">Subject: </span>
                        {t.subject}
                      </div>
                    )}
                    {t.title && (
                      <div className="text-sm text-text">
                        <span className="text-text-muted">Title: </span>
                        {t.title}
                      </div>
                    )}
                    {t.body && (
                      <div className="text-sm text-text">
                        <span className="text-text-muted">Body: </span>
                        {t.body}
                      </div>
                    )}
                    {t.htmlContent && (
                      <details className="text-sm text-text">
                        <summary className="cursor-pointer text-text-muted text-xs">HTML content</summary>
                        <div
                          className="mt-1 text-xs text-text-muted overflow-auto max-h-32"
                          dangerouslySetInnerHTML={{ __html: t.htmlContent }}
                        />
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
