import React, { useState, useMemo, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { useDmContacts, useCreateConversation } from "../hooks/useMessages";
import { Avatar } from "./Avatar";
import type { DmContact } from "../services/message.service";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface NewConversationSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function NewConversationSheet({ visible, onClose }: NewConversationSheetProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavProp>();
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useDmContacts();
  const createConversation = useCreateConversation();
  const [searchQuery, setSearchQuery] = useState("");

  const contacts = useMemo(() => {
    if (!data?.pages) return [];
    const all = data.pages.flatMap((p) => p.contacts);
    if (!searchQuery.trim()) return all;
    return all.filter((c) =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [data, searchQuery]);

  const handleSelectContact = useCallback(
    (contact: DmContact) => {
      createConversation.mutate(contact.id, {
        onSuccess: (result) => {
          onClose();
          navigation.navigate("Chat", {
            conversationId: result.id,
            otherUsername: contact.username,
            otherUserAvatarUrl: contact.avatarUrl,
          });
        },
      });
    },
    [createConversation, navigation, onClose],
  );

  function renderItem({ item }: { item: DmContact }) {
    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}
        onPress={() => handleSelectContact(item)}
        disabled={createConversation.isPending}
      >
        <Avatar url={item.avatarUrl} size={44} />
        <View className="flex-1 ml-3">
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }} numberOfLines={1}>
            {item.username}
          </Text>
          {item.isMutual && (
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {t("messages.mutualFriend")}
            </Text>
          )}
        </View>
        <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "80%",
            paddingBottom: 20,
          }}
        >
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
              {t("messages.startConversation")}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View className="px-4 pb-3">
            <View
              className="flex-row items-center rounded-lg px-3"
              style={{ backgroundColor: colors.surface, height: 40 }}
            >
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                className="flex-1 ml-2"
                style={{ color: colors.text, fontSize: 15 }}
                placeholder={t("messages.searchContacts")}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : contacts.length === 0 ? (
            <View className="items-center justify-center px-8 py-12">
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: "600", marginTop: 12 }}>
                {t("messages.noContacts")}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 4, textAlign: "center" }}>
                {t("messages.noContactsDesc")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              style={{ flex: 1 }}
              onEndReached={() => hasNextPage && fetchNextPage()}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View className="py-3">
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
            />
          )}

          {createConversation.isPending && (
            <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
