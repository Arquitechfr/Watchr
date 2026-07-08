import { getProfileUrl } from "../services/shows.service";

interface AvatarProps {
  url?: string;
  username: string;
  size?: number;
}

export function Avatar({ url, username, size = 40 }: AvatarProps) {
  const initials = username
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (url) {
    const fullUrl = url.startsWith("http") ? url : getProfileUrl(url, size * 2);
    return (
      <img
        src={fullUrl}
        alt={username}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-primary text-background flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials || "?"}
    </div>
  );
}
