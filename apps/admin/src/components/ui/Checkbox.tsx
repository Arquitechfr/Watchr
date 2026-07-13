import { type InputHTMLAttributes, forwardRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, checked, ...props }, ref) => (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded border transition-colors",
          checked
            ? "border-primary bg-primary text-white"
            : "border-border bg-background",
          className,
        )}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        className="sr-only"
        {...props}
      />
    </label>
  ),
);
Checkbox.displayName = "Checkbox";
