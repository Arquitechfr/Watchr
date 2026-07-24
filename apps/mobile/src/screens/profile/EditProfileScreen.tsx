import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { Avatar } from "../../components/Avatar";
import { CoverBanner } from "../../components/Profile/CoverBanner";
import { getMe, updateUsername, updateProfile, unlinkGoogleAccount } from "../../services/auth.service";
import { useGoogleLink } from "../../services/googleAuth.service";
import { useI18n } from "../../i18n/useI18n";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { useThemeColors } from "../../theme/useThemeColors";
import { useAvatarUpload } from "../../hooks/useAvatarUpload";
import { useBannerUpload } from "../../hooks/useBannerUpload";
import { useFadeIn } from "../../hooks/useFadeIn";
import Animated from "react-native-reanimated";
import { Seo } from "../../components/Seo";
import { VipBadge } from "../../components/VipBadge";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/RootNavigator";

export function EditProfileScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { showSnackbar, showAlert } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [genresInput, setGenresInput] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);

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
    showAlert({
      title: t("screens.profile.googleUnlinkConfirmTitle"),
      message: t("screens.profile.googleUnlinkConfirmMessage"),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: () => unlinkGoogleMutation.mutate(),
        },
      ],
    });
  }

  const { pickAvatar, isUploading: isAvatarUploading } = useAvatarUpload();
  const { pickBanner, isUploading: isBannerUploading } = useBannerUpload();

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

  const profileMutation = useMutation({
    mutationFn: (updates: { bio?: string; favoriteGenres?: string[] }) => updateProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setIsEditingBio(false);
      showSnackbar(t("screens.profile.profileUpdated"), "success");
    },
    onError: (error) => {
      showSnackbar(getErrorMessage(error), "error");
    },
  });

  function submitBio() {
    const trimmedBio = bioInput.trim();
    const genres = genresInput
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0)
      .slice(0, 10);
    profileMutation.mutate({ bio: trimmedBio, favoriteGenres: genres });
  }

  function startEditingBio() {
    setBioInput(me?.bio ?? "");
    setGenresInput((me?.favoriteGenres ?? []).join(", "));
    setIsEditingBio(true);
  }

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isVip = me?.subscriptionPlan === "vip";
  const { containerAnimatedStyle } = useFadeIn();

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.editProfile")} />
      <SubScreenHeader title={t("screens.profile.editProfile")} />
      <Animated.View className="flex-1 md:max-w-lg md:mx-auto w-full" style={containerAnimatedStyle}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8" keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <View style={{ marginBottom: 8 }}>
        <CoverBanner url={me?.bannerUrl} onPress={pickBanner} isUploading={isBannerUploading} />
      </View>
      <View className="items-center mb-8">
        <TouchableOpacity onPress={pickAvatar} disabled={isAvatarUploading} activeOpacity={0.8}>
          <View style={{ width: 96, height: 96 }}>
            <Avatar url={me?.avatarUrl} size={96} />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isAvatarUploading ? (
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
            {isVip && <VipBadge />}
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
        <Text className="text-text-muted text-sm mb-2">{t("screens.profile.subscription")}</Text>
        <View className="flex-row items-center gap-2">
          {isVip ? (
            <>
              <VipBadge />
              <Text className="text-text-muted text-sm flex-1">{t("screens.subscription.activeMessage")}</Text>
            </>
          ) : (
            <>
              <Text className="text-text-muted text-sm flex-1">{t("screens.subscription.apiPlanFree")}</Text>
              <TouchableOpacity onPress={() => navigation.navigate("ProfileSubscription" as never)}>
                <Text className="text-primary text-sm">{t("screens.profile.upgradeVip")}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-text-muted text-sm">{t("screens.profile.bio")}</Text>
          {!isEditingBio && (
            <TouchableOpacity onPress={startEditingBio}>
              <Text className="text-primary text-sm">{t("screens.profile.editBio")}</Text>
            </TouchableOpacity>
          )}
        </View>
        {isEditingBio ? (
          <View>
            <TextInput
              value={bioInput}
              onChangeText={setBioInput}
              placeholder={t("screens.profile.bioPlaceholder")}
              placeholderTextColor={colors.textMuted}
              maxLength={500}
              multiline
              className="text-text text-base border border-border rounded-lg p-3 mb-3"
              style={{ minHeight: 80 }}
              autoFocus
            />
            <Text className="text-text-muted text-xs mb-3">{bioInput.length}/500</Text>
            <Text className="text-text-muted text-sm mb-2">{t("screens.profile.favoriteGenres")}</Text>
            <TextInput
              value={genresInput}
              onChangeText={setGenresInput}
              placeholder={t("screens.profile.genresPlaceholder")}
              placeholderTextColor={colors.textMuted}
              className="text-text text-base border border-border rounded-lg p-3 mb-3"
            />
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={submitBio}
                disabled={profileMutation.isPending}
                className="px-4 py-2 rounded-md"
                style={{ backgroundColor: colors.primary }}
              >
                {profileMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text className="text-background font-semibold">{t("common.save")}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsEditingBio(false)}>
                <Text className="text-text-muted">{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            {me?.bio ? (
              <Text className="text-text text-base leading-relaxed mb-3">{me.bio}</Text>
            ) : (
              <Text className="text-text-muted text-sm mb-3 italic">{t("screens.profile.noBio")}</Text>
            )}
            {me?.favoriteGenres && me.favoriteGenres.length > 0 && (
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {me.favoriteGenres.map((genre: string) => (
                  <View
                    key={genre}
                    className="flex-row items-center rounded-full px-3 py-1.5"
                    style={{ backgroundColor: colors.primary + "15" }}
                  >
                    <Ionicons name="pricetag" size={12} color={colors.primary} />
                    <Text className="text-primary text-xs font-medium ml-1.5">{genre}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
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
      </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}
