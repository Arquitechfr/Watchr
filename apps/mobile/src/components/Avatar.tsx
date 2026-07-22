import { Image } from "react-native";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DEFAULT_AVATAR = require("../../assets/avatar_default.webp");

interface AvatarProps {
  url?: string;
  size?: number;
}

export function Avatar({ url, size = 48 }: AvatarProps) {
  return (
    <Image
      source={url ? { uri: url } : DEFAULT_AVATAR}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
      resizeMode="cover"
    />
  );
}
