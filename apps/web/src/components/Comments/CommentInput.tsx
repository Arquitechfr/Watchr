import { useState, useRef } from "react";
import { ImageIcon, AlertTriangle, Send } from "lucide-react";
import { uploadCommentImage } from "../../services/upload.service";
import { useI18n } from "../../i18n/useI18n";

interface CommentInputProps {
  onSubmit: (input: { content: string; images?: string[]; isSpoiler: boolean }) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommentInput({ onSubmit, placeholder, autoFocus }: CommentInputProps) {
  const { t } = useI18n();
  const [content, setContent] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadCommentImage(file);
      setImages((prev) => [...prev, url]);
    } catch {
      // ignore
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSubmit() {
    if (!content.trim()) return;
    onSubmit({ content: content.trim(), images: images.length > 0 ? images : undefined, isSpoiler });
    setContent("");
    setImages([]);
    setIsSpoiler(false);
  }

  return (
    <div className="bg-surface rounded-lg p-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder ?? t("comments.writeComment")}
        autoFocus={autoFocus}
        rows={3}
        className="w-full bg-background text-text placeholder:text-text-muted rounded-md p-2 text-sm border border-border focus:outline-none focus:border-primary transition-colors resize-none"
      />
      {images.length > 0 && (
        <div className="flex gap-2 mt-2">
          {images.map((url, i) => (
            <img key={i} src={url} alt="" className="w-16 h-16 rounded-md object-cover" />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-1.5 text-text-muted hover:text-text transition-colors"
          >
            <ImageIcon size={18} />
          </button>
          <button
            onClick={() => setIsSpoiler(!isSpoiler)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isSpoiler ? "bg-danger/20 text-danger" : "text-text-muted hover:text-text"
            }`}
          >
            <AlertTriangle size={14} />
            {t("comments.spoiler")}
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || uploading}
          className="flex items-center gap-1.5 bg-primary text-background px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          <Send size={16} />
          {t("comments.post")}
        </button>
      </div>
    </div>
  );
}
