import React, { useMemo, useState, useCallback, useRef } from "react";
import { FlatList, View, Text, TouchableOpacity, RefreshControl, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Swipeable } from "react-native-gesture-handler";
import type { Swipeable as SwipeableRef } from "react-native-gesture-handler";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import {
  useConversations,
  useUnreadCount,
  useArchiveConversation,
  useDeleteConversation,
} from "../hooks/useMessages";
import { markAsRead } from "../services/message.service";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { ScreenContainer } from "../components/ScreenContainer";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { Seo } from "../components/Seo";
import { Avatar } from "../components/Avatar";
import { NewConversationSheet } from "../components/NewConversationSheet";
import { ConversationActionSheet } from "../components/ConversationActionSheet";
import type { ConversationItem } from "../services/message.service";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function ConversationRow({
  item,
  currentUserId,
  onOpenChat,
  onLongPress,
  onSwipeOpen,
}: {
  item: ConversationItem;
  currentUserId: string;
  onOpenChat: () => void;
  onLongPress: () => void;
  onSwipeOpen: (swipeable: SwipeableRef) => void;
}) {
  const swipeRef = useRef<SwipeableRef | null>(null);
  const { t } = useI18n();
  const colors = useThemeColors();
  const archiveMutation = useArchiveConversation();
  const deleteMutation = useDeleteConversation();

  const isLastFromMe = item.lastMessage?.senderId === currentUserId;

  const handleArchiveSwipe = () => {
    swipeRef.current?.close();
    archiveMutation.mutate({ conversationId: item.id, archived: !item.archived });
  };

  const handleDeleteSwipe = () => {
    swipeRef.current?.close();
    const confirmDelete = () => {
      deleteMutation.mutate(item.id);
    };

    if (Platform.OS === "web") {
      if (window.confirm(t("messages.deleteConversationConfirmDesc"))) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        t("messages.deleteConversationConfirm"),
        t("messages.deleteConversationConfirmDesc"),
        [
          { text: t("messages.cancel"), style: "cancel" },
          { text: t("messages.delete"), style: "destructive", onPress: confirmDelete },
        ],
      );
    }
  };

  const renderLeftActions = () => (
    <TouchableOpacity
      onPress={handleArchiveSwipe}
      style={{
        backgroundColor: item.archived ? colors.surface : "#3B82F6",
        width: 80,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Ionicons
        name={(item.archived ? "folder-open-outline" : "archive-outline") as keyof typeof Ionicons.glyphMap}
        size={24}
        color={item.archived ? colors.text : "#FFFFFF"}
      />
      <Text
        style={{
          color: item.archived ? colors.text : "#FFFFFF",
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        }}
      >
        {item.archived ? t("messages.unarchive") : t("messages.archive")}
      </Text>
    </TouchableOpacity>
  );

  const renderRightActions = () => (
    <TouchableOpacity
      onPress={handleDeleteSwipe}
      style={{
        backgroundColor: "#EF4444",
        width: 80,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
      <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "600", marginTop: 4 }}>
        {t("messages.delete")}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(_direction, swipeable) => onSwipeOpen(swipeable)}
      overshootLeft={false}
      overshootRight={false}
    >
      <TouchableOpacity
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}
        onPress={onOpenChat}
        onLongPress={onLongPress}
        delayLongPress={400}
      >
        <Avatar url={item.otherUser.avatarUrl} size={48} />
        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }} numberOfLines={1}>
              {item.otherUser.username}
            </Text>
            {item.lastMessage && (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {new Date(item.lastMessage.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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
                  ? t("messages.lastMessageFromYou", { content: item.lastMessage?.content })
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
    </Swipeable>
  );
}

export function ConversationListScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavProp>();
  const currentUserId = useAuthStore((s) => s.userId);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [actionSheetConversation, setActionSheetConversation] = useState<ConversationItem | null>(null);
  const openSwipeRef = useRef<SwipeableRef | null>(null);

  const { data, refetch, isRefetching } = useConversations();
  const { data: unreadData } = useUnreadCount();
  const queryClient = useQueryClient();

  const conversations = useMemo(() => {
    if (!data?.pages) return [];
    const all = data.pages.flatMap((p) => p.conversations);
    const seen = new Set<string>();
    return all.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [data]);

  const handleMarkAllRead = useCallback(() => {
    const unread = conversations.filter((c) => c.unreadCount > 0);
    Promise.all(unread.map((c) => markAsRead(c.id)))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      })
      .catch(() => {});
  }, [conversations, queryClient]);

  const handleSwipeOpen = useCallback((swipeable: SwipeableRef) => {
    if (openSwipeRef.current && openSwipeRef.current !== swipeable) {
      openSwipeRef.current.close();
    }
    openSwipeRef.current = swipeable;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ConversationItem }) => {
      return (
        <ConversationRow
          item={item}
          currentUserId={currentUserId ?? ""}
          onOpenChat={() =>
            navigation.navigate("Chat", {
              conversationId: item.id,
              otherUsername: item.otherUser.username,
              otherUserAvatarUrl: item.otherUser.avatarUrl,
            })
          }
          onLongPress={() => setActionSheetConversation(item)}
          onSwipeOpen={handleSwipeOpen}
        />
      );
    },
    [currentUserId, navigation, handleSwipeOpen],
  );

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("messages.title")} />
      <SubScreenHeader title={t("messages.title")} />
      <View
        className="flex-row items-center justify-end py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}
      >
        <View className="flex-row items-center">
          {unreadData && unreadData.unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              className="mr-3"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="checkmark-done-outline" size={22} color={colors.primary} />
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
      <ConversationActionSheet
        visible={!!actionSheetConversation}
        conversation={actionSheetConversation}
        onClose={() => setActionSheetConversation(null)}
      />
    </ScreenContainer>
  );
}
