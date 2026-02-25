import { CATEGORY_EMOJI } from "../../data/defaults";
import type { Category } from "../../types";
import { lighten, lightenBorder } from "../../lib/colorUtils";

interface CategoryGridProps {
  categories: Category[];
  selectedCategories: Set<string>;
  onToggle: (id: string) => void;
  onSubcategoryFilter?: (categoryId: string) => void;
}

export function CategoryGrid({ categories, selectedCategories, onToggle, onSubcategoryFilter }: CategoryGridProps) {
  return (
    <div className="px-4 pb-4">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">קטגוריות</h2>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => {
          const isSelected = selectedCategories.has(cat.id);
          return (
            <div key={cat.id} className="relative">
              <button
                onClick={() => onToggle(cat.id)}
                className="flex items-center gap-2 py-3 px-4 rounded-2xl border-2 transition-all hover:-translate-y-0.5 hover:shadow-md text-start w-full"
                style={{
                  backgroundColor: lighten(cat.color),
                  borderColor: isSelected ? cat.color : lightenBorder(cat.color),
                  boxShadow: isSelected ? `0 0 0 2px ${cat.color}` : "none",
                }}
              >
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-lg shrink-0"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.iconUrl ? (
                    <img src={cat.iconUrl} alt={cat.name} className="w-5 h-5" />
                  ) : (
                    <CategoryEmoji id={cat.id} />
                  )}
                </span>
                <span className="text-sm font-medium text-gray-700">{cat.name}</span>
              </button>
              {isSelected && onSubcategoryFilter && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubcategoryFilter(cat.id);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                  title="סנן תתי-קטגוריות"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
              )}
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
