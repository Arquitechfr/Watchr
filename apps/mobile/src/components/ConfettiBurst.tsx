import { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { useThemeColors } from "../theme/useThemeColors";

interface ConfettiBurstProps {
  trigger: number;
  colors?: string[];
}

const PARTICLE_COUNT = 14;
const DURATION = 800;
const MAX_DISTANCE = 50;

interface ParticleConfig {
  id: number;
  angle: number;
  distance: number;
  rotation: number;
  color: string;
  size: number;
}

function ConfettiParticle({
  config,
  progress,
}: {
  config: ParticleConfig;
  progress: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const translateX = Math.cos(config.angle) * config.distance * p;
    const translateY = Math.sin(config.angle) * config.distance * p;
    const opacity = p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.15) / 0.85);
    const scale = 1 - p * 0.6;
    const rot = config.rotation + p * 540;
    return {
      transform: [
        { translateX },
        { translateY },
        { scale },
        { rotate: `${rot}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: config.size,
          height: config.size,
          backgroundColor: config.color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function ConfettiBurst({ trigger, colors }: ConfettiBurstProps) {
  const themeColors = useThemeColors();
  const progress = useSharedValue(0);

  const particleColors = colors ?? [
    themeColors.primary,
    "#FFD700",
    "#FF6B6B",
    "#4ECDC4",
    "#95E1D3",
  ];

  const particles = useMemo<ParticleConfig[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      angle: (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
      distance: MAX_DISTANCE * (0.5 + Math.random() * 0.5),
      rotation: Math.random() * 360,
      color: particleColors[i % particleColors.length],
      size: 4 + Math.random() * 4,
    }));
  }, []);

  useEffect(() => {
    if (trigger > 0) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [trigger]);

  if (trigger === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((config) => (
        <ConfettiParticle key={config.id} config={config} progress={progress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
    borderRadius: 2,
  },
});
