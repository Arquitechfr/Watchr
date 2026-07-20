import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { ScreenContainer } from "../components/ScreenContainer";
import {
  useMessages,
  useSendMessage,
  useDeleteMessage,
  useMarkAsRead,
  useReportMessage,
} from "../hooks/useMessages";
import { useMessageStore } from "../store/messageStore";
import { useAuthStore } from "../store/authStore";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { MessageItem } from "../services/message.service";

type ChatRouteProp = RouteProp<RootStackParamList, "Chat">;

export function ChatScreen() {
  const route = useRoute<ChatRouteProp>();
  const { conversationId, otherUsername } = route.params;
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useSharedValue(0);
  const [inputText, setInputText] = useState("");
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

  const { data, isLoading } = useMessages(conversationId);
  const sendMutation = useSendMessage(conversationId);
  const deleteMutation = useDeleteMessage(conversationId);
  const markReadMutation = useMarkAsRead(conversationId);
  const reportMutation = useReportMessage();

  const setActiveConversation = useMessageStore((s) => s.setActiveConversation);

  useEffect(() => {
    setActiveConversation(conversationId);
    markReadMutation.mutate();
    return () => setActiveConversation(null);
  }, [conversationId]);

  const messages = useMemo(() => {
    if (!data?.pages) return [];
    const allMessages = data.pages.flatMap((p) => p.messages);
    return allMessages;
  }, [data]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    sendMutation.mutate({ content: inputText.trim() });
    setInputText("");
  }, [inputText, sendMutation]);

  function handleDelete(messageId: string) {
    Alert.alert(t("messages.deleteConfirm"), t("messages.deleteConfirmDesc"), [
      { text: t("messages.cancel"), style: "cancel" },
      {
        text: t("messages.confirm"),
        style: "destructive",
        onPress: () => deleteMutation.mutate(messageId),
      },
    ]);
  }

  function handleReport(messageId: string) {
    Alert.alert(
      t("messages.report"),
      t("messages.reportReason"),
      [
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
    );
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
        <View
          className="rounded-2xl px-4 py-2 max-w-[75%]"
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
              <Text
                style={{
                  color: isOwnMessage ? colors.background : colors.text,
                  fontSize: 15,
                }}
              >
                {item.content}
              </Text>
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
                <View className="flex-row mt-1">
                  {item.reactions.map((r, i) => (
                    <Text key={i} style={{ fontSize: 16, marginRight: 4 }}>
                      {r.emoji}
                    </Text>
                  ))}
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
        {isOwnMessage && !item.isDeleted && !item.isSystemMessage && (
          <TouchableOpacity
            className="items-center justify-center ml-1"
            style={{ padding: 4 }}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        {!isOwnMessage && !item.isDeleted && !item.isSystemMessage && (
          <TouchableOpacity
            className="items-center justify-center ml-1"
            style={{ padding: 4 }}
            onPress={() => handleReport(item.id)}
          >
            <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} fullWidth>
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Text className="text-text font-bold text-lg flex-1" numberOfLines={1}>
            {otherUsername}
          </Text>
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
          ListEmptyComponent={
            !isLoading ? (
              <View className="items-center justify-center flex-1" style={{ paddingTop: 120 }}>
                <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 12 }}>
                  {t("messages.noMessages")}
                </Text>
              </View>
            ) : null
          }
        />
      </View>
      <View
        className="flex-row items-center px-3 py-2 border-t border-border"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        <TextInput
          className="flex-1 rounded-full px-4 py-2"
          style={{
            backgroundColor: colors.surface,
            color: colors.text,
            fontSize: 15,
            maxHeight: 100,
          }}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t("messages.typeMessage")}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          className="items-center justify-center rounded-full ml-2"
          style={{
            width: 40,
            height: 40,
            backgroundColor: inputText.trim() ? colors.primary : colors.surface,
          }}
          onPress={handleSend}
          disabled={!inputText.trim() || sendMutation.isPending}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim() ? colors.background : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
      {Platform.OS !== "web" && <Animated.View style={spacerStyle} pointerEvents="none" />}
    </ScreenContainer>
  );
}
