import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { useFollowStatus, useFollowUser, useUnfollowUser } from "../hooks/useSocial";

interface FollowButtonProps {
  userId: string;
}

export function FollowButton({ userId }: FollowButtonProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { data, isLoading: statusLoading } = useFollowStatus(userId);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const isFollowing = data?.isFollowing ?? false;
  const isPending = followMutation.isPending || unfollowMutation.isPending;

  function handlePress() {
    if (isFollowing) {
      unfollowMutation.mutate(userId);
    } else {
      followMutation.mutate(userId);
    }
  }

  if (statusLoading) {
    return (
      <TouchableOpacity
        className="px-6 py-2.5 rounded-lg items-center"
        style={{ backgroundColor: colors.surface }}
        disabled
      >
        <ActivityIndicator size="small" color={colors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      className="px-6 py-2.5 rounded-lg items-center"
      style={{
        backgroundColor: isFollowing ? colors.surface : colors.primary,
        opacity: isPending ? 0.6 : 1,
      }}
      onPress={handlePress}
      disabled={isPending}
      activeOpacity={0.7}
    >
      {isPending ? (
        <ActivityIndicator size="small" color={isFollowing ? colors.primary : "#fff"} />
      ) : (
        <Text
          className="font-semibold text-sm"
          style={{ color: isFollowing ? colors.text : "#fff" }}
        >
          {isFollowing ? t("screens.social.unfollow") : t("screens.social.follow")}
        </Text>
      )}
    </TouchableOpacity>
  );
}
