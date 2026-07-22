import { useState, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { CheckCircle, AlertCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Category = "bug" | "suggestion" | "question" | "other";

type SubjectKey =
  | "bug_app_crash" | "bug_display" | "bug_login" | "bug_import" | "bug_notification" | "bug_other"
  | "suggestion_feature" | "suggestion_ui" | "suggestion_content" | "suggestion_community" | "suggestion_other"
  | "question_account" | "question_data" | "question_howto" | "question_billing" | "question_other"
  | "other_partnership" | "other_press" | "other_feedback" | "other_other";

const SUBJECTS_BY_CATEGORY: Record<Category, SubjectKey[]> = {
  bug: ["bug_app_crash", "bug_display", "bug_login", "bug_import", "bug_notification", "bug_other"],
  suggestion: ["suggestion_feature", "suggestion_ui", "suggestion_content", "suggestion_community", "suggestion_other"],
  question: ["question_account", "question_data", "question_howto", "question_billing", "question_other"],
  other: ["other_partnership", "other_press", "other_feedback", "other_other"],
};

const SUBJECT_I18N_KEY: Record<SubjectKey, string> = {
  bug_app_crash: "contact.subjectBugAppCrash",
  bug_display: "contact.subjectBugDisplay",
  bug_login: "contact.subjectBugLogin",
  bug_import: "contact.subjectBugImport",
  bug_notification: "contact.subjectBugNotification",
  bug_other: "contact.subjectBugOther",
  suggestion_feature: "contact.subjectSuggestionFeature",
  suggestion_ui: "contact.subjectSuggestionUi",
  suggestion_content: "contact.subjectSuggestionContent",
  suggestion_community: "contact.subjectSuggestionCommunity",
  suggestion_other: "contact.subjectSuggestionOther",
  question_account: "contact.subjectQuestionAccount",
  question_data: "contact.subjectQuestionData",
  question_howto: "contact.subjectQuestionHowTo",
  question_billing: "contact.subjectQuestionBilling",
  question_other: "contact.subjectQuestionOther",
  other_partnership: "contact.subjectOtherPartnership",
  other_press: "contact.subjectOtherPress",
  other_feedback: "contact.subjectOtherFeedback",
  other_other: "contact.subjectOtherOther",
};

const CATEGORIES: { value: Category; labelKey: string }[] = [
  { value: "bug", labelKey: "contact.categoryBug" },
  { value: "suggestion", labelKey: "contact.categorySuggestion" },
  { value: "question", labelKey: "contact.categoryQuestion" },
  { value: "other", labelKey: "contact.categoryOther" },
];

const API_URL = "https://api.watchr.me";

export function ContactPage() {
  const { t, i18n } = useTranslation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<Category>("bug");
  const [subject, setSubject] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectOptions = useMemo(
    () =>
      SUBJECTS_BY_CATEGORY[category].map((key) => ({
        value: key,
        label: t(SUBJECT_I18N_KEY[key]),
      })),
    [category, t],
  );

  const canSubmit =
    name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    subject !== null &&
    message.trim().length >= 10 &&
    !submitting;

  const handleCategoryChange = useCallback((newCategory: Category) => {
    setCategory(newCategory);
    setSubject(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !subject) return;
    const subjectLabel = t(SUBJECT_I18N_KEY[subject as SubjectKey]);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/contact/public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": i18n.language?.split("-")[0] ?? "en",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category,
          subject: subjectLabel,
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setName("");
      setEmail("");
      setSubject(null);
      setMessage("");
      setCategory("bug");
      setSuccess(true);
    } catch {
      setError(t("contact.error"));
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, subject, name, email, category, message, t, i18n.language]);

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors";

  return (
    <>
      <Helmet>
        <title>{t("contact.metaTitle")}</title>
        <meta name="description" content={t("contact.metaDescription")} />
        <link rel="canonical" href="https://watchr.me/contact" />
        <meta property="og:title" content={t("contact.metaTitle")} />
        <meta property="og:description" content={t("contact.metaDescription")} />
        <meta property="og:url" content="https://watchr.me/contact" />
        <meta name="twitter:title" content={t("contact.metaTitle")} />
        <meta name="twitter:description" content={t("contact.metaDescription")} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: t("contact.title"),
            description: t("contact.metaDescription"),
            url: "https://watchr.me/contact",
          })}
        </script>
      </Helmet>

      <div className="pt-32 pb-20 sm:pt-40">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
            {t("contact.title")}
          </h1>
          <p className="mt-6 text-lg text-text-muted leading-relaxed">
            {t("contact.intro")}
          </p>

          {success ? (
            <div className="mt-10 rounded-xl border border-success/30 bg-success/10 p-8 text-center">
              <CheckCircle className="mx-auto mb-4 text-success" size={48} />
              <p className="text-lg font-medium text-text">{t("contact.success")}</p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => setSuccess(false)}
              >
                {t("contact.send")}
              </Button>
            </div>
          ) : (
            <form
              className="mt-10 space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-text">
                    {t("contact.name")}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("contact.namePlaceholder")}
                    className={inputClass}
                    maxLength={100}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-text">
                    {t("contact.email")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("contact.emailPlaceholder")}
                    className={inputClass}
                    maxLength={200}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  {t("contact.category")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => handleCategoryChange(cat.value)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        category === cat.value
                          ? "bg-primary text-background"
                          : "border border-border bg-transparent text-text hover:bg-surface"
                      }`}
                    >
                      {t(cat.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  {t("contact.subject")}
                </label>
                <select
                  value={subject ?? ""}
                  onChange={(e) => setSubject(e.target.value || null)}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>
                    {t("contact.subjectPlaceholder")}
                  </option>
                  {subjectOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  {t("contact.message")}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("contact.messagePlaceholder")}
                  className={`${inputClass} min-h-[120px] resize-y`}
                  maxLength={2000}
                  required
                />
                <p className="mt-1 text-right text-xs text-text-muted">
                  {message.length}/2000
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3">
                  <AlertCircle className="text-danger" size={18} />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={!canSubmit}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={18} />
                    {t("contact.sending")}
                  </>
                ) : (
                  <>
                    <Send className="mr-2" size={18} />
                    {t("contact.send")}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
