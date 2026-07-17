export const animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    spring: { damping: 20, stiffness: 300, mass: 0.8 },
    springGentle: { damping: 26, stiffness: 200, mass: 1 },
    springSnappy: { damping: 14, stiffness: 400, mass: 0.6 },
  },
  presets: {
    fadeIn: { opacity: { from: 0, to: 1 }, duration: 300 },
    scaleIn: { scale: { from: 0.9, to: 1 }, opacity: { from: 0, to: 1 }, duration: 250 },
    slideUp: { translateY: { from: 20, to: 0 }, opacity: { from: 0, to: 1 }, duration: 300 },
  },
} as const;
