import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./user-web/components/ErrorBoundary";
import { AuthProvider } from "./hooks/useAuth";

const HomePage = lazy(() => import("./user-web/pages/HomePage"));
const MapApp = lazy(() => import("./user-web/MapApp"));
const AdminSection = lazy(() => import("./admin/AdminSection"));
const BusinessSection = lazy(() => import("./business/BusinessSection"));
const ServicesPage = lazy(() => import("./user-web/pages/ServicesPage"));

const Loading = () => (
  <div className="flex items-center justify-center h-screen text-gray-400">
    טוען...
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/map/:mapKey" element={<MapApp />} />
              <Route path="/trip/:tripId" element={<MapApp />} />
              <Route path="/admin/*" element={<AdminSection />} />
              <Route path="/business/*" element={<BusinessSection />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
