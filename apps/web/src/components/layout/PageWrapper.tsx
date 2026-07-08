import type { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

export function PageWrapper({ children, className = "", maxWidth = "max-w-5xl" }: PageWrapperProps) {
  return (
    <div className={`flex-1 overflow-y-auto pb-20 lg:pb-0 ${className}`}>
      <div className={`${maxWidth} mx-auto w-full px-4 py-6 lg:px-8 lg:py-8`}>
        {children}
      </div>
    </div>
  );
}
