import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin/pipeline-runs", label: "Pipeline Runs" },
  { to: "/admin/tactical-profiles", label: "Tactical Profiles" },
  { to: "/admin/users", label: "Users" },
];

export function AdminLayout() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
      <nav aria-label="Admin" className="md:col-span-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `interactive-control block rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? "bg-primary-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="md:col-span-9">
        <Outlet />
      </div>
    </div>
  );
}
