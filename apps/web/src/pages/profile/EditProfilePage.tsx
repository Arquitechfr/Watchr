import { useState, useRef } from "react";
import { Camera, Check, Link2, Unlink, Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper";
import { DetailHeader } from "../../components/DetailHeader";
import { Avatar } from "../../components/Avatar";
import { getMe, uploadAvatar, updateUsername, unlinkGoogleAccount } from "../../services/auth.service";
import { useGoogleLink } from "../../services/googleAuth.service";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { useI18n } from "../../i18n/useI18n";

export function EditProfilePage() {
  const { t } = useI18n();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

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

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    avatarMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    <PageWrapper maxWidth="max-w-2xl">
      <DetailHeader title={t("screens.profile.editProfile")} />

      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarMutation.isPending}
            className="relative"
          >
            <Avatar url={me?.avatarUrl} username={me?.username || "User"} size={96} />
            <div className="absolute bottom-0 right-0 bg-primary text-background rounded-full p-2 shadow-lg">
              {avatarMutation.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : (
                <Camera size={18} />
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
        <p className="text-text-muted text-sm mt-3">{t("screens.profile.changeAvatar")}</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-text-muted text-xs font-medium mb-2 block">{t("screens.profile.username")}</label>
          {me?.usernameChanged ? (
            <div className="flex items-center gap-2">
              <span className="text-text text-base flex-1">{me?.username}</span>
              <Lock size={16} className="text-text-muted" />
              <span className="text-text-muted text-xs">{t("screens.profile.usernameLocked")}</span>
            </div>
          ) : editingUsername ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder={me?.username}
                className="flex-1 bg-transparent text-text text-base border-b border-border pb-1 focus:outline-none focus:border-primary"
                autoFocus
              />
              <button
                onClick={submitUsername}
                disabled={usernameMutation.isPending}
                className="px-3 py-1 rounded-md bg-primary text-background font-semibold"
              >
                {usernameMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                  t("common.save")
                )}
              </button>
              <button onClick={() => setEditingUsername(false)} className="text-text-muted">
                {t("common.cancel")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-text text-base flex-1">{me?.username}</span>
              <button
                onClick={() => {
                  setUsernameInput(me?.username ?? "");
                  setEditingUsername(true);
                }}
                className="text-primary text-sm"
              >
                {t("screens.profile.changeUsername")}
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="text-text-muted text-xs font-medium mb-2 block">{t("screens.profile.email")}</label>
          <span className="text-text text-base">{me?.email}</span>
        </div>

        <div>
          <label className="text-text-muted text-xs font-medium mb-2 block">{t("screens.profile.googleAccount")}</label>
          {me?.googleLinked ? (
            <div className="flex items-center gap-2">
              <Check size={20} className="text-primary" />
              <span className="text-text text-base flex-1">{t("screens.profile.googleLinked")}</span>
              <button
                onClick={() => unlinkGoogleMutation.mutate()}
                disabled={unlinkGoogleMutation.isPending}
                className="text-danger text-sm"
              >
                {unlinkGoogleMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-danger border-t-transparent" />
                ) : (
                  t("screens.profile.unlinkGoogle")
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={promptGoogleLink}
              disabled={isLinkingGoogle}
              className="flex items-center rounded-lg p-3 bg-surface text-text hover:bg-surface-light transition-colors"
            >
              {isLinkingGoogle ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <>
                  <Link2 size={20} className="text-primary mr-3" />
                  <span className="text-base">{t("screens.profile.linkGoogle")}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
