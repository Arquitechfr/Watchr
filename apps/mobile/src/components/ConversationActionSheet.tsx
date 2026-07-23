import React from "react";
import { Modal, View, Text, TouchableOpacity, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { useArchiveConversation, useMuteConversation, useDeleteConversation } from "../hooks/useMessages";
import { markAsRead } from "../services/message.service";
import { useQueryClient } from "@tanstack/react-query";
import type { ConversationItem } from "../services/message.service";

interface ConversationActionSheetProps {
  visible: boolean;
  conversation: ConversationItem | null;
  onClose: () => void;
}

export function ConversationActionSheet({ visible, conversation, onClose }: ConversationActionSheetProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const archiveMutation = useArchiveConversation();
  const muteMutation = useMuteConversation();
  const deleteMutation = useDeleteConversation();
  const queryClient = useQueryClient();

  if (!conversation) return null;

  const handleArchive = () => {
    archiveMutation.mutate(
      { conversationId: conversation.id, archived: !conversation.archived },
      { onSuccess: () => onClose() },
    );
  };

  const handleMute = () => {
    muteMutation.mutate(
      { conversationId: conversation.id, muted: !conversation.muted },
      { onSuccess: () => onClose() },
    );
  };

  const handleMarkAsRead = () => {
    markAsRead(conversation.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["unread-count"] });
        onClose();
      })
      .catch(() => {});
  };

  const handleDelete = () => {
    const confirmDelete = () => {
      deleteMutation.mutate(conversation.id, { onSuccess: () => onClose() });
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

  const actions = [
    {
      icon: conversation.archived ? "folder-open-outline" : "archive-outline",
      label: conversation.archived ? t("messages.unarchive") : t("messages.archive"),
      color: colors.text,
      onPress: handleArchive,
      pending: archiveMutation.isPending,
    },
    {
      icon: conversation.muted ? "volume-high-outline" : "volume-mute-outline",
      label: conversation.muted ? t("messages.unmute") : t("messages.mute"),
      color: colors.text,
      onPress: handleMute,
      pending: muteMutation.isPending,
    },
    ...(conversation.unreadCount > 0
      ? [
          {
            icon: "checkmark-done-outline" as const,
            label: t("messages.markAsRead"),
            color: colors.primary,
            onPress: handleMarkAsRead,
            pending: false,
          },
        ]
      : []),
    {
      icon: "trash-outline",
      label: t("messages.delete"),
      color: "#EF4444",
      onPress: handleDelete,
      pending: deleteMutation.isPending,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View className="items-center pt-3 pb-2">
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <Text
            style={{ color: colors.text, fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 8 }}
            numberOfLines={1}
          >
            {conversation.otherUser.username}
          </Text>

          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              className="flex-row items-center px-5 py-3.5"
              onPress={action.onPress}
              disabled={action.pending}
            >
              <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={22} color={action.color} />
              <Text style={{ color: action.color, fontSize: 16, fontWeight: "500", marginLeft: 14 }}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}
