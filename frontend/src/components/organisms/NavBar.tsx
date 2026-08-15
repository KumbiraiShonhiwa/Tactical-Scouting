import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../atoms/Button";

export function NavBar() {
  const { user, role, signOut, loading } = useAuth();

  return (
    <header className="border-b border-neutral-100 bg-white">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-content items-center justify-between px-4 py-3"
      >
        <Link to="/" className="interactive-control text-lg font-semibold text-primary-900">
          Tactical-Scouting
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {!loading && user ? (
            <>
              {role === "admin" && (
                <Link to="/admin" className="interactive-control text-accent-teal">
                  Admin
                </Link>
              )}
              <span className="text-neutral-700">{user.email}</span>
              <Button variant="secondary" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            !loading && (
              <Link to="/login" className="interactive-control text-accent-teal">
                Login
              </Link>
            )
          )}
        </div>
      </nav>
    </header>
  );
}
