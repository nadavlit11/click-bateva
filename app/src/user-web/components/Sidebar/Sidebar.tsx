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
  isAgent: boolean;
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
  // trip
  trip: TripDoc | null;
  allPois: Poi[];
  orderedTripPoiIds: string[];
  activeDayNumber: number;
  onSetActiveDayNumber: (n: number) => void;
  onRemovePoi: (poiId: string) => void;
  onReorderPoi: (poiId: string, newDay: number, newIndex: number) => void;
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
  mapKey,
  isAgent,
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
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("filter");

  const tripCount = orderedTripPoiIds.length;

  return (
    <aside
      className={`w-80 h-full bg-white flex flex-col z-10 overflow-hidden shrink-0 ${className ?? ""}`}
      style={{ boxShadow: "4px 0 20px rgba(0,0,0,0.08)" }}
    >
      <div className="relative">
        <AppHeader mapKey={mapKey} isAgent={isAgent} onMapKeyChange={onMapKeyChange} />
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

      {/* Tab row */}
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

      {/* Tab content */}
      {activeTab === "filter" ? (
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
          activeDayNumber={activeDayNumber}
          onSetActiveDayNumber={onSetActiveDayNumber}
          onRemovePoi={onRemovePoi}
          onReorderPoi={onReorderPoi}
          onAddDay={onAddDay}
          onSetClientName={onSetClientName}
          onClearTrip={onClearTrip}
          onShareTrip={onShareTrip}
          onNewTrip={onNewTrip}
          onPoiSelect={onPoiSelect}
          isLoggedIn={isLoggedIn}
          onLoginClick={onLoginClick}
        />
      )}
      <div className="px-4 py-3 border-t border-gray-100 space-y-2">
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
            פורטל עסקים ←
          </Link>
        )}
        {isLoggedIn ? (
          <div className="flex gap-2">
            <WhatsAppShareButton className="flex-1 justify-center py-1.5 rounded-lg hover:bg-green-50 transition-colors font-medium text-sm" />
            <button
              onClick={onLogout}
              className="flex-1 text-sm text-red-500 hover:text-red-700 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              התנתקות
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onLoginClick}
              className="flex-1 text-sm text-green-600 hover:text-green-800 font-medium py-1.5 rounded-lg hover:bg-green-50 transition-colors"
            >
              כניסה
            </button>
            <button
              onClick={onRegisterClick}
              className="flex-1 text-sm text-gray-600 hover:text-gray-800 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              הרשמה
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          {isLoggedIn && (
            <button
              onClick={onChangePasswordClick}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              שינוי סיסמה
            </button>
          )}
          {onContactClick && (
            <button
              onClick={onContactClick}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              צור קשר
            </button>
          )}
          {termsUrl && (
            <a
              href={termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              תנאי שימוש
            </a>
          )}
          {!isLoggedIn && <WhatsAppShareButton />}
        </div>
      </div>
    </aside>
  );
}
