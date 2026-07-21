import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import api from "../../lib/api";
import { logError } from "../../lib/logger";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  category?: string;
}

export function ImageUpload({ value, onChange, label = "Image", category = "notification" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      const { data } = await api.post("/admin/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
    } catch (err) {
      setError("Upload failed");
      logError("Image upload failed", err);
    } finally {
      setUploading(false);
    }
  }, [category, onChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleRemove = useCallback(() => {
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = "";
  }, [onChange]);

  return (
    <div>
      <label className="mb-1.5 block text-sm text-text-muted">{label}</label>
      {value ? (
        <div className="relative rounded-md border border-border overflow-hidden">
          <img src={value} alt="Preview" className="w-full max-h-48 object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 rounded-md bg-black/70 p-1.5 text-white hover:bg-black/90 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface p-6 cursor-pointer hover:border-primary transition-colors min-h-[120px]"
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-primary" />
          ) : (
            <>
              <div className="flex items-center gap-2 text-text-muted">
                {error ? <X size={20} className="text-red-400" /> : <Upload size={20} />}
              </div>
              <span className="text-xs text-text-muted">
                {error ?? "Click or drag to upload an image"}
              </span>
              <span className="text-xs text-text-muted/60">JPG, PNG, WebP — max 5MB</span>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
