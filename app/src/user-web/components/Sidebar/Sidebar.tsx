import { useState } from "react";
import { Link } from "react-router-dom";
import type { Category, Subcategory, Poi, TripDoc } from "../../../types";
import type { MapKey } from "../../../hooks/useFirestoreData";
import { AppHeader } from "./AppHeader";
import { WhatsAppShareButton } from "../WhatsAppShareButton";
import { CategoryGrid } from "./CategoryGrid";
import { SidebarFooter } from "./SidebarFooter";
import { TripPanel } from "./TripPanel";

interface SidebarProps {
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategories: Set<string>;
  filteredCount: number;
  onCategoryToggle: (id: string) => void;
  onSubcategoryFilter: (categoryId: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  className?: string;
  // map
  mapKey: MapKey;
  canSeeAgents: boolean;
  onMapKeyChange: (key: MapKey) => void;
  // auth
  role?: string | null;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogout: () => void;
  onChangePasswordClick: () => void;
  // contact
  onContactClick?: () => void;
  // terms
  termsUrl?: string;
  // welcome
  welcomeName?: string | null;
  // trip (optional — hidden when not provided)
  trip?: TripDoc | null;
  allPois?: Poi[];
  orderedTripPoiIds?: string[];
  activeDayNumber?: number;
  onSetActiveDayNumber?: (n: number) => void;
  onRemovePoi?: (poiId: string) => void;
  onReorderPoi?: (poiId: string, newDay: number, newIndex: number) => void;
  onAddDay?: () => void;
  onSetClientName?: (name: string) => void;
  onClearTrip?: () => void;
  onShareTrip?: () => Promise<string>;
  onNewTrip?: () => void;
  onPoiSelect?: (poiId: string) => void;
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
  mapKey,
  canSeeAgents,
  onMapKeyChange,
  role,
  isLoggedIn,
  onLoginClick,
  onRegisterClick,
  onLogout,
  onChangePasswordClick,
  onContactClick,
  termsUrl,
  trip,
  allPois,
  orderedTripPoiIds,
  activeDayNumber,
  onSetActiveDayNumber,
  onRemovePoi,
  onReorderPoi,
  onAddDay,
  onSetClientName,
  onClearTrip,
  onShareTrip,
  onNewTrip,
  onPoiSelect,
  welcomeName,
}: SidebarProps) {
  const tripEnabled = !!onPoiSelect; // trip props provided
  const [activeTab, setActiveTab] = useState<ActiveTab>("filter");

  const tripCount = orderedTripPoiIds?.length ?? 0;

  return (
    <aside
      className={`w-80 h-full bg-white flex flex-col z-10 overflow-hidden shrink-0 ${className ?? ""}`}
      style={{ boxShadow: "4px 0 20px rgba(0,0,0,0.08)" }}
    >
      <div className="relative">
        <AppHeader mapKey={mapKey} canSeeAgents={canSeeAgents} onMapKeyChange={onMapKeyChange} welcomeName={welcomeName} />
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

      {/* Tab row — only shown when trip is enabled */}
      {tripEnabled && (
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
      {activeTab === "filter" || !tripEnabled ? (
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
          trip={trip!}
          allPois={allPois!}
          categories={categories}
          orderedTripPoiIds={orderedTripPoiIds!}
          activeDayNumber={activeDayNumber!}
          onSetActiveDayNumber={onSetActiveDayNumber!}
          onRemovePoi={onRemovePoi!}
          onReorderPoi={onReorderPoi!}
          onAddDay={onAddDay!}
          onSetClientName={onSetClientName!}
          onClearTrip={onClearTrip!}
          onShareTrip={onShareTrip!}
          onNewTrip={onNewTrip!}
          onPoiSelect={onPoiSelect!}
          isLoggedIn={isLoggedIn}
          onLoginClick={onLoginClick}
        />
      )}
      <div className="px-4 py-3 border-t border-gray-100 space-y-2">
        {/* Dashboard links */}
        {isLoggedIn && (role === "admin" || role === "content_manager") && (
          <Link
            to="/admin"
            className="flex w-full justify-center py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium"
          >
            לוח ניהול ←
          </Link>
        )}
        {isLoggedIn && role === "business_user" && (
          <Link
            to="/business"
            className="flex w-full justify-center py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium"
          >
            ניהול הנקודות שלי ←
          </Link>
        )}

        {/* Share + Contact row */}
        <div className="flex gap-2">
          <WhatsAppShareButton className="flex-1 justify-center py-1.5 rounded-lg hover:bg-green-50 transition-colors font-medium text-sm" />
          {onContactClick && (
            <button
              onClick={onContactClick}
              className="flex-1 text-sm text-blue-600 hover:text-blue-800 font-medium py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              צור קשר
            </button>
          )}
        </div>

        {/* Auth buttons */}
        {isLoggedIn ? (
          <div className="flex gap-2">
            <button
              onClick={onLogout}
              className="flex-1 text-sm text-red-500 hover:text-red-700 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              התנתקות
            </button>
            <button
              onClick={onChangePasswordClick}
              className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              שינוי סיסמה
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onLoginClick}
              className="flex-1 text-sm text-gray-500 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              כניסה
            </button>
            <button
              onClick={onRegisterClick}
              className="flex-1 text-sm text-gray-500 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              הרשמה
            </button>
          </div>
        )}

        {/* Terms link */}
        {termsUrl && (
          <div className="flex items-center justify-center">
            <a
              href={termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              תנאי שימוש
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
