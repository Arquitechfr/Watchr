import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadBanner } from "../services/auth.service";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";

export function useBannerUpload() {
  const { t } = useI18n();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();

  const bannerMutation = useMutation({
    mutationFn: (file: { uri: string; type: string; name: string }) => uploadBanner(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      showSnackbar(t("screens.profile.bannerUpdated"), "success");
    },
    onError: (error) => {
      showSnackbar(getErrorMessage(error), "error");
    },
  });

  async function pickBanner() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const file = {
      uri: asset.uri,
      type: asset.mimeType ?? "image/jpeg",
      name: `banner.${(asset.mimeType ?? "image/jpeg").split("/")[1]}`,
    };
    bannerMutation.mutate(file);
  }

  return {
    pickBanner,
    isUploading: bannerMutation.isPending,
  };
}
