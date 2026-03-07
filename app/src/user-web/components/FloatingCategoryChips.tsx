import type { Category } from "../../types";
import { CATEGORY_EMOJI } from "../data/defaults";
import { lighten, lightenBorder } from "../../lib/colorUtils";

interface FloatingCategoryChipsProps {
  categories: Category[];
  selectedCategories: Set<string>;
  onCategoryToggle: (id: string) => void;
  tripCount: number;
  onTripChipClick: () => void;
}

export function FloatingCategoryChips({
  categories,
  selectedCategories,
  onCategoryToggle,
  tripCount,
  onTripChipClick,
}: FloatingCategoryChipsProps) {
  return (
    <div className="md:hidden absolute bottom-4 left-0 right-0 z-10">
      <div
        className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-none"
      >
        {categories.map((cat) => {
          const isSelected = selectedCategories.has(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryToggle(cat.id)}
              className={
                "flex items-center gap-1.5 py-1.5 px-3 rounded-full"
                + " border-2 transition-all shrink-0 text-sm"
                + " bg-white/80 backdrop-blur-sm shadow-sm"
              }
              style={{
                backgroundColor: isSelected
                  ? lighten(cat.color)
                  : "rgba(255,255,255,0.85)",
                borderColor: isSelected
                  ? cat.color
                  : lightenBorder(cat.color),
                outline: isSelected
                  ? `2px solid ${cat.color}`
                  : "none",
                outlineOffset: "2px",
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
