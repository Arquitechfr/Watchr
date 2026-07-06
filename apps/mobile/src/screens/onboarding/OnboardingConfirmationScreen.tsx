import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "../../components/ScreenContainer";
import { NetworkError } from "../../components/NetworkError";
import { EmptyState } from "../../components/EmptyState";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { useOnboardingStore } from "../../store/onboardingStore";
import { useAddToWatchlistBatch } from "../../hooks/useTracking";
import { useCompleteOnboarding } from "../../hooks/useOnboarding";
import { getPosterUrl } from "../../services/shows.service";

interface OnboardingConfirmationScreenProps {
  onComplete: () => void;
}

export function OnboardingConfirmationScreen({ onComplete }: OnboardingConfirmationScreenProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { selectedItems, reset } = useOnboardingStore();
  const batchMutation = useAddToWatchlistBatch();
  const completeOnboardingMutation = useCompleteOnboarding();

  const isPending = batchMutation.isPending || completeOnboardingMutation.isPending;
  const hasError = batchMutation.isError || completeOnboardingMutation.isError;

  const handleFinish = () => {
    if (selectedItems.length === 0) {
      completeOnboardingMutation.mutate(undefined, {
        onSuccess: () => {
          reset();
          onComplete();
        },
        onError: () => {},
      });
      return;
    }

    batchMutation.mutate(
      selectedItems.map((item) => ({ tmdbId: item.tmdbId, type: item.type })),
      {
        onSuccess: () => {
          completeOnboardingMutation.mutate(undefined, {
            onSuccess: () => {
              reset();
              onComplete();
            },
            onError: () => {},
          });
        },
        onError: () => {},
      },
    );
  };

  const handleRetry = () => {
    batchMutation.reset();
    completeOnboardingMutation.reset();
    handleFinish();
  };

  const renderItem = ({ item }: { item: (typeof selectedItems)[number] }) => {
    const posterUrl = getPosterUrl(item.posterPath, 200);
    return (
      <View style={{ width: 100, marginRight: 8, alignItems: "center" }}>
        <View
          style={{
            width: 100,
            height: 150,
            borderRadius: 8,
            backgroundColor: colors.surfaceLight,
            overflow: "hidden",
          }}
        >
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={{ width: 100, height: 150 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: 100,
                height: 150,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
            </View>
          )}
        </View>
        <Text className="text-text text-xs mt-1 text-center" numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    );
  };

  if (hasError) {
    return (
      <ScreenContainer>
        <NetworkError
          message={t("screens.onboarding.batchError")}
          onRetry={handleRetry}
        />
      </ScreenContainer>
    );
  }

  if (isPending) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-text-muted mt-4">{t("common.loading")}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="px-4 pt-4 pb-2">
        <Text className="text-text text-2xl font-bold mb-1">
          {t("screens.onboarding.confirmationTitle")}
        </Text>
        <Text className="text-text-muted text-sm mb-4">
          {t("screens.onboarding.confirmationSubtitle")}
        </Text>
      </View>

      {selectedItems.length === 0 ? (
        <EmptyState
          icon="film-outline"
          title={t("screens.onboarding.confirmationEmpty")}
        />
      ) : (
        <FlatList
          data={selectedItems}
          keyExtractor={(item) => item.tmdbId.toString()}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        />
      )}

      <View
        className="absolute bottom-0 left-0 right-0 px-4 pt-2"
        style={{ backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity
          className="bg-primary py-4 rounded-lg items-center"
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <Text className="text-background font-semibold text-lg">
            {t("screens.onboarding.confirmationFinish")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
