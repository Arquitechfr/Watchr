import { useState } from "react";
import { Modal, View, Text, TouchableOpacity, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useUnreadCount } from "../hooks/useMessages";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { logout } from "../services/auth.service";
import { getItem as secureGetItem } from "../utils/secureStorage";
import { log } from "../utils/logger";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  target: keyof RootStackParamList;
}

const MESSAGES_ITEM: MenuItem = {
  icon: "chatbubbles-outline",
  labelKey: "messages.title",
  target: "ConversationList",
};

const MENU_ITEMS: MenuItem[] = [
  MESSAGES_ITEM,
  { icon: "person-circle-outline", labelKey: "screens.profile.editProfile", target: "EditProfile" },
  { icon: "people-outline", labelKey: "screens.social.friendsActivity", target: "FriendsActivity" },
  { icon: "search-outline", labelKey: "screens.social.findFriends", target: "UserSearch" },
  { icon: "library-outline", labelKey: "screens.profile.library", target: "Library" },
  { icon: "settings-outline", labelKey: "screens.profile.settings", target: "ProfileSettings" },
];

export function ProfileMenuButton() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const [visible, setVisible] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.unreadCount ?? 0;
  const { logout: clearAuth } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();

  function handleSelect(target: keyof RootStackParamList) {
    setVisible(false);
    navigation.navigate(target as never);
  }

  function handleLogoutPress() {
    setVisible(false);
    setShowConfirm(true);
  }

  async function handleLogout() {
    log("Logout", "start");
    setIsLoggingOut(true);
    try {
      const refreshToken = await secureGetItem("refreshToken");
      if (refreshToken) {
        log("Logout", "calling api");
        await logout(refreshToken);
      } else {
        log("Logout", "no refresh token");
      }
    } catch (err) {
      log("Logout", "api error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      log("Logout", "clearing auth");
      await clearAuth();
      setIsLoggingOut(false);
      setShowConfirm(false);
      log("Logout", "navigate to auth");
      navigation.navigate("Auth");
    }
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
                <Text className="text-text text-base ml-3 flex-1">{t(item.labelKey)}</Text>
                {item.target === "ConversationList" && unreadCount > 0 && (
                  <View
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      paddingHorizontal: 6,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: colors.background, fontSize: 11, fontWeight: "700" }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={handleLogoutPress}
              className="flex-row items-center px-4 py-3"
              style={{ borderTopWidth: 1, borderTopColor: colors.border }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text className="text-base ml-3 flex-1" style={{ color: colors.danger }}>
                {t("screens.profile.logout")}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => !isLoggingOut && setShowConfirm(false)}>
        <Pressable className="flex-1 items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => !isLoggingOut && setShowConfirm(false)}>
          <Pressable
            className="rounded-xl p-6"
            style={{ backgroundColor: colors.surface, width: "80%", maxWidth: 320 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-text text-lg font-bold text-center mb-2">
              {t("screens.profile.logout")}
            </Text>
            <Text className="text-text-muted text-base text-center mb-6">
              {t("screens.profile.logoutConfirm")}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: colors.border }}
                onPress={() => setShowConfirm(false)}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                <Text className="text-text font-semibold">{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: colors.danger }}
                onPress={handleLogout}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="font-semibold" style={{ color: "#fff" }}>{t("common.confirm")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
