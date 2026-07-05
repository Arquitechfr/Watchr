import type { ReactNode } from "react";

interface ScreenContainerProps {
  children: ReactNode;
  className?: string;
}

export function ScreenContainer({ children, className = "" }: ScreenContainerProps) {
  return (
    <div className={`min-h-screen flex flex-col bg-background ${className}`}>
      {children}
    </div>
  );
}
