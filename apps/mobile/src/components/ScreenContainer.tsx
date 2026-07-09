import { Platform } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { cn } from "../utils/cn";

type ScreenContainerProps = {
  children: React.ReactNode;
  className?: string;
  edges?: Edge[];
  fullWidth?: boolean;
};

export function ScreenContainer({
  children,
  className,
  edges = ["top", "left", "right", "bottom"],
  fullWidth = false,
}: ScreenContainerProps) {
  const desktopClass = Platform.OS === "web" && !fullWidth ? "w-full max-w-[1200px] mx-auto" : "";
  return (
    <SafeAreaView edges={edges} className={cn("flex-1 bg-background", desktopClass, className)}>
      {children}
    </SafeAreaView>
  );
}
