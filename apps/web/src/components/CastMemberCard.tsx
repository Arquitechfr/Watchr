import { User } from "lucide-react";
import { getProfileUrl } from "../services/shows.service";
import type { CastMember } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";

interface CastMemberCardProps {
  member: CastMember;
}

export function CastMemberCard({ member }: CastMemberCardProps) {
  const { t } = useI18n();
  const profileUrl = getProfileUrl(member.profilePath, 200);

  return (
    <div className="flex-shrink-0 w-20 flex flex-col items-center">
      {profileUrl ? (
        <img
          src={profileUrl}
          alt={member.name ?? t("common.unknown")}
          className="w-20 h-20 rounded-full bg-surface-light mb-2 object-cover"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-surface-light items-center justify-center flex mb-2">
          <User size={28} className="text-text-muted" />
        </div>
      )}
      <p className="text-text text-xs font-medium text-center line-clamp-2">
        {member.name ?? t("common.unknown")}
      </p>
      {member.character && (
        <p className="text-text-muted text-xs text-center mt-0.5 line-clamp-1">
          {member.character}
        </p>
      )}
    </div>
  );
}
