import { View, StyleProp, ViewStyle } from "react-native";

interface SkeletonProps {
  width?: number | `${number}%` | "auto";
  height?: number;
  className?: string;
  borderRadius?: number;
}

export function Skeleton({
  width = "100%",
  height = 16,
  className = "",
  borderRadius = 8,
}: SkeletonProps) {
  const style: StyleProp<ViewStyle> = {
    width: width as never,
    height,
    borderRadius,
  };

  return <View className={`bg-surface-light ${className}`} style={style} />;
}

export function ShowCardSkeleton() {
  return (
    <View className="flex-row items-center bg-surface rounded-xl p-3 mb-3">
      <Skeleton width={80} height={112} borderRadius={8} />
      <View className="flex-1 ml-4">
        <Skeleton width="70%" height={18} className="mb-2" />
        <Skeleton width="40%" height={14} />
      </View>
    </View>
  );
}
