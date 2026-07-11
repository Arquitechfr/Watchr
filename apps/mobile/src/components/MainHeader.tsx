import { View, Text, Image } from "react-native";

interface MainHeaderProps {
  rightElement?: React.ReactNode;
}

export function MainHeader({ rightElement }: MainHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-row items-center" style={{ gap: 4 }}>
        <Image
          source={require("../../assets/splash-icon.webp")}
          style={{ width: 40, height: 40 }}
          resizeMode="contain"
        />
        <Text
          style={{ fontFamily: "Outfit_700Bold", fontSize: 20 }}
          className="text-text"
        >
          Watchr
        </Text>
      </View>
      {rightElement && (
        <View className="flex-row items-center" style={{ gap: 12 }}>
          {rightElement}
        </View>
      )}
    </View>
  );
}
