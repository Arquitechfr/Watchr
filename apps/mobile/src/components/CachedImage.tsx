import { Image, type ImageProps } from "expo-image";

export function CachedImage({ contentFit = "cover", transition = 200, ...rest }: ImageProps) {
  return <Image contentFit={contentFit} transition={transition} {...rest} />;
}
