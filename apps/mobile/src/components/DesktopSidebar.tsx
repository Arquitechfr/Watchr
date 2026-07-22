import { Pressable, View, Text, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { useNotificationStore } from "../store/notificationStore";
import { useBreakpoint, type Breakpoint } from "../hooks/useBreakpoint";

type TabName = "Series" | "Movies" | "Search" | "News" | "Profile";
type QuickActionRoute = "Import" | "Export" | "EditProfile";

interface DesktopSidebarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  onNavigate?: (route: QuickActionRoute) => void;
}

const TAB_CONFIG: { name: TabName; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { name: "Series", icon: "tv", labelKey: "navigation.series" },
  { name: "Movies", icon: "film", labelKey: "navigation.movies" },
  { name: "Search", icon: "search", labelKey: "navigation.search" },
  { name: "News", icon: "newspaper", labelKey: "navigation.news" },
  { name: "Profile", icon: "person", labelKey: "navigation.profile" },
];

const QUICK_ACTIONS: { route: QuickActionRoute; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { route: "Import", icon: "download-outline", labelKey: "screens.profile.importData" },
  { route: "Export", icon: "cloud-upload-outline", labelKey: "screens.profile.exportData" },
  { route: "EditProfile", icon: "settings-outline", labelKey: "screens.profile.editProfile" },
];

const SIDEBAR_WIDTH: Record<Breakpoint, number> = {
  mobile: 0,
  tablet: 220,
  desktop: 240,
  wide: 260,
};

export function DesktopSidebar({ activeTab, onTabPress, onNavigate }: DesktopSidebarProps) {
  const colors = useThemeColors();
  const { t } = useI18n();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const breakpoint = useBreakpoint();
  const sidebarWidth = SIDEBAR_WIDTH[breakpoint] ?? 220;
  const isWeb = Platform.OS === "web";

  return (
    <View
      style={{
        width: sidebarWidth,
        backgroundColor: colors.background,
        ...(isWeb ? ({ position: "sticky", top: 0, height: "100vh", overflow: "scroll" } as Record<string, string | number>) : {}),
      }}
      className="h-full border-r border-border py-6"
    >
      <View className="flex-row items-center px-5 mb-8" style={{ gap: 8 }}>
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require("../../assets/splash-icon.webp")}
          style={{ width: 28, height: 28 }}
          resizeMode="contain"
        />
        <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 20 }} className="text-text">
          Watchr
        </Text>
      </View>

      <View className="flex-1 px-3" style={{ gap: 4 }}>
        {TAB_CONFIG.map(({ name, icon, labelKey }, index) => {
          const isActive = activeTab === name;
          return (
            <Pressable
              key={name}
              onPress={() => onTabPress(name)}
              className="flex-row items-center rounded-lg px-4 py-3 hover:bg-surfaceLight cursor-pointer relative overflow-hidden"
              style={{
                backgroundColor: isActive ? colors.primary + "20" : "transparent",
              }}
              {...(isWeb ? { accessibilityRole: "link" as const } : {})}
            >
              {isActive && (
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 6,
                    bottom: 6,
                    width: 3,
                    borderRadius: 2,
                    backgroundColor: colors.primary,
                  }}
                />
              )}
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
                className="ml-3 flex-1"
                style={{
                  color: isActive ? colors.primary : colors.textMuted,
                  fontWeight: isActive ? "600" : "400",
                  fontSize: 15,
                }}
              >
                {t(labelKey)}
              </Text>
              {isWeb && (
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 11,
                    opacity: 0.5,
                    fontFamily: "Outfit_400Regular",
                  }}
                >
                  {index + 1}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {onNavigate && (
        <View className="px-3 pt-4 border-t border-border" style={{ gap: 4 }}>
          {QUICK_ACTIONS.map(({ route, icon, labelKey }) => (
            <Pressable
              key={route}
              onPress={() => onNavigate(route)}
              className="flex-row items-center rounded-lg px-4 py-2.5 hover:bg-surfaceLight cursor-pointer"
            >
              <Ionicons name={icon} size={18} color={colors.textMuted} />
              <Text
                className="ml-3"
                style={{ color: colors.textMuted, fontSize: 13 }}
              >
                {t(labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
