import { Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { useNotificationStore } from "../store/notificationStore";

type TabName = "Series" | "Movies" | "Search" | "News" | "Profile";

interface DesktopSidebarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}

const TAB_CONFIG: { name: TabName; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { name: "Series", icon: "tv", labelKey: "navigation.series" },
  { name: "Movies", icon: "film", labelKey: "navigation.movies" },
  { name: "Search", icon: "search", labelKey: "navigation.search" },
  { name: "News", icon: "newspaper", labelKey: "navigation.news" },
  { name: "Profile", icon: "person", labelKey: "navigation.profile" },
];

export function DesktopSidebar({ activeTab, onTabPress }: DesktopSidebarProps) {
  const colors = useThemeColors();
  const { t } = useI18n();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <View style={{ width: 220, backgroundColor: colors.surface }} className="h-full border-r border-border py-6">
      <View className="flex-row items-center px-5 mb-8" style={{ gap: 8 }}>
        <Ionicons name="play-circle" size={28} color={colors.primary} />
        <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 20 }} className="text-text">
          Watchr
        </Text>
      </View>

      <View className="flex-1 px-3" style={{ gap: 4 }}>
        {TAB_CONFIG.map(({ name, icon, labelKey }) => {
          const isActive = activeTab === name;
          return (
            <Pressable
              key={name}
              onPress={() => onTabPress(name)}
              className="flex-row items-center rounded-lg px-4 py-3"
              style={{
                backgroundColor: isActive ? colors.primary + "20" : "transparent",
              }}
            >
              <View className="relative">
                <Ionicons
                  name={icon}
                  size={22}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                {name === "Profile" && unreadCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -10,
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                      minWidth: 18,
                      height: 18,
                      paddingHorizontal: 4,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: colors.background, fontSize: 10, fontWeight: "700" }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                className="ml-3"
                style={{
                  color: isActive ? colors.primary : colors.textMuted,
                  fontWeight: isActive ? "600" : "400",
                  fontSize: 15,
                }}
              >
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
