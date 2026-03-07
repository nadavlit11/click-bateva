import { useNavigate } from "react-router-dom";
import type { Category, Subcategory } from "../../types";
import { CATEGORY_EMOJI } from "../data/defaults";
import { lighten, lightenBorder } from "../../lib/colorUtils";

interface FloatingCategoryChipsProps {
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategories: Set<string>;
  onCategoryToggle: (id: string) => void;
  onSubcategoryFilter: (categoryId: string) => void;
  tripCount: number;
  onTripChipClick: () => void;
}

export function FloatingCategoryChips({
  categories,
  subcategories,
  selectedCategories,
  onCategoryToggle,
  onSubcategoryFilter,
  tripCount,
  onTripChipClick,
}: FloatingCategoryChipsProps) {
  const navigate = useNavigate();

  return (
    <div className="md:hidden absolute bottom-4 left-0 right-0 z-10">
      <div
        className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-none"
      >
        {categories.map((cat) => {
          const isLocationless = cat.locationless === true;
          const isSelected = !isLocationless && selectedCategories.has(cat.id);
          const hasSubs = subcategories.some(
            s => s.categoryId === cat.id
          );
          return (
            <div key={cat.id} className="relative shrink-0">
              <button
                onClick={() => isLocationless ? navigate("/services") : onCategoryToggle(cat.id)}
                className={
                  "flex items-center gap-1.5 py-1.5 px-3 rounded-full"
                  + " border-2 transition-all text-sm"
                  + " backdrop-blur-sm shadow-sm"
                }
                style={{
                  backgroundColor: isSelected
                    ? lighten(cat.color)
                    : "rgba(255,255,255,0.85)",
                  borderColor: isSelected
                    ? cat.color
                    : lightenBorder(cat.color),
                  boxShadow: isSelected
                    ? `0 0 0 2px ${cat.color}`
                    : undefined,
                }}
              >
                <span
                  className={
                    "w-5 h-5 rounded-full flex items-center"
                    + " justify-center text-white text-xs shrink-0"
                  }
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.iconUrl ? (
                    <img
                      src={cat.iconUrl}
                      alt={cat.name}
                      className="w-3 h-3"
                    />
                  ) : (
                    <span>{CATEGORY_EMOJI[cat.id] ?? "📍"}</span>
                  )}
                </span>
                <span className="text-gray-700 font-medium whitespace-nowrap">
                  {cat.name}
                </span>
              </button>
              {isSelected && hasSubs && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubcategoryFilter(cat.id);
                  }}
                  className={
                    "absolute -top-2 -end-2 w-6 h-6 rounded-full"
                    + " shadow-md flex items-center justify-center"
                    + " transition-opacity hover:opacity-80"
                  }
                  style={{ backgroundColor: cat.color }}
                  title="סנן תתי-קטגוריות"
                >
                  <svg
                    className="w-3 h-3"
                    fill="white"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}

        {tripCount > 0 && (
          <button
            onClick={onTripChipClick}
            className={
              "flex items-center gap-1.5 py-1.5 px-3 rounded-full"
              + " border-2 border-teal-300 bg-teal-50/90"
              + " backdrop-blur-sm shadow-sm transition-all"
              + " shrink-0 text-sm"
            }
          >
            <span className="text-xs">✈️</span>
            <span className="text-teal-700 font-medium whitespace-nowrap">
              טיול · {tripCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
