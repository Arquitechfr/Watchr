import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadAvatar } from "../services/auth.service";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";

export function useAvatarUpload() {
  const { t } = useI18n();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();

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

  return {
    pickAvatar,
    isUploading: avatarMutation.isPending,
  };
}
