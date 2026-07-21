import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  height?: number | string;
  width?: number | string;
}

export function Skeleton({ className, height, width, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-light", className)}
      style={{ height, width, ...style }}
      {...props}
    />
  );
}
