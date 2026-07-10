import { useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.bubble.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
    }),
    [],
  );

  return (
    <div className="rich-text-editor-wrapper">
      <ReactQuill
        theme="bubble"
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
