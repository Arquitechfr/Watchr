import { useEffect } from "react";
import { Platform, Keyboard, type ViewStyle, type ViewProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ANIMATION_DURATION = 250;
const EASING = Easing.out(Easing.cubic);

interface KeyboardAwareViewProps extends ViewProps {
  style?: ViewStyle;
  children: React.ReactNode;
}

export function KeyboardAwareView({ style, children, ...rest }: KeyboardAwareViewProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const showSubscription = Keyboard.addListener("keyboardDidShow", (e) => {
      const height = e.endCoordinates.height;
      keyboardHeight.value = withTiming(Math.max(height - insets.bottom, 0), {
        duration: ANIMATION_DURATION,
        easing: EASING,
      });
    });

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      keyboardHeight.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: EASING,
      });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom, keyboardHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardHeight.value,
  }));

  if (Platform.OS === "web") {
    return <Animated.View style={style} {...rest}>{children}</Animated.View>;
  }

  return (
    <Animated.View style={[style, animatedStyle]} {...rest}>
      {children}
    </Animated.View>
  );
}
