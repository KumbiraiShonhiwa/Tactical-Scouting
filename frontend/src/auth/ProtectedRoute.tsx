import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { Spinner } from "../components/atoms/Spinner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, user, role } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Checking session" />
      </div>
    );
  }

  if (!user || role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
