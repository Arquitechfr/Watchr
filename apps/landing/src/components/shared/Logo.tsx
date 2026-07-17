import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src="/icon-192.png"
        alt="Watchr"
        width={64}
        height={64}
        className="h-18 w-18 rounded-lg"
      />
      {showText && (
        <span className="text-xl font-bold tracking-tight text-text">
          Watchr
        </span>
      )}
    </div>
  );
}
