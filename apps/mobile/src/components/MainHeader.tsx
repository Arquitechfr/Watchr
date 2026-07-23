import { View, Text, Platform, useWindowDimensions } from "react-native";
import { CachedImage as Image } from "./CachedImage";

interface MainHeaderProps {
  rightElement?: React.ReactNode;
}

export function MainHeader({ rightElement }: MainHeaderProps) {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 768;

  return (
    <View className="flex-row items-center justify-between mb-4">
      {isDesktopWeb ? (
        <View />
      ) : (
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require("../../assets/splash-icon.webp")}
            style={{ width: 40, height: 40 }}
            contentFit="contain"
          />
          <Text
            style={{ fontFamily: "Outfit_700Bold", fontSize: 20 }}
            className="text-text"
          >
            Watchr
          </Text>
        </View>
      )}
      {rightElement && (
        <View className="flex-row items-center" style={{ gap: 12 }}>
          {rightElement}
        </View>
      )}
    </View>
  );
}
