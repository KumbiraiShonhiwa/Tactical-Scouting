-- Exposes only the current profile_version per player/club pair, so the frontend never has
-- to filter historical versions client-side (ADD 3.5). Views inherit RLS from their
-- underlying tables (fit_score, tactical_profile), so no separate RLS enablement is needed.
create view public.latest_fit_score as
select fs.*
from public.fit_score fs
join public.tactical_profile tp
  on tp.club_id = fs.club_id
 and tp.version = fs.profile_version
 and tp.is_current;

grant select on public.latest_fit_score to anon, authenticated;
