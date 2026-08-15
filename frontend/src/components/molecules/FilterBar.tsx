import { useState } from "react";
import { POSITIONS, type RecommendationsFilters, type SortOption } from "../../lib/types";
import { Button } from "../atoms/Button";

const SORT_LABELS: Record<SortOption, string> = {
  fit_score_desc: "Fit score (high to low)",
  fit_score_asc: "Fit score (low to high)",
  undervaluation_desc: "Undervaluation (high to low)",
  undervaluation_asc: "Undervaluation (low to high)",
};

export function FilterBar({
  filters,
  onChange,
}: {
  filters: RecommendationsFilters;
  onChange: (filters: RecommendationsFilters) => void;
}) {
  const [collapsed, setCollapsed] = useState(true);

  function update(patch: Partial<RecommendationsFilters>) {
    onChange({ ...filters, ...patch, page: 1 });
  }

  function clearFilters() {
    onChange({});
  }

  return (
    <div className="rounded-md border border-neutral-100 bg-white p-4">
      <div className="flex items-center justify-between md:hidden">
        <h3 className="text-sm font-semibold text-primary-900">Filters</h3>
        <Button
          variant="secondary"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? "Show filters" : "Hide filters"}
        </Button>
      </div>

      <div className={`${collapsed ? "hidden" : "block"} mt-3 space-y-4 md:mt-0 md:block`}>
        <div>
          <label htmlFor="filter-position" className="block text-xs font-medium text-neutral-700">
            Position
          </label>
          <select
            id="filter-position"
            className="interactive-control mt-1 w-full rounded-md border border-neutral-100 px-2 py-1.5 text-sm"
            value={filters.position ?? ""}
            onChange={(e) =>
              update({ position: (e.target.value || undefined) as RecommendationsFilters["position"] })
            }
          >
            <option value="">Any position</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="filter-age-min" className="block text-xs font-medium text-neutral-700">
              Min age
            </label>
            <input
              id="filter-age-min"
              type="number"
              min={15}
              max={45}
              className="interactive-control mt-1 w-full rounded-md border border-neutral-100 px-2 py-1.5 text-sm"
              value={filters.age_min ?? ""}
              onChange={(e) =>
                update({ age_min: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
          <div>
            <label htmlFor="filter-age-max" className="block text-xs font-medium text-neutral-700">
              Max age
            </label>
            <input
              id="filter-age-max"
              type="number"
              min={15}
              max={45}
              className="interactive-control mt-1 w-full rounded-md border border-neutral-100 px-2 py-1.5 text-sm"
              value={filters.age_max ?? ""}
              onChange={(e) =>
                update({ age_max: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
        </div>

        <div>
          <label htmlFor="filter-min-minutes" className="block text-xs font-medium text-neutral-700">
            Min minutes played
          </label>
          <input
            id="filter-min-minutes"
            type="number"
            min={0}
            className="interactive-control mt-1 w-full rounded-md border border-neutral-100 px-2 py-1.5 text-sm"
            value={filters.min_minutes ?? ""}
            onChange={(e) =>
              update({ min_minutes: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>

        <div>
          <label htmlFor="filter-sort" className="block text-xs font-medium text-neutral-700">
            Sort by
          </label>
          <select
            id="filter-sort"
            className="interactive-control mt-1 w-full rounded-md border border-neutral-100 px-2 py-1.5 text-sm"
            value={filters.sort ?? "fit_score_desc"}
            onChange={(e) => update({ sort: e.target.value as SortOption })}
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            className="interactive-control"
            checked={filters.recommended_only ?? false}
            onChange={(e) => update({ recommended_only: e.target.checked })}
          />
          Recommended (undervalued) only
        </label>

        <Button variant="secondary" onClick={clearFilters} className="w-full">
          Clear filters
        </Button>
      </div>
    </div>
  );
}
