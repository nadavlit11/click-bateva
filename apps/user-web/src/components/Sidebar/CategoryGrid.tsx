import { CATEGORY_EMOJI } from "../../data/defaults";
import type { Category } from "../../types";
import { lighten, lightenBorder } from "../../lib/colorUtils";

interface CategoryGridProps {
  categories: Category[];
  selectedCategories: Set<string>;
  onToggle: (id: string) => void;
}

export function CategoryGrid({ categories, selectedCategories, onToggle }: CategoryGridProps) {
  return (
    <div className="px-4 pb-4">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">קטגוריות</h2>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => {
          const isSelected = selectedCategories.has(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onToggle(cat.id)}
              className="flex items-center gap-2 py-3 px-4 rounded-2xl border-2 transition-all hover:-translate-y-0.5 hover:shadow-md text-start"
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
