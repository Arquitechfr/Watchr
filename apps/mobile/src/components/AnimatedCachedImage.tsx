import { Animated } from "react-native";
import { Image, type ImageProps } from "expo-image";

const AnimatedExpoImage = Animated.createAnimatedComponent(Image);

type AnimatedCachedImageProps = ImageProps & {
  style?: Animated.WithAnimatedValue<ImageProps["style"]>;
};

export function AnimatedCachedImage({
  contentFit = "cover",
  transition = 200,
  ...rest
}: AnimatedCachedImageProps) {
  return <AnimatedExpoImage contentFit={contentFit} transition={transition} {...rest} />;
}
