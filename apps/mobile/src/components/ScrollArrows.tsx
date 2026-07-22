import { Platform, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RefObject, useCallback } from "react";
import { useThemeColors } from "../theme/useThemeColors";

interface ScrollArrowsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scrollRef: RefObject<any>;
  scrollAmount?: number;
}

export function ScrollArrows({ scrollRef, scrollAmount = 300 }: ScrollArrowsProps) {
  const colors = useThemeColors();

  const getCurrentOffset = useCallback(() => {
    const node = scrollRef.current?.getScrollableNode?.();
    return node?.scrollLeft ?? 0;
  }, [scrollRef]);

  const scrollLeft = useCallback(() => {
    const offset = getCurrentOffset() - scrollAmount;
    scrollRef.current?.scrollToOffset?.({ offset: Math.max(0, offset), animated: true });
    scrollRef.current?.scrollTo?.({ x: Math.max(0, offset), animated: true });
  }, [scrollRef, scrollAmount, getCurrentOffset]);

  const scrollRight = useCallback(() => {
    const offset = getCurrentOffset() + scrollAmount;
    scrollRef.current?.scrollToOffset?.({ offset, animated: true });
    scrollRef.current?.scrollTo?.({ x: offset, animated: true });
  }, [scrollRef, scrollAmount, getCurrentOffset]);

  if (Platform.OS !== "web") return null;

  return (
    <>
      <TouchableOpacity
        onPress={scrollLeft}
        className="absolute left-0 top-0 bottom-0 z-10 items-center justify-center"
        style={{ width: 32, backgroundColor: colors.background + "cc" }}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={scrollRight}
        className="absolute right-0 top-0 bottom-0 z-10 items-center justify-center"
        style={{ width: 32, backgroundColor: colors.background + "cc" }}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </TouchableOpacity>
    </>
  );
}
