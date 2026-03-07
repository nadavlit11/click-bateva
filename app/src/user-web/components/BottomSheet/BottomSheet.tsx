import { useRef, useState, useEffect, useCallback } from "react";
import type { Category, Subcategory, Poi, TripDoc } from "../../../types";
import { CategoryGrid } from "../Sidebar/CategoryGrid";
import { SidebarFooter } from "../Sidebar/SidebarFooter";
import { TripPanel } from "../Sidebar/TripPanel";
import { BottomSheetFooter } from "./BottomSheetFooter";

const SWIPE_THRESHOLD = 80;

type ActiveTab = "filter" | "trip";

interface BottomSheetProps {
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategories: Set<string>;
  selectedSubcategories: Set<string>;
  filteredCount: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onCategoryToggle: (id: string) => void;
  onSubcategoryFilter: (categoryId: string) => void;
  onClearAll: () => void;
  role?: string | null;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogout: () => void;
  onChangePasswordClick: () => void;
  onContactClick?: () => void;
  termsUrl?: string;
  className?: string;
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

export function BottomSheet({
  categories,
  subcategories,
  selectedCategories,
  selectedSubcategories,
  filteredCount,
  expanded,
  onExpandedChange,
  onCategoryToggle,
  onSubcategoryFilter,
  onClearAll,
  role,
  isLoggedIn,
  onLoginClick,
  onRegisterClick,
  onLogout,
  onChangePasswordClick,
  onContactClick,
  termsUrl,
  className,
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
}: BottomSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("filter");

  const tripCount = orderedTripPoiIds.length;

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight > el.clientHeight + el.scrollTop + 16);
  }

  // Re-check whenever the sheet opens or content changes
  useEffect(() => {
    if (expanded) {
      const id = requestAnimationFrame(checkScroll);
      return () => cancelAnimationFrame(id);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on collapse, no cascade
      setCanScrollDown(false);
    }
  // Sets have new identity on every toggle (new Set(prev)), so this fires on each selection change — intended.
  }, [expanded, selectedCategories, selectedSubcategories]);

  // ── Swipe-to-close ──
  const touchStartY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setDragOffset(dy);
  }, [dragging]);

  const onTouchEnd = useCallback(() => {
    setDragging(false);
    if (dragOffset > SWIPE_THRESHOLD) {
      onExpandedChange(false);
    }
    setDragOffset(0);
  }, [dragOffset, onExpandedChange]);

  const sheetStyle: React.CSSProperties = {
    transform: expanded
      ? `translateY(${dragOffset}px)`
      : "translateY(100%)",
    transition: dragging ? "none" : "transform 300ms ease",
    height: "70vh",
  };

  return (
    <>
      {/* Backdrop — shown when expanded, behind the sheet */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/30 z-10"
          onClick={() => onExpandedChange(false)}
        />
      )}

      {/* Sheet */}
      <div
        className={`bg-white rounded-t-2xl shadow-2xl flex flex-col z-20 ${className ?? ""}`}
        style={sheetStyle}
      >
        {/* Drag handle + close button */}
        <div
          className="shrink-0 pt-3 pb-2 cursor-pointer relative"
          onClick={() => onExpandedChange(!expanded)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          aria-label={expanded ? "כווץ" : "הרחב"}
          role="button"
        >
          <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto" />
          {expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpandedChange(false);
              }}
              className="absolute top-2 start-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              aria-label="סגור"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {expanded ? (
          /* ── Expanded state ── */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tab row */}
            <div className="flex border-b border-gray-100 shrink-0">
              <button
                onClick={() => setActiveTab("filter")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  activeTab === "filter"
                    ? "text-green-700 border-b-2 border-green-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🗂️ מסנן
              </button>
              <button
                onClick={() => setActiveTab("trip")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  activeTab === "trip"
                    ? "text-teal-700 border-b-2 border-teal-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                ✈️ תכנן טיול{tripCount > 0 ? ` · ${tripCount}` : ""}
              </button>
            </div>

            {activeTab === "filter" ? (
              <>
                <div className="relative flex-1 overflow-hidden">
                  <div
                    ref={scrollRef}
                    className="h-full overflow-y-auto"
                    onScroll={checkScroll}
                  >
                    <CategoryGrid
                      categories={categories}
                      subcategories={subcategories}
                      selectedCategories={selectedCategories}
                      onToggle={onCategoryToggle}
                      onSubcategoryFilter={onSubcategoryFilter}
                    />
                  </div>
                  {canScrollDown && (
                    <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none flex items-end justify-center pb-1">
                      <span className="text-gray-400 text-3xl leading-none">⌄</span>
                    </div>
                  )}
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

            {/* Auth / utility links */}
            <BottomSheetFooter
              role={role}
              isLoggedIn={isLoggedIn}
              onLoginClick={onLoginClick}
              onRegisterClick={onRegisterClick}
              onLogout={onLogout}
              onChangePasswordClick={onChangePasswordClick}
              onContactClick={onContactClick}
              termsUrl={termsUrl}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
