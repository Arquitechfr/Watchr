import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, useWindowDimensions, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SeriesScreen } from "../screens/SeriesScreen";
import { MoviesScreen } from "../screens/MoviesScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { NewsScreen } from "../screens/NewsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications";
import { useTrackingRealtime } from "../hooks/useTrackingRealtime";
import { useUpcomingRealtime } from "../hooks/useUpcomingRealtime";
import { useNotificationStore } from "../store/notificationStore";

export type MainTabsParamList = {
  Series: undefined;
  Movies: undefined;
  Search: undefined;
  News: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

function SearchTabIcon({ focused: _focused }: { focused: boolean }) {
  const colors = useThemeColors();
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        width: 56,
        height: 56,
        backgroundColor: colors.primary,
        marginTop: -24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Ionicons name="search" size={28} color={colors.background} />
    </View>
  );
}

export function MainTabs() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 64 + insets.bottom;
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 768;

  useRealtimeNotifications();
  useTrackingRealtime();
  useUpcomingRealtime();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  function NotificationBadge() {
    const colors = useThemeColors();
    if (unreadCount === 0) return null;
    return (
      <View
        style={{
          position: "absolute",
          top: 4,
          right: 10,
          backgroundColor: colors.primary,
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          paddingHorizontal: 4,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.background, fontSize: 11, fontWeight: "700" }}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      initialRouteName="Series"
      screenOptions={{
        headerShown: false,
        tabBarStyle: isDesktopWeb
          ? { display: "none" }
          : {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              height: tabBarHeight,
              paddingBottom: 8 + insets.bottom,
            },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Series"
        component={SeriesScreen}
        options={{
          tabBarLabel: t("navigation.series"),
          tabBarIcon: ({ color, size }) => <Ionicons name="tv" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Movies"
        component={MoviesScreen}
        options={{
          tabBarLabel: t("navigation.movies"),
          tabBarIcon: ({ color, size }) => <Ionicons name="film" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ focused }) => <SearchTabIcon focused={focused} />,
          tabBarLabel: "",
        }}
      />
      <Tab.Screen
        name="News"
        component={NewsScreen}
        options={{
          tabBarLabel: t("navigation.news"),
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t("navigation.profile"),
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="person" size={size} color={color} />
              <NotificationBadge />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
