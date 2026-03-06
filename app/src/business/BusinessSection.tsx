import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { AppLayout } from "./components/Layout/AppLayout";

const PoisListPage = lazy(() =>
  import("./pages/PoisListPage").then((m) => ({ default: m.PoisListPage }))
);
const PoiEditPage = lazy(() =>
  import("./pages/PoiEditPage").then((m) => ({ default: m.PoiEditPage }))
);

const Loading = () => (
  <div className="text-center py-10 text-gray-400">טוען...</div>
);

export default function BusinessSection() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route index element={<PoisListPage />} />
            <Route path="pois/:poiId" element={<PoiEditPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
