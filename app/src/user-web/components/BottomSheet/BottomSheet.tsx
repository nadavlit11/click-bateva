import { useRef, useState, useEffect } from "react";
import type { Category, Subcategory, Poi, TripDoc } from "../../../types";
import { CATEGORY_EMOJI } from "../../data/defaults";
import { lighten, lightenBorder } from "../../../lib/colorUtils";
import { CategoryGrid } from "../Sidebar/CategoryGrid";
import { WhatsAppShareButton } from "../WhatsAppShareButton";
import { SidebarFooter } from "../Sidebar/SidebarFooter";
import { TripPanel } from "../Sidebar/TripPanel";

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to false when collapsed (no cascading render)
      setCanScrollDown(false);
    }
  // Sets have new identity on every toggle (new Set(prev)), so this fires on each selection change — intended.
  }, [expanded, selectedCategories, selectedSubcategories]);

  const sheetStyle: React.CSSProperties = {
    transform: expanded ? "translateY(0)" : "translateY(100%)",
    transition: "transform 300ms ease",
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
        {/* Drag handle */}
        <div
          className="shrink-0 pt-3 pb-2 cursor-pointer"
          onClick={() => onExpandedChange(!expanded)}
          aria-label={expanded ? "כווץ" : "הרחב"}
          role="button"
        >
          <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto" />
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
          </div>
        ) : (
          /* ── Collapsed (peek) state ── */
          <div
            className="flex flex-col flex-1 cursor-pointer overflow-hidden"
            onClick={() => onExpandedChange(true)}
          >
            {/* Horizontal scrollable category chip row */}
            <div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-none">
              {categories.map((cat) => {
                const isSelected = selectedCategories.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCategoryToggle(cat.id);
                    }}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-full border-2 transition-all shrink-0 text-sm"
                    style={{
                      backgroundColor: lighten(cat.color),
                      borderColor: isSelected ? cat.color : lightenBorder(cat.color),
                      outline: isSelected ? `2px solid ${cat.color}` : "none",
                      outlineOffset: "2px",
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.iconUrl ? (
                        <img src={cat.iconUrl} alt={cat.name} className="w-3 h-3" />
                      ) : (
                        <span>{CATEGORY_EMOJI[cat.id] ?? "📍"}</span>
                      )}
                    </span>
                    <span className="text-gray-700 font-medium whitespace-nowrap">{cat.name}</span>
                  </button>
                );
              })}

              {/* Trip badge chip */}
              {tripCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab("trip");
                    onExpandedChange(true);
                  }}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-full border-2 border-teal-300 bg-teal-50 transition-all shrink-0 text-sm"
                >
                  <span className="text-xs">✈️</span>
                  <span className="text-teal-700 font-medium whitespace-nowrap">טיול · {tripCount}</span>
                </button>
              )}
            </div>

            {/* Result count + auth + contact buttons */}
            <div className="flex items-center justify-between px-4 pt-1">
              <span className="text-sm text-gray-400">
                {filteredCount} מקומות
              </span>
              <div className="flex gap-2 items-center">
                {isLoggedIn ? (
                  <>
                    <span onClick={(e) => e.stopPropagation()}>
                      <WhatsAppShareButton showLabel={true} className="text-xs font-medium" />
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onLogout(); }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      התנתקות
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onChangePasswordClick(); }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      שינוי סיסמה
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onLoginClick(); }}
                      className="text-xs text-green-600 hover:text-green-800 font-medium"
                    >
                      כניסה
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRegisterClick(); }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      הרשמה
                    </button>
                  </>
                )}
                {onContactClick && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onContactClick(); }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    צור קשר
                  </button>
                )}
                {termsUrl && (
                  <a
                    href={termsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    תנאי שימוש
                  </a>
                )}
                {!isLoggedIn && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <WhatsAppShareButton showLabel={false} />
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
