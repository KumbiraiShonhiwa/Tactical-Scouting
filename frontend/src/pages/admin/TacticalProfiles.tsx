import { useState } from "react";
import { useClubs } from "../../hooks/useClubs";
import { useTacticalProfile } from "../../hooks/useTacticalProfile";
import { useSaveWeightings } from "../../hooks/useAdminMutations";
import { useAuth } from "../../auth/useAuth";
import { ProfileWeightEditor } from "../../components/organisms/ProfileWeightEditor";
import { Skeleton } from "../../components/atoms/Skeleton";
import { Badge } from "../../components/atoms/Badge";

export function TacticalProfiles() {
  const { session } = useAuth();
  const clubsQuery = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<string>("");

  const clubId = selectedClubId || clubsQuery.data?.[0]?.club_id;
  const profileQuery = useTacticalProfile(clubId);
  const saveMutation = useSaveWeightings(clubId ?? "", session?.access_token);

  if (clubsQuery.isPending) return <Skeleton className="h-64 w-full" />;

  return (
    <div>
      <label htmlFor="admin-club-select" className="block text-sm font-medium text-neutral-700">
        Club
      </label>
      <select
        id="admin-club-select"
        className="interactive-control mt-1 rounded-md border border-neutral-100 px-2 py-1.5 text-sm"
        value={clubId ?? ""}
        onChange={(e) => setSelectedClubId(e.target.value)}
      >
        {clubsQuery.data?.map((club) => (
          <option key={club.club_id} value={club.club_id}>
            {club.name}
          </option>
        ))}
      </select>

      {profileQuery.data && (
        <p className="mt-2 text-xs text-neutral-700">
          Current version: {profileQuery.data.version}
        </p>
      )}

      {saveMutation.isSuccess && (
        <p className="mt-2">
          <Badge tone="success">
            Saved as version {saveMutation.data.profile_version} — recompute{" "}
            {saveMutation.data.recompute_status}
          </Badge>
        </p>
      )}

      <div className="mt-4">
        <ProfileWeightEditor
          key={clubId}
          initialWeightings={profileQuery.data?.weightings}
          status={profileQuery.isPending ? "loading" : profileQuery.isError ? "error" : "success"}
          onRetry={() => profileQuery.refetch()}
          onSave={(weightings) => saveMutation.mutate(weightings)}
          saving={saveMutation.isPending}
          saveError={saveMutation.isError ? saveMutation.error.message : undefined}
        />
      </div>
    </div>
  );
}
