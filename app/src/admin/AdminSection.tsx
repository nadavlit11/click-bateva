import "leaflet/dist/leaflet.css";
import { lazy, Suspense } from "react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { AppLayout } from "./components/Layout/AppLayout";
import { useAuth } from "../hooks/useAuth";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const PoisPage = lazy(() =>
  import("./pages/PoisPage").then((m) => ({ default: m.PoisPage }))
);
const PoiEditPage = lazy(() =>
  import("./pages/PoiEditPage").then((m) => ({ default: m.PoiEditPage }))
);
const CategoriesPage = lazy(() =>
  import("./pages/CategoriesPage").then((m) => ({ default: m.CategoriesPage }))
);
const SubcategoriesPage = lazy(() =>
  import("./pages/SubcategoriesPage").then((m) => ({
    default: m.SubcategoriesPage,
  }))
);
const IconsPage = lazy(() =>
  import("./pages/IconsPage").then((m) => ({ default: m.IconsPage }))
);
const UsersPage = lazy(() =>
  import("./pages/UsersPage").then((m) => ({ default: m.UsersPage }))
);
const AnalyticsPage = lazy(() =>
  import("./pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage }))
);
const MapSettingsPage = lazy(() =>
  import("./pages/MapSettingsPage").then((m) => ({
    default: m.MapSettingsPage,
  }))
);

function AdminOnlyRoute() {
  const { role } = useAuth();
  if (role === null) return null;
  if (role !== "admin") return <Navigate to="/admin" replace />;
  return <Outlet />;
}

function AdminIndex() {
  return <DashboardPage />;
}

const Loading = () => (
  <div className="text-center py-10 text-gray-400">טוען...</div>
);

export default function AdminSection() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route index element={<AdminIndex />} />
            <Route path="pois" element={<PoisPage />} />
            <Route path="pois/new" element={<PoiEditPage />} />
            <Route path="pois/:id" element={<PoiEditPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="subcategories" element={<SubcategoriesPage />} />
            <Route path="icons" element={<IconsPage />} />
            <Route path="map-settings" element={<MapSettingsPage />} />
            <Route element={<AdminOnlyRoute />}>
              <Route path="users" element={<UsersPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
