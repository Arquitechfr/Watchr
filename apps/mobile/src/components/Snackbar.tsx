import { useEffect } from "react";
import { Animated, Text, TouchableOpacity } from "react-native";
import { useUIStore } from "../store/uiStore";

export function Snackbar() {
  const { snackbar, hideSnackbar } = useUIStore();
  const opacity = new Animated.Value(0);

  useEffect(() => {
    if (!snackbar) return;

    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => hideSnackbar());
    }, 3000);

    return () => clearTimeout(timer);
  }, [snackbar]);

  if (!snackbar) return null;

  const bgClass =
    snackbar.type === "error"
      ? "bg-danger"
      : snackbar.type === "success"
        ? "bg-success"
        : "bg-primary";

  return (
    <Animated.View
      style={{ opacity, elevation: 60 }}
      className={`absolute bottom-12 left-4 right-4 ${bgClass} px-4 py-3 rounded-lg shadow-lg z-50`}
      pointerEvents="box-none"
    >
      <TouchableOpacity onPress={hideSnackbar} activeOpacity={0.8}>
        <Text className="text-white text-center font-medium">{snackbar.message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
