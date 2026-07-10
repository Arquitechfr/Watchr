import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import api from "../../lib/api";
import { cn } from "@/lib/utils";

interface AiImproveButtonProps {
  value: string;
  onImproved: (text: string) => void;
  format?: "plain" | "html";
  className?: string;
}

export function AiImproveButton({ value, onImproved, format = "plain", className }: AiImproveButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImprove() {
    if (!value.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/admin/ai/improve-text", { text: value, format });
      onImproved(data.improvedText);
    } catch (err: unknown) {
      const message =
        err instanceof Error && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? "AI improvement failed"
          : "AI improvement failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleImprove}
        disabled={!value.trim() || loading}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Improving..." : "Improve with AI"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
