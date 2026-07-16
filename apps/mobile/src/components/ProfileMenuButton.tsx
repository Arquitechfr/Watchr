import { useState } from "react";
import { Modal, View, Text, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  target: keyof RootStackParamList;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: "person-circle-outline", labelKey: "screens.profile.editProfile", target: "EditProfile" },
  { icon: "people-outline", labelKey: "screens.social.friendsActivity", target: "FriendsActivity" },
  { icon: "search-outline", labelKey: "screens.social.findFriends", target: "UserSearch" },
  { icon: "language-outline", labelKey: "screens.profile.language", target: "ProfileLanguage" },
  { icon: "color-palette-outline", labelKey: "screens.profile.appearance", target: "ProfileAppearance" },
  { icon: "library-outline", labelKey: "screens.profile.library", target: "Library" },
  { icon: "server-outline", labelKey: "screens.profile.myData", target: "ProfileData" },
  { icon: "notifications-outline", labelKey: "screens.profile.notifications", target: "ProfileNotifications" },
  { icon: "mail-outline", labelKey: "screens.profile.contact", target: "ProfileContact" },
];

export function ProfileMenuButton() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const [visible, setVisible] = useState(false);

  function handleSelect(target: keyof RootStackParamList) {
    setVisible(false);
    navigation.navigate(target as never);
  }

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} activeOpacity={0.7} hitSlop={8}>
        <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setVisible(false)}>
          <View
            className="absolute top-16 right-4 rounded-xl overflow-hidden"
            style={{ backgroundColor: colors.surface, minWidth: 200, elevation: 8, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
          >
            {MENU_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.target}
                onPress={() => handleSelect(item.target)}
                className="flex-row items-center px-4 py-3"
                style={index < MENU_ITEMS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : undefined}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon} size={20} color={colors.primary} />
                <Text className="text-text text-base ml-3">{t(item.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
