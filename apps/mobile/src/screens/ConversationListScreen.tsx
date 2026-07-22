import React, { useMemo, useState } from "react";
import { FlatList, View, Text, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { useConversations, useUnreadCount } from "../hooks/useMessages";
import { useAuthStore } from "../store/authStore";
import { ScreenContainer } from "../components/ScreenContainer";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { Seo } from "../components/Seo";
import { Avatar } from "../components/Avatar";
import { NewConversationSheet } from "../components/NewConversationSheet";
import type { ConversationItem } from "../services/message.service";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function ConversationListScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavProp>();
  const currentUserId = useAuthStore((s) => s.userId);
  const [showNewConversation, setShowNewConversation] = useState(false);

  const { data, refetch, isRefetching } = useConversations();
  const { data: unreadData } = useUnreadCount();

  const conversations = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((p) => p.conversations);
  }, [data]);

  function renderItem({ item }: { item: ConversationItem }) {
    const isLastFromMe = item.lastMessage?.senderId === currentUserId;
    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}
        onPress={() => navigation.navigate("Chat", { conversationId: item.id, otherUsername: item.otherUser.username, otherUserAvatarUrl: item.otherUser.avatarUrl })}
      >
        <Avatar url={item.otherUser.avatarUrl} size={48} />
        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }} numberOfLines={1}>
              {item.otherUser.username}
            </Text>
            {item.lastMessage && (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            )}
          </View>
          <View className="flex-row items-center mt-1">
            <Text
              style={{
                color: item.unreadCount > 0 ? colors.text : colors.textMuted,
                fontSize: 14,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {item.lastMessage?.isDeleted
                ? t("messages.messageDeleted")
                : isLastFromMe
                  ? `You: ${item.lastMessage?.content}`
                  : item.lastMessage?.content ?? t("messages.noMessages")}
            </Text>
            {item.unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 6,
                  justifyContent: "center",
                  alignItems: "center",
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: colors.background, fontSize: 11, fontWeight: "700" }}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
            {item.muted && (
              <Ionicons name="volume-mute" size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("messages.title")} />
      <SubScreenHeader title={t("messages.title")} />
      <View className="flex-row items-center justify-between py-3" style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>{t("messages.title")}</Text>
        <View className="flex-row items-center">
          {unreadData && unreadData.unreadCount > 0 && (
            <TouchableOpacity onPress={() => {}} className="mr-3">
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>
                {t("messages.markAllRead")}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowNewConversation(true)}
            className="flex-row items-center rounded-lg px-3 py-1.5"
            style={{ backgroundColor: colors.primary }}
          >
            <Ionicons name="create-outline" size={16} color={colors.background} />
            <Text style={{ color: colors.background, fontSize: 14, fontWeight: "600", marginLeft: 4 }}>
              {t("messages.newConversation")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View className="items-center justify-center flex-1 px-8" style={{ paddingTop: 120 }}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: "600", marginTop: 16 }}>
              {t("messages.noConversations")}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 4, textAlign: "center" }}>
              {t("messages.noConversationsDesc")}
            </Text>
            <TouchableOpacity
              onPress={() => setShowNewConversation(true)}
              className="flex-row items-center rounded-lg px-4 py-2.5 mt-6"
              style={{ backgroundColor: colors.primary }}
            >
              <Ionicons name="create-outline" size={18} color={colors.background} />
              <Text style={{ color: colors.background, fontSize: 15, fontWeight: "600", marginLeft: 6 }}>
                {t("messages.startConversation")}
              </Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={conversations.length === 0 ? { flex: 1 } : undefined}
      />
      <NewConversationSheet visible={showNewConversation} onClose={() => setShowNewConversation(false)} />
    </ScreenContainer>
  );
}
