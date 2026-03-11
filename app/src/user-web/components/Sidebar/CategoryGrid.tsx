import { useNavigate } from "react-router-dom";
import { CATEGORY_EMOJI } from "../../data/defaults";
import type { Category, Subcategory } from "../../../types";
import { lighten, lightenBorder } from "../../../lib/colorUtils";

interface CategoryGridProps {
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategories: Set<string>;
  onToggle: (id: string) => void;
  onSubcategoryFilter?: (categoryId: string) => void;
}

export function CategoryGrid({ categories, subcategories, selectedCategories, onToggle, onSubcategoryFilter }: CategoryGridProps) {
  const navigate = useNavigate();

  return (
    <div className="px-4 pb-4">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">קטגוריות</h2>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => {
          const isLocationless = cat.locationless === true;
          const isSelected = !isLocationless && selectedCategories.has(cat.id);
          const hasSubs = !isLocationless && onSubcategoryFilter && subcategories.some(s => s.categoryId === cat.id);
          return (
            <div key={cat.id} className="flex flex-col justify-end min-h-[84px] hover:-translate-y-0.5 transition-transform">
              {isSelected && hasSubs && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubcategoryFilter(cat.id);
                  }}
                  className="w-full py-1.5 text-xs font-bold rounded-t-2xl bg-white hover:bg-gray-100 transition-colors border-2 border-b-0 cursor-pointer flex items-center justify-center gap-1"
                  style={{ color: cat.color, borderColor: cat.color }}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  סינון תוצאות
                </button>
              )}
              <button
                onClick={() => isLocationless ? navigate("/services") : onToggle(cat.id)}
                className={`flex items-center gap-2 py-2 px-4 text-start w-full h-[56px] border-2 cursor-pointer ${isSelected && hasSubs ? "rounded-b-2xl" : "rounded-2xl"}`}
                style={{
                  backgroundColor: lighten(cat.color),
                  borderColor: isSelected ? cat.color : lightenBorder(cat.color),
                }}
              >
                <span className="w-6 h-6 flex items-center justify-center text-lg shrink-0">
                  {cat.iconUrl ? (
                    <img src={cat.iconUrl} alt={cat.name} className="w-6 h-6" onError={e => { e.currentTarget.hidden = true }} />
                  ) : (
                    <CategoryEmoji id={cat.id} />
                  )}
                </span>
                <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                {isLocationless && (
                  <svg className="w-4 h-4 text-gray-400 ms-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Fallback emojis for categories that have no iconUrl
function CategoryEmoji({ id }: { id: string }) {
  return <span>{CATEGORY_EMOJI[id] ?? "📍"}</span>;
}
