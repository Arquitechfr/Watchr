import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  fallback?: string;
}

export function BackButton({ fallback = "/series" }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => {
      if (window.history.length > 1) navigate(-1);
      else navigate(fallback);
      }}
      className="p-1 -ml-1 text-text hover:text-primary transition-colors"
    >
      <ArrowLeft size={24} />
    </button>
  );
}
