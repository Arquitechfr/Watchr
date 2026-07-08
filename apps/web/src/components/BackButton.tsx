import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  fallback?: string;
  onClick?: () => void;
}

export function BackButton({ fallback = "/series", onClick }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      if (window.history.length > 1) navigate(-1);
      else navigate(fallback);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="p-1 -ml-1 text-text hover:text-primary transition-colors"
    >
      <ArrowLeft size={24} />
    </button>
  );
}
