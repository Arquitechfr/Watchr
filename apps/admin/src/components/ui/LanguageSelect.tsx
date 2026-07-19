import { SUPPORTED_LANGUAGES } from "../../lib/languages";

interface LanguageSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function LanguageSelect({
  value,
  onChange,
  placeholder = "Select language...",
  className = "",
  required = false,
}: LanguageSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text ${className}`}
    >
      <option value="">{placeholder}</option>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.label}
        </option>
      ))}
    </select>
  );
}
