import { Search, X } from "lucide-react";
import { useI18n } from "../i18n/useI18n";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChange, placeholder, autoFocus }: SearchBarProps) {
  const { t } = useI18n();

  return (
    <div className="relative flex items-center">
      <Search size={20} className="absolute left-3 text-text-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("screens.search.placeholder")}
        autoFocus={autoFocus}
        className="w-full bg-surface text-text placeholder:text-text-muted rounded-lg pl-10 pr-10 py-2.5 text-sm border border-border focus:outline-none focus:border-primary transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 text-text-muted hover:text-text transition-colors"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
