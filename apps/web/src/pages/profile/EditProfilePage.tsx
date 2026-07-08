import { useState, useRef } from "react";
import { Camera, Check, Link2, Unlink } from "lucide-react";
import { PageWrapper } from "../../components/layout/PageWrapper";
import { DetailHeader } from "../../components/DetailHeader";
import { Avatar } from "../../components/Avatar";
import { uploadAvatar, updateUsername, unlinkGoogleAccount } from "../../services/auth.service";
import { useUIStore } from "../../store/uiStore";
import { useI18n } from "../../i18n/useI18n";

export function EditProfilePage() {
  const { t } = useI18n();
  const { showSnackbar } = useUIStore();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { avatarUrl: uploadedUrl } = await uploadAvatar(file);
      setAvatarUrl(uploadedUrl);
      showSnackbar(t("screens.profile.avatarUpdated"), "success");
    } catch {
      showSnackbar(t("errors.unknown"), "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!username.trim()) return;
    setSaving(true);
    try {
      await updateUsername(username.trim());
      showSnackbar(t("screens.profile.usernameUpdated"), "success");
    } catch {
      showSnackbar(t("errors.unknown"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleLinkGoogle() {
    showSnackbar(t("screens.profile.googleLinkNotSupported"), "info");
  }

  async function handleUnlinkGoogle() {
    try {
      await unlinkGoogleAccount();
      showSnackbar(t("screens.profile.googleUnlinked"), "success");
    } catch {
      showSnackbar(t("errors.unknown"), "error");
    }
  }

  return (
    <PageWrapper maxWidth="max-w-2xl">
      <DetailHeader title={t("screens.profile.editProfile")} />

      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <Avatar url={avatarUrl} username={username || "User"} size={80} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 bg-primary text-background rounded-full p-2 shadow-lg"
          >
            <Camera size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-text-muted text-xs font-medium mb-1 block">{t("screens.profile.username")}</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("screens.profile.username")}
            className="w-full bg-surface text-text rounded-lg px-4 py-3 text-sm border border-border focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!username.trim() || saving}
          className="w-full flex items-center justify-center gap-2 bg-primary text-background py-3 rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          <Check size={18} />
          {t("common.save")}
        </button>

        <div className="pt-4 border-t border-border">
          <h3 className="text-text font-semibold text-sm mb-3">{t("screens.profile.googleAccount")}</h3>
          <div className="flex gap-2">
            <button
              onClick={handleLinkGoogle}
              className="flex-1 flex items-center justify-center gap-2 bg-surface text-text py-2.5 rounded-lg text-sm font-medium hover:bg-surface-light transition-colors"
            >
              <Link2 size={18} />
              {t("screens.profile.linkGoogle")}
            </button>
            <button
              onClick={handleUnlinkGoogle}
              className="flex-1 flex items-center justify-center gap-2 bg-surface text-text py-2.5 rounded-lg text-sm font-medium hover:bg-surface-light transition-colors"
            >
              <Unlink size={18} />
              {t("screens.profile.unlinkGoogle")}
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
