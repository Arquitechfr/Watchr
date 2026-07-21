import { useState } from "react";
import { Globe, Loader2, X } from "lucide-react";
import api from "../../lib/api";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { SUPPORTED_LANGUAGES } from "../../lib/languages";
import { extractApiErrorMessage } from "../../lib/logger";

interface TranslatePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  body?: string;
  subject?: string;
  htmlContent?: string;
}

interface TranslationEntry {
  title?: string;
  body?: string;
  subject?: string;
  htmlContent?: string;
}

const AVAILABLE_LANGS = SUPPORTED_LANGUAGES.map((l) => ({ code: l.code, label: l.label }));

export function TranslatePreviewDialog({
  open,
  onClose,
  title,
  body,
  subject,
  htmlContent,
}: TranslatePreviewDialogProps) {
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["fr", "es"]);
  const [translations, setTranslations] = useState<Record<string, TranslationEntry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleLang(code: string) {
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );
  }

  async function handlePreview() {
    if (selectedLangs.length === 0) return;
    setLoading(true);
    setError(null);
    setTranslations(null);
    try {
      const payload: Record<string, unknown> = { targetLangs: selectedLangs };
      if (title) payload.title = title;
      if (body) payload.body = body;
      if (subject) payload.subject = subject;
      if (htmlContent) payload.htmlContent = htmlContent;
      const { data } = await api.post("/admin/ai/translate-preview", payload);
      setTranslations(data.translations);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Translation failed"));
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setTranslations(null);
    setError(null);
    onClose();
  }

  const hasContent = title || body || subject || htmlContent;

  return (
    <Dialog open={open} onClose={handleClose} title="Multilingual Preview">
      <div className="space-y-4">
        {!hasContent && (
          <p className="text-sm text-text-muted">Enter some content first to preview translations.</p>
        )}

        {hasContent && (
          <>
            <div>
              <p className="text-sm font-medium text-text mb-2">Target Languages</p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLang(lang.code)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      selectedLangs.includes(lang.code)
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-background text-text-muted hover:text-text"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handlePreview}
              disabled={selectedLangs.length === 0 || loading}
              size="sm"
            >
              {loading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Globe size={14} className="mr-2" />}
              {loading ? "Translating..." : "Generate Preview"}
            </Button>

            {error && <p className="text-sm text-danger">{error}</p>}

            {translations && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {Object.entries(translations).map(([lang, entry]) => (
                  <div key={lang} className="rounded-md border border-border bg-surface-light p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary uppercase">{lang}</span>
                      <button
                        onClick={() => {
                          const text = [entry.subject, entry.title, entry.body, entry.htmlContent]
                            .filter(Boolean)
                            .join("\n\n");
                          navigator.clipboard.writeText(text);
                        }}
                        className="text-xs text-text-muted hover:text-text"
                      >
                        Copy
                      </button>
                    </div>
                    {entry.subject && (
                      <p className="text-sm font-medium text-text mb-1">{entry.subject}</p>
                    )}
                    {entry.title && (
                      <p className="text-sm font-medium text-text mb-1">{entry.title}</p>
                    )}
                    {entry.body && (
                      <p className="text-sm text-text-muted whitespace-pre-wrap">{entry.body}</p>
                    )}
                    {entry.htmlContent && (
                      <iframe
                        srcDoc={entry.htmlContent}
                        sandbox=""
                        className="w-full h-[150px] rounded-md border border-border bg-white mt-2"
                        title={`Preview ${lang}`}
                      />
                    )}
                  </div>
                ))}
                {Object.keys(translations).length === 0 && (
                  <p className="text-sm text-text-muted">No translations returned. Check AI configuration.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
