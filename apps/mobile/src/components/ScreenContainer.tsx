import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { cn } from "../utils/cn";

type ScreenContainerProps = {
  children: React.ReactNode;
  className?: string;
  edges?: Edge[];
};

export function ScreenContainer({
  children,
  className,
  edges = ["top", "left", "right", "bottom"],
}: ScreenContainerProps) {
  return (
    <SafeAreaView edges={edges} className={cn("flex-1 bg-background", className)}>
      {children}
    </SafeAreaView>
  );
}
