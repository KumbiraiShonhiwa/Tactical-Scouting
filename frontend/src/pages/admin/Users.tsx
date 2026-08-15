import { useProfiles } from "../../hooks/useProfiles";
import { Skeleton } from "../../components/atoms/Skeleton";
import { ErrorState } from "../../components/atoms/ErrorState";
import { EmptyState } from "../../components/atoms/EmptyState";
import { Badge } from "../../components/atoms/Badge";

// Read-only per the Phase 4 plan's "Admin users scope" decision: no role-management backend
// route exists yet, so this page lists profiles without offering any write action.
export function Users() {
  const profilesQuery = useProfiles();

  if (profilesQuery.isPending) return <Skeleton className="h-64 w-full" />;
  if (profilesQuery.isError)
    return <ErrorState message="User list temporarily unavailable" onRetry={() => profilesQuery.refetch()} />;
  if (!profilesQuery.data || profilesQuery.data.length === 0)
    return <EmptyState message="No user profiles found." />;

  return (
    <div>
      <h2 className="mb-2 text-base font-semibold text-primary-900">Users</h2>
      <p className="mb-4 text-xs text-neutral-700">
        Read-only. Role changes are performed via the Supabase dashboard, not this UI.
      </p>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Registered user profiles and roles</caption>
        <thead>
          <tr className="border-b border-neutral-100 text-xs uppercase text-neutral-700">
            <th scope="col" className="py-2 pr-4">
              User ID
            </th>
            <th scope="col" className="py-2 pr-4">
              Role
            </th>
            <th scope="col" className="py-2">
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          {profilesQuery.data.map((profile) => (
            <tr key={profile.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4 font-mono text-xs">{profile.id}</td>
              <td className="py-2 pr-4">
                <Badge tone={profile.role === "admin" ? "info" : "neutral"}>{profile.role}</Badge>
              </td>
              <td className="py-2 tabular-nums">
                {new Date(profile.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
