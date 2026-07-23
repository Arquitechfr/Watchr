import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Platform,
  ActivityIndicator,
} from "react-native";
import { CachedImage as Image } from "../components/CachedImage";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/core";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { ScreenContainer } from "../components/ScreenContainer";
import { Seo } from "../components/Seo";
import { Avatar } from "../components/Avatar";
import { MessageInput } from "../components/MessageInput";
import {
  useMessages,
  useSendMessage,
  useDeleteMessage,
  useMarkAsRead,
  useReportMessage,
  useAddReaction,
  useRemoveReaction,
} from "../hooks/useMessages";
import { useMessageStore, isUserTypingIn, isUserOnline } from "../store/messageStore";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { MessageItem, MessageAttachment } from "../services/message.service";

type ChatRouteProp = RouteProp<RootStackParamList, "Chat">;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function ChatScreen() {
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { conversationId, otherUsername, otherUserAvatarUrl } = route.params;
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useSharedValue(0);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const currentUserId = useAuthStore((s) => s.userId);

  useKeyboardHandler(
    {
      onMove: (event) => {
        "worklet";
        keyboardHeight.value = Math.max(event.height, 0);
      },
      onEnd: (event) => {
        "worklet";
        keyboardHeight.value = Math.max(event.height, 0);
      },
    },
    [],
  );

  const spacerStyle = useAnimatedStyle(() => ({
    height: keyboardHeight.value,
  }));

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(conversationId);
  const sendMutation = useSendMessage(conversationId);
  const deleteMutation = useDeleteMessage(conversationId);
  const markReadMutation = useMarkAsRead(conversationId);
  const reportMutation = useReportMessage();
  const addReactionMutation = useAddReaction(conversationId);
  const removeReactionMutation = useRemoveReaction(conversationId);

  const setActiveConversation = useMessageStore((s) => s.setActiveConversation);

  useEffect(() => {
    setActiveConversation(conversationId);
    markReadMutation.mutate();
    return () => setActiveConversation(null);
  }, [conversationId]);

  const messages = useMemo(() => {
    if (!data?.pages) return [];
    const allMessages = data.pages.flatMap((p) => p.messages);
    const seen = new Set<string>();
    return allMessages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [data]);

  const otherUserId = useMemo(() => {
    const msg = messages.find((m) => m.senderId !== currentUserId);
    return msg?.senderId ?? "";
  }, [messages, currentUserId]);

  const isTyping = useMessageStore((s) => isUserTypingIn(conversationId, otherUserId, s));
  const isOnline = useMessageStore((s) => isUserOnline(otherUserId, s));

  const handleSend = useCallback(
    (content: string, attachments?: MessageAttachment[]) => {
      if (!content && (!attachments || attachments.length === 0)) return;
      sendMutation.mutate({ content, attachments });
    },
    [sendMutation],
  );

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      const msg = messages.find((m) => m.id === messageId);
      const hasReaction = msg?.reactions.some(
        (r) => r.userId === currentUserId && r.emoji === emoji,
      );
      if (hasReaction) {
        removeReactionMutation.mutate({ messageId, emoji });
      } else {
        addReactionMutation.mutate({ messageId, emoji });
      }
      setSelectedReaction(null);
    },
    [messages, currentUserId, addReactionMutation, removeReactionMutation],
  );

  const showAlert = useUIStore((s) => s.showAlert);

  function handleDelete(messageId: string) {
    showAlert({
      title: t("messages.deleteConfirm"),
      message: t("messages.deleteConfirmDesc"),
      buttons: [
        { text: t("messages.cancel"), style: "cancel" },
        {
          text: t("messages.confirm"),
          style: "destructive",
          onPress: () => deleteMutation.mutate(messageId),
        },
      ],
    });
  }

  function handleReport(messageId: string) {
    showAlert({
      title: t("messages.report"),
      message: t("messages.reportReason"),
      buttons: [
        { text: t("messages.cancel"), style: "cancel" },
        {
          text: t("messages.reportSpam"),
          onPress: () => reportMutation.mutate({ messageId, reason: "spam" }),
        },
        {
          text: t("messages.reportHarassment"),
          onPress: () => reportMutation.mutate({ messageId, reason: "harassment" }),
        },
        {
          text: t("messages.reportInappropriate"),
          onPress: () => reportMutation.mutate({ messageId, reason: "inappropriate" }),
        },
      ],
    });
  }

  const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢"];

  function renderAttachment(att: MessageAttachment, _isOwnMessage: boolean) {
    if (att.type === "image" && att.imageUrl) {
      return (
        <Image
          source={{ uri: att.imageUrl }}
          style={{ width: 200, height: 200, borderRadius: 12, marginTop: 4 }}
        />
      );
    }
    return null;
  }

  function renderMessage({ item }: { item: MessageItem }) {
    const isOwnMessage = item.senderId === currentUserId;

    if (item.isSystemMessage) {
      return (
        <View className="items-center my-2 px-4">
          <View className="rounded-lg px-4 py-2" style={{ backgroundColor: colors.surface }}>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>
              {item.content}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View className={`flex-row ${isOwnMessage ? "justify-end" : "justify-start"} px-4 my-1`}>
        <View className="max-w-[75%]">
          <View
            className="rounded-2xl px-4 py-2"
            style={{
              backgroundColor: isOwnMessage ? colors.primary : colors.surface,
            }}
          >
            {item.isDeleted ? (
              <Text style={{ color: colors.textMuted, fontSize: 14, fontStyle: "italic" }}>
                {t("messages.messageDeleted")}
              </Text>
            ) : (
              <>
                {item.content ? (
                  <Text
                    style={{
                      color: isOwnMessage ? colors.background : colors.text,
                      fontSize: 15,
                    }}
                  >
                    {item.content}
                  </Text>
                ) : null}
                {item.attachments.length > 0 && (
                  <View className="mt-1">
                    {item.attachments.map((att, i) => (
                      <View key={i}>{renderAttachment(att, isOwnMessage)}</View>
                    ))}
                  </View>
                )}
                {item.isTranslated && item.translatedContent && (
                  <Text
                    style={{
                      color: isOwnMessage ? "rgba(255,255,255,0.7)" : colors.textMuted,
                      fontSize: 13,
                      marginTop: 4,
                      fontStyle: "italic",
                    }}
                  >
                    {item.translatedContent}
                  </Text>
                )}
                {item.reactions.length > 0 && (
                  <View className="flex-row flex-wrap mt-1">
                    {Object.entries(
                      item.reactions.reduce<Record<string, number>>((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                        return acc;
                      }, {}),
                    ).map(([emoji, count]) => {
                      const hasReacted = item.reactions.some(
                        (r) => r.userId === currentUserId && r.emoji === emoji,
                      );
                      return (
                        <TouchableOpacity
                          key={emoji}
                          onPress={() => handleToggleReaction(item.id, emoji)}
                          className="flex-row items-center rounded-full px-2 py-0.5 mr-1 mb-1"
                          style={{
                            backgroundColor: hasReacted
                              ? isOwnMessage
                                ? "rgba(255,255,255,0.2)"
                                : colors.primary + "30"
                              : isOwnMessage
                                ? "rgba(255,255,255,0.1)"
                                : colors.surfaceLight,
                          }}
                        >
                          <Text style={{ fontSize: 14 }}>{emoji}</Text>
                          {count > 1 && (
                            <Text
                              style={{
                                fontSize: 11,
                                marginLeft: 3,
                                color: isOwnMessage ? colors.background : colors.textMuted,
                              }}
                            >
                              {count}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}
            <View className="flex-row items-center mt-1">
              {item.editedAt && !item.isDeleted && (
                <Text
                  style={{
                    color: isOwnMessage ? "rgba(255,255,255,0.5)" : colors.textMuted,
                    fontSize: 11,
                    marginRight: 4,
                  }}
                >
                  {t("messages.messageEdited")}
                </Text>
              )}
              <Text
                style={{
                  color: isOwnMessage ? "rgba(255,255,255,0.5)" : colors.textMuted,
                  fontSize: 11,
                }}
              >
                {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>

          {!item.isDeleted && !item.isSystemMessage && (
            <View className="flex-row items-center mt-0.5">
              <TouchableOpacity
                onPress={() =>
                  setSelectedReaction(selectedReaction === item.id ? null : item.id)
                }
                className="items-center justify-center mr-1"
                style={{ padding: 4 }}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
              {selectedReaction === item.id && (
                <View className="flex-row items-center rounded-full px-2 py-1" style={{ backgroundColor: colors.surface }}>
                  {REACTION_EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => handleToggleReaction(item.id, emoji)}
                      className="px-1"
                    >
                      <Text style={{ fontSize: 18 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {isOwnMessage && (
                <TouchableOpacity
                  className="items-center justify-center ml-1"
                  style={{ padding: 4 }}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              {!isOwnMessage && (
                <TouchableOpacity
                  className="items-center justify-center ml-1"
                  style={{ padding: 4 }}
                  onPress={() => handleReport(item.id)}
                >
                  <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} fullWidth>
        <Seo title={otherUsername} />
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.navigate("PublicProfile", { username: otherUsername })} activeOpacity={0.7}>
            <Avatar url={otherUserAvatarUrl} size={36} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("PublicProfile", { username: otherUsername })} activeOpacity={0.7} className="flex-1 ml-3">
            <Text className="text-text font-bold text-lg" numberOfLines={1}>
              {otherUsername}
            </Text>
            <Text className="text-textMuted text-xs" numberOfLines={1}>
              {isTyping
                ? t("messages.typing")
                : isOnline
                  ? t("messages.online")
                  : ""}
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1">
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ paddingVertical: 8 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            isLoading ? (
              <View className="items-center justify-center flex-1" style={{ paddingTop: 120 }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <View className="items-center justify-center flex-1" style={{ paddingTop: 120 }}>
                <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 12 }}>
                  {t("messages.noMessages")}
                </Text>
              </View>
            )
          }
        />
      </View>
      <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <MessageInput onSend={handleSend} isPending={sendMutation.isPending} />
      </View>
      {Platform.OS !== "web" && <Animated.View style={spacerStyle} pointerEvents="none" />}
    </ScreenContainer>
  );
}
