import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { useI18n } from "../../i18n/useI18n";
import { reportComment, ReportReason } from "../../services/comments.service";

interface ReportModalProps {
  visible: boolean;
  commentId: string | null;
  onClose: () => void;
  onReported?: () => void;
}

const REASONS: ReportReason[] = [
  "spam",
  "unmarked_spoiler",
  "harassment",
  "inappropriate",
  "off_topic",
];

export function ReportModal({ visible, commentId, onClose, onReported }: ReportModalProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setSelectedReason(null);
    setError(null);
    setSuccess(false);
    setSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!commentId || !selectedReason) return;
    setSubmitting(true);
    setError(null);
    try {
      await reportComment(commentId, selectedReason);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onReported?.();
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to report comment";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable className="flex-1 bg-black/60 justify-center items-center px-6" onPress={handleClose}>
        <Pressable
          className="bg-[#1A1614] rounded-2xl w-full max-w-md p-6"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="flag-outline" size={20} color={colors.primary} />
              <Text className="text-[#F5F0EB] text-lg font-bold">
                {t("screens.comments.report.title")}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          {success ? (
            <Text className="text-[#F5F0EB] text-center py-6">
              {t("screens.comments.report.success")}
            </Text>
          ) : (
            <>
              <Text className="text-[#888] text-sm mb-4">
                {t("screens.comments.report.subtitle")}
              </Text>

              <View className="gap-2 mb-4">
                {REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    onPress={() => setSelectedReason(reason)}
                    className={`p-3 rounded-xl border ${
                      selectedReason === reason
                        ? "border-[#C65D3A] bg-[#C65D3A]/10"
                        : "border-[#333] bg-[#222]"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        selectedReason === reason ? "text-[#C65D3A]" : "text-[#F5F0EB]"
                      }`}
                    >
                      {t(`screens.comments.report.reasons.${reason}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error && (
                <Text className="text-red-400 text-sm mb-3">{error}</Text>
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!selectedReason || submitting}
                className={`p-3 rounded-xl items-center ${
                  !selectedReason || submitting ? "bg-[#333]" : "bg-[#C65D3A]"
                }`}
              >
                <Text className="text-[#F5F0EB] font-semibold">
                  {submitting ? t("screens.comments.report.submitting") : t("screens.comments.report.submit")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
