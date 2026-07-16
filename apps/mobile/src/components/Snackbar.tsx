import { useEffect } from "react";
import { Text, TouchableOpacity, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useUIStore } from "../store/uiStore";

export function Snackbar() {
  const { snackbar, hideSnackbar } = useUIStore();
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!snackbar) return;

    opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    translateY.value = withSpring(0, { damping: 20, stiffness: 300, mass: 0.8 });

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(100, { duration: 200 }, () => {
        runOnJS(hideSnackbar)();
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [snackbar, hideSnackbar, opacity, translateY]);

  if (!snackbar) return null;

  const bgClass =
    snackbar.type === "error"
      ? "bg-danger"
      : snackbar.type === "success"
        ? "bg-success"
        : "bg-primary";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const dismiss = () => {
    opacity.value = withTiming(0, { duration: 150 });
    translateY.value = withTiming(100, { duration: 150 }, () => {
      runOnJS(hideSnackbar)();
    });
  };

  const panGesture = Gesture.Pan()
    .onEnd((e) => {
      if (e.translationY > 40 || e.translationX > 100 || e.translationX < -100) {
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  if (Platform.OS === "web") {
    return (
      <Animated.View
        style={[animatedStyle, { elevation: 60 }]}
        className={`absolute bottom-16 left-4 right-4 ${bgClass} px-4 py-3 rounded-lg shadow-lg z-50 flex-row items-center justify-between`}
      >
        <Text className="text-white flex-1 font-medium">{snackbar.message}</Text>
        {snackbar.actionLabel && snackbar.onAction && (
          <TouchableOpacity
            onPress={() => { snackbar.onAction!(); hideSnackbar(); }}
            className="ml-3"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-white font-bold underline">{snackbar.actionLabel}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={hideSnackbar} className="ml-3 p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-white/80 text-lg">✕</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[animatedStyle, { elevation: 60 }]}
        className={`absolute bottom-16 left-4 right-4 ${bgClass} px-4 py-3 rounded-lg shadow-lg z-50 flex-row items-center justify-between`}
      >
        <Text className="text-white flex-1 font-medium">{snackbar.message}</Text>
        {snackbar.actionLabel && snackbar.onAction && (
          <TouchableOpacity
            onPress={() => { snackbar.onAction!(); hideSnackbar(); }}
            className="ml-3"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-white font-bold">{snackbar.actionLabel}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={hideSnackbar} className="ml-3 p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-white/80 text-lg">✕</Text>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}
