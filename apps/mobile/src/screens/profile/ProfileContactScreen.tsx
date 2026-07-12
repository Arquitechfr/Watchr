import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { Seo } from "../../components/Seo";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { api, useErrorMessage } from "../../services/api";

type Category = "bug" | "suggestion" | "question" | "other";

export function ProfileContactScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const getErrorMessage = useErrorMessage();

  const [category, setCategory] = useState<Category>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories: { value: Category; labelKey: string }[] = [
    { value: "bug", labelKey: "screens.profile.contactCategoryBug" },
    { value: "suggestion", labelKey: "screens.profile.contactCategorySuggestion" },
    { value: "question", labelKey: "screens.profile.contactCategoryQuestion" },
    { value: "other", labelKey: "screens.profile.contactCategoryOther" },
  ];

  const canSubmit = subject.trim().length >= 3 && message.trim().length >= 10 && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/contact", {
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      setSubject("");
      setMessage("");
      setCategory("bug");
      Alert.alert(t("screens.profile.contactSuccessTitle"), t("screens.profile.contactSuccess"));
    } catch (err: any) {
      setError(getErrorMessage(err) ?? t("screens.profile.contactError"));
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, category, subject, message, t, getErrorMessage]);

  const inputStyle = {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
  };

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.contact")} />
      <SubScreenHeader title={t("screens.profile.contact")} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-4">
          <Text className="text-text-muted text-sm mb-2">
            {t("screens.profile.contactCategory")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: category === cat.value ? colors.primary : colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
              >
                <Text
                  style={{
                    color: category === cat.value ? "#F5F0EB" : colors.text,
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-text-muted text-sm mb-2">
            {t("screens.profile.contactSubject")}
          </Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder={t("screens.profile.contactSubjectPlaceholder")}
            placeholderTextColor={colors.textMuted}
            maxLength={100}
            style={[
              inputStyle,
              {
                borderRadius: 8,
                padding: 12,
                fontSize: 15,
                borderWidth: 1,
              },
            ]}
          />
        </View>

        <View className="mb-4">
          <Text className="text-text-muted text-sm mb-2">
            {t("screens.profile.contactMessage")}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t("screens.profile.contactMessagePlaceholder")}
            placeholderTextColor={colors.textMuted}
            maxLength={2000}
            multiline
            numberOfLines={Platform.OS === "web" ? undefined : 6}
            style={[
              inputStyle,
              {
                borderRadius: 8,
                padding: 12,
                fontSize: 15,
                borderWidth: 1,
                minHeight: 120,
                textAlignVertical: "top",
              },
            ]}
          />
          <Text className="text-text-muted text-xs mt-1 text-right">
            {message.length}/2000
          </Text>
        </View>

        {error && (
          <View className="mb-4 rounded-lg p-3" style={{ backgroundColor: colors.danger + "20" }}>
            <Text style={{ color: colors.danger }} className="text-sm">
              {error}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          className="rounded-lg py-3 items-center"
          style={{
            backgroundColor: canSubmit ? colors.primary : colors.surface,
            opacity: canSubmit ? 1 : 0.5,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#F5F0EB" />
          ) : (
            <Text
              style={{
                color: canSubmit ? "#F5F0EB" : colors.textMuted,
                fontWeight: "600",
                fontSize: 15,
              }}
            >
              {t("screens.profile.contactSend")}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
