import { CATEGORY_EMOJI } from "../../data/defaults";
import type { Category } from "../../types";

interface CategoryGridProps {
  categories: Category[];
  selectedCategories: Set<string>;
  onToggle: (id: string) => void;
}

// Maps a hex color to a light Tailwind-compatible bg/border for each chip.
// We inline a style for the icon bg so we can use the real category color.
function lighten(hex: string): string {
  // Convert hex to rgba with low opacity for the chip background
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.08)`;
}

function lightenBorder(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.25)`;
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
                outline: isSelected ? `2px solid ${cat.color}` : "none",
                outlineOffset: "2px",
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
