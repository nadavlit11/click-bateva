import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./user-web/components/ErrorBoundary";

const MapApp = lazy(() => import("./user-web/MapApp"));

// Placeholders — replaced in later steps
const AdminSection = lazy(() => import("./admin/AdminSection"));
const BusinessSection = lazy(() => import("./business/BusinessSection"));

const Loading = () => (
  <div className="flex items-center justify-center h-screen text-gray-400">
    טוען...
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/admin/*" element={<AdminSection />} />
            <Route path="/business/*" element={<BusinessSection />} />
            <Route path="/*" element={<MapApp />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
