import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeColors } from "../theme/useThemeColors";

interface SubScreenHeaderProps {
  title: string;
  onBack?: () => void;
}

export function SubScreenHeader({ title, onBack }: SubScreenHeaderProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View className="flex-row items-center mb-6">
      <TouchableOpacity
        onPress={() => (onBack ? onBack() : navigation.goBack())}
        activeOpacity={0.7}
        className="p-1 absolute left-0 z-10"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text className="text-text text-lg font-bold flex-1 text-center pl-8" numberOfLines={2}>{title}</Text>
    </View>
  );
}
