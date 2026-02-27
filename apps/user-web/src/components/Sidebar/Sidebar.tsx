import { useState } from "react";
import type { Category, Subcategory, Poi, TripDoc } from "../../types";
import { AppHeader } from "./AppHeader";
import { CategoryGrid } from "./CategoryGrid";
import { SidebarFooter } from "./SidebarFooter";
import { TripPanel } from "./TripPanel";

interface SidebarProps {
  // filter props
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategories: Set<string>;
  filteredCount: number;
  onCategoryToggle: (id: string) => void;
  onSubcategoryFilter: (categoryId: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  className?: string;
  // auth
  currentUserEmail?: string | null;
  isTravelAgent: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  // trip (only used when isTravelAgent, but always provided from App.tsx)
  trip: TripDoc | null;
  allPois: Poi[];
  orderedTripPoiIds: string[];
  onRemovePoi: (poiId: string) => void;
  onAddDay: () => void;
  onSetClientName: (name: string) => void;
  onClearTrip: () => void;
  onShareTrip: () => Promise<string>;
  onNewTrip: () => void;
  onPoiSelect: (poiId: string) => void;
}

type ActiveTab = "filter" | "trip";

export function Sidebar({
  categories,
  subcategories,
  selectedCategories,
  filteredCount,
  onCategoryToggle,
  onSubcategoryFilter,
  onClearAll,
  onClose,
  className,
  currentUserEmail,
  isTravelAgent,
  onLoginClick,
  onLogout,
  trip,
  allPois,
  orderedTripPoiIds,
  onRemovePoi,
  onAddDay,
  onSetClientName,
  onClearTrip,
  onShareTrip,
  onNewTrip,
  onPoiSelect,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("filter");

  const tripCount = orderedTripPoiIds.length;

  return (
    <aside
      className={`w-80 h-full bg-white flex flex-col z-10 overflow-hidden shrink-0 ${className ?? ""}`}
      style={{ boxShadow: "4px 0 20px rgba(0,0,0,0.08)" }}
    >
      <div className="relative">
        <AppHeader
          currentUserEmail={currentUserEmail}
          onLoginClick={onLoginClick}
          onLogout={onLogout}
        />
        <button
          onClick={onClose}
          className="absolute top-4 end-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          title="סגור תפריט"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab row — only for travel agents */}
      {isTravelAgent && (
        <div className="flex border-b border-gray-100 shrink-0">
          <button
            onClick={() => setActiveTab("filter")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "filter"
                ? "text-green-700 border-b-2 border-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🗂️ מסנן
          </button>
          <button
            onClick={() => setActiveTab("trip")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "trip"
                ? "text-teal-700 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            ✈️ תכנן טיול{tripCount > 0 ? ` · ${tripCount}` : ""}
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === "filter" || !isTravelAgent ? (
        <>
          <div className="flex-1 overflow-y-auto">
            <CategoryGrid
              categories={categories}
              subcategories={subcategories}
              selectedCategories={selectedCategories}
              onToggle={onCategoryToggle}
              onSubcategoryFilter={onSubcategoryFilter}
            />
          </div>
          <SidebarFooter count={filteredCount} onClearAll={onClearAll} />
        </>
      ) : (
        <TripPanel
          trip={trip}
          allPois={allPois}
          categories={categories}
          orderedTripPoiIds={orderedTripPoiIds}
          onRemovePoi={onRemovePoi}
          onAddDay={onAddDay}
          onSetClientName={onSetClientName}
          onClearTrip={onClearTrip}
          onShareTrip={onShareTrip}
          onNewTrip={onNewTrip}
          onPoiSelect={onPoiSelect}
        />
      )}
    </aside>
  );
}
