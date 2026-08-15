import { createBrowserRouter, Navigate } from "react-router-dom";
import { RootLayout } from "./pages/RootLayout";
import { Home } from "./pages/Home";
import { ClubDetail } from "./pages/ClubDetail";
import { PlayerDetail } from "./pages/PlayerDetail";
import { Comparison } from "./pages/Comparison";
import { Login } from "./pages/Login";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { PipelineRuns } from "./pages/admin/PipelineRuns";
import { TacticalProfiles } from "./pages/admin/TacticalProfiles";
import { Users } from "./pages/admin/Users";
import { ProtectedRoute } from "./auth/ProtectedRoute";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/clubs/:clubId", element: <ClubDetail /> },
      { path: "/players/:playerId", element: <PlayerDetail /> },
      { path: "/compare", element: <Comparison /> },
      { path: "/login", element: <Login /> },
      {
        path: "/admin",
        element: (
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="pipeline-runs" replace /> },
          { path: "pipeline-runs", element: <PipelineRuns /> },
          { path: "tactical-profiles", element: <TacticalProfiles /> },
          { path: "users", element: <Users /> },
        ],
      },
    ],
  },
]);
