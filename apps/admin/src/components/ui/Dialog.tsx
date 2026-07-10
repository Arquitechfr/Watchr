import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
        }}
      />
      <div
        style={{
          position: "relative",
          backgroundColor: "#1A1614",
          border: "1px solid #2A2422",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "min(92vw, 600px)",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {title && (
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#F5F0EB", margin: "0 0 16px 0" }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
