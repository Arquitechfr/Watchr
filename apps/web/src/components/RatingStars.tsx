import { Star } from "lucide-react";
import { useState } from "react";

interface RatingStarsProps {
  value: number | null;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
}

export function RatingStars({ value, onChange, size = 24, readOnly = false }: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value ?? 0;

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHoverValue(null)}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <button
          key={star}
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHoverValue(star)}
          className={`${readOnly ? "cursor-default" : "cursor-pointer"} transition-transform ${
            !readOnly ? "hover:scale-110" : ""
          }`}
          aria-label={`${star}/10`}
        >
          <Star
            size={size}
            className={star <= displayValue ? "fill-primary text-primary" : "text-text-muted"}
          />
        </button>
      ))}
      {value !== null && (
        <span className="text-text text-sm font-medium ml-2">
          {value}/10
        </span>
      )}
    </div>
  );
}
