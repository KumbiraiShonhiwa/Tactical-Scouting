import { Outlet } from "react-router-dom";
import { NavBar } from "../components/organisms/NavBar";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar />
      <main className="mx-auto max-w-content px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-content px-4 py-8 text-xs text-neutral-700">
        Educational/portfolio project — not for real recruitment or betting use. Data sourced
        from FootyStats and Transfermarkt; see the club/player detail pages for attribution.
      </footer>
    </div>
  );
}
