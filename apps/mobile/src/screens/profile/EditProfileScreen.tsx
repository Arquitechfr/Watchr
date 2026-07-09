import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Avatar } from "../../components/Avatar";
import { getMe, uploadAvatar, updateUsername, unlinkGoogleAccount } from "../../services/auth.service";
import { useGoogleLink } from "../../services/googleAuth.service";
import { useI18n } from "../../i18n/useI18n";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { useThemeColors } from "../../theme/useThemeColors";

export function EditProfileScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

  const unlinkGoogleMutation = useMutation({
    mutationFn: () => unlinkGoogleAccount(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      showSnackbar(t("screens.profile.googleUnlinkSuccess"), "success");
    },
    onError: (error) => {
      showSnackbar(getErrorMessage(error), "error");
    },
  });

  const handleGoogleLinkSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["me"] });
    showSnackbar(t("screens.profile.googleLinkSuccess"), "success");
  };

  const handleGoogleLinkError = (error: Error) => {
    showSnackbar(getErrorMessage(error) ?? error.message, "error");
  };

  const { prompt: promptGoogleLink, isLoading: isLinkingGoogle } = useGoogleLink(
    handleGoogleLinkSuccess,
    handleGoogleLinkError,
  );

  function handleUnlinkGoogle() {
    Alert.alert(
      t("screens.profile.googleUnlinkConfirmTitle"),
      t("screens.profile.googleUnlinkConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: () => unlinkGoogleMutation.mutate(),
        },
      ],
    );
  }

  const avatarMutation = useMutation({
    mutationFn: (file: { uri: string; type: string; name: string }) => uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      showSnackbar(t("screens.profile.avatarUpdated"), "success");
    },
    onError: (error) => {
      showSnackbar(getErrorMessage(error), "error");
    },
  });

  const usernameMutation = useMutation({
    mutationFn: (username: string) => updateUsername(username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setEditingUsername(false);
      showSnackbar(t("screens.profile.usernameUpdated"), "success");
    },
    onError: (error) => {
      showSnackbar(getErrorMessage(error), "error");
    },
  });

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const file = {
      uri: asset.uri,
      type: asset.mimeType ?? "image/jpeg",
      name: `avatar.${(asset.mimeType ?? "image/jpeg").split("/")[1]}`,
    };
    avatarMutation.mutate(file);
  }

  function submitUsername() {
    const trimmed = usernameInput.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      showSnackbar(t("screens.profile.usernameInvalid"), "error");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      showSnackbar(t("screens.profile.usernameInvalid"), "error");
      return;
    }
    usernameMutation.mutate(trimmed);
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <View style={Platform.OS === "web" ? { maxWidth: 600, alignSelf: "center", width: "100%" } : undefined}>
      <View className="items-center mb-8">
        <TouchableOpacity onPress={pickAvatar} disabled={avatarMutation.isPending} activeOpacity={0.8}>
          <View className="relative">
            <Avatar url={me?.avatarUrl} size={96} />
            <View
              className="absolute bottom-0 right-0 items-center justify-center rounded-full"
              style={{ width: 32, height: 32, backgroundColor: colors.primary }}
            >
              {avatarMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Ionicons name="camera" size={18} color={colors.background} />
              )}
            </View>
          </View>
        </TouchableOpacity>
        <Text className="text-text-muted text-sm mt-3">{t("screens.profile.changeAvatar")}</Text>
      </View>

      <View className="mb-6">
        <Text className="text-text-muted text-sm mb-2">{t("screens.profile.username")}</Text>
        {me?.usernameChanged ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-text text-base flex-1">{me?.username}</Text>
            <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
            <Text className="text-text-muted text-xs">{t("screens.profile.usernameLocked")}</Text>
          </View>
        ) : editingUsername ? (
          <View className="flex-row items-center gap-2">
            <TextInput
              value={usernameInput}
              onChangeText={setUsernameInput}
              placeholder={me?.username}
              placeholderTextColor={colors.textMuted}
              maxLength={20}
              className="text-text text-base flex-1 border-b border-border pb-1"
              autoFocus
            />
            <TouchableOpacity
              onPress={submitUsername}
              disabled={usernameMutation.isPending}
              className="px-3 py-1 rounded-md"
              style={{ backgroundColor: colors.primary }}
            >
              {usernameMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text className="text-background font-semibold">{t("common.save")}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingUsername(false)}>
              <Text className="text-text-muted">{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            <Text className="text-text text-base flex-1">{me?.username}</Text>
            <TouchableOpacity onPress={() => { setUsernameInput(me?.username ?? ""); setEditingUsername(true); }}>
              <Text className="text-primary text-sm">{t("screens.profile.changeUsername")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="mb-6">
        <Text className="text-text-muted text-sm mb-2">{t("screens.profile.email")}</Text>
        <Text className="text-text text-base">{me?.email}</Text>
      </View>

      <View className="mb-6">
        <Text className="text-text-muted text-sm mb-2">{t("screens.profile.googleAccount")}</Text>
        {me?.googleLinked ? (
          <View className="flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text className="text-text text-base flex-1">{t("screens.profile.googleLinked")}</Text>
            <TouchableOpacity
              onPress={handleUnlinkGoogle}
              disabled={unlinkGoogleMutation.isPending}
            >
              {unlinkGoogleMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Text className="text-danger text-sm">{t("screens.profile.unlinkGoogle")}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            className="flex-row items-center rounded-lg p-3 mt-1"
            style={{ backgroundColor: colors.surface }}
            onPress={promptGoogleLink}
            disabled={isLinkingGoogle}
            activeOpacity={0.7}
          >
            {isLinkingGoogle ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.primary} />
                <Text className="text-text text-base ml-3">{t("screens.profile.linkGoogle")}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      </View>
    </ScreenContainer>
  );
}
