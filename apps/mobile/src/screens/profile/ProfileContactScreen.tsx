import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { Seo } from "../../components/Seo";
import { DropdownPicker } from "../../components/DropdownPicker";
import type { DropdownOption } from "../../components/DropdownPicker";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { api, useErrorMessage } from "../../services/api";
import { useUIStore } from "../../store/uiStore";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type Category = "bug" | "suggestion" | "question" | "other";

type SubjectKey =
  | "bug_app_crash" | "bug_display" | "bug_login" | "bug_import" | "bug_notification" | "bug_other"
  | "suggestion_feature" | "suggestion_ui" | "suggestion_content" | "suggestion_community" | "suggestion_other"
  | "question_account" | "question_data" | "question_howto" | "question_billing" | "question_other"
  | "other_partnership" | "other_press" | "other_feedback" | "other_other";

const SUBJECTS_BY_CATEGORY: Record<Category, SubjectKey[]> = {
  bug: ["bug_app_crash", "bug_display", "bug_login", "bug_import", "bug_notification", "bug_other"],
  suggestion: ["suggestion_feature", "suggestion_ui", "suggestion_content", "suggestion_community", "suggestion_other"],
  question: ["question_account", "question_data", "question_howto", "question_billing", "question_other"],
  other: ["other_partnership", "other_press", "other_feedback", "other_other"],
};

const SUBJECT_I18N_KEY: Record<SubjectKey, string> = {
  bug_app_crash: "screens.profile.contactSubjectBugAppCrash",
  bug_display: "screens.profile.contactSubjectBugDisplay",
  bug_login: "screens.profile.contactSubjectBugLogin",
  bug_import: "screens.profile.contactSubjectBugImport",
  bug_notification: "screens.profile.contactSubjectBugNotification",
  bug_other: "screens.profile.contactSubjectBugOther",
  suggestion_feature: "screens.profile.contactSubjectSuggestionFeature",
  suggestion_ui: "screens.profile.contactSubjectSuggestionUi",
  suggestion_content: "screens.profile.contactSubjectSuggestionContent",
  suggestion_community: "screens.profile.contactSubjectSuggestionCommunity",
  suggestion_other: "screens.profile.contactSubjectSuggestionOther",
  question_account: "screens.profile.contactSubjectQuestionAccount",
  question_data: "screens.profile.contactSubjectQuestionData",
  question_howto: "screens.profile.contactSubjectQuestionHowTo",
  question_billing: "screens.profile.contactSubjectQuestionBilling",
  question_other: "screens.profile.contactSubjectQuestionOther",
  other_partnership: "screens.profile.contactSubjectOtherPartnership",
  other_press: "screens.profile.contactSubjectOtherPress",
  other_feedback: "screens.profile.contactSubjectOtherFeedback",
  other_other: "screens.profile.contactSubjectOtherOther",
};

export function ProfileContactScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const getErrorMessage = useErrorMessage();
  const { showAlert } = useUIStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [category, setCategory] = useState<Category>("bug");
  const [subject, setSubject] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories: { value: Category; labelKey: string }[] = [
    { value: "bug", labelKey: "screens.profile.contactCategoryBug" },
    { value: "suggestion", labelKey: "screens.profile.contactCategorySuggestion" },
    { value: "question", labelKey: "screens.profile.contactCategoryQuestion" },
    { value: "other", labelKey: "screens.profile.contactCategoryOther" },
  ];

  const subjectOptions: DropdownOption[] = useMemo(
    () =>
      SUBJECTS_BY_CATEGORY[category].map((key) => ({
        value: key,
        label: t(SUBJECT_I18N_KEY[key]),
      })),
    [category, t],
  );

  const canSubmit = subject !== null && message.trim().length >= 10 && !submitting;

  const handleCategoryChange = useCallback((newCategory: Category) => {
    setCategory(newCategory);
    setSubject(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !subject) return;
    const subjectLabel = t(SUBJECT_I18N_KEY[subject as SubjectKey]);
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/contact", {
        category,
        subject: subjectLabel,
        message: message.trim(),
      });
      setSubject(null);
      setMessage("");
      setCategory("bug");
      showAlert({
        title: t("screens.profile.contactSuccessTitle"),
        message: t("screens.profile.contactSuccess"),
        buttons: [{ text: t("common.ok"), style: "default" }],
      });
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
      <View className="flex-1 md:max-w-lg md:mx-auto w-full">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-6">
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require("../../../assets/adaptive-icon.png")}
            style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 12 }}
            resizeMode="contain"
          />
          <Text className="text-text text-xl font-bold mb-1">Watchr</Text>
          <Text className="text-text-muted text-sm text-center px-4 mb-3">
            {t("screens.profile.contactCompanyIntro")}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("ProfileAbout")}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "500" }}>
              {t("screens.profile.contactLearnMore")}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-text-muted text-sm mb-2">
            {t("screens.profile.contactCategory")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                onPress={() => handleCategoryChange(cat.value)}
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
          <DropdownPicker
            options={subjectOptions}
            value={subject}
            onChange={setSubject}
            placeholder={t("screens.profile.contactSubjectPlaceholder")}
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
      </View>
    </ScreenContainer>
  );
}
