import { useMemo, useRef, useCallback } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import api from "../../lib/api";
import { logError } from "../../lib/logger";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);

  const handleImageUpload = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/jpeg,image/png,image/webp");
    input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "email");
      try {
        const { data } = await api.post("/admin/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, "image", data.url);
          quill.setSelection(range.index + 1, 0);
        }
      } catch (err) {
        logError("Image upload failed", err);
      }
    };
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: handleImageUpload,
        },
      },
    }),
    [handleImageUpload],
  );

  return (
    <div className="rich-text-editor-wrapper">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder ?? "Write your email content here..."}
      />
      <style>{`
        .rich-text-editor-wrapper .ql-container {
          border: 1px solid var(--border, #333);
          border-radius: 0.375rem;
          background: var(--background, #0a0a0a);
          color: var(--text, #f5f0eb);
          min-height: 200px;
          font-size: 0.875rem;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: 200px;
          padding: 0.75rem;
          color: var(--text, #f5f0eb);
        }
        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: var(--text-muted, #666);
          font-style: normal;
        }
        .rich-text-editor-wrapper .ql-tooltip {
          z-index: 50;
        }
        .rich-text-editor-wrapper .ql-toolbar {
          border: 1px solid var(--border, #333);
          border-bottom: none;
          border-radius: 0.375rem 0.375rem 0 0;
          background: var(--surface, #1a1a1a);
        }
        .rich-text-editor-wrapper .ql-toolbar button {
          color: var(--text, #f5f0eb);
        }
        .rich-text-editor-wrapper .ql-toolbar button:hover {
          color: var(--primary, #c65d3a);
        }
        .rich-text-editor-wrapper .ql-toolbar .ql-stroke {
          stroke: var(--text, #f5f0eb);
        }
        .rich-text-editor-wrapper .ql-toolbar .ql-fill {
          fill: var(--text, #f5f0eb);
        }
        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-stroke {
          stroke: var(--primary, #c65d3a);
        }
        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-fill {
          fill: var(--primary, #c65d3a);
        }
        .rich-text-editor-wrapper .ql-toolbar .ql-picker-label {
          color: var(--text, #f5f0eb);
        }
      `}</style>
    </div>
  );
}
