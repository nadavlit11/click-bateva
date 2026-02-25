import { useRef, useState, useEffect } from "react";
import type { Category, Subcategory } from "../../types";
import { CATEGORY_EMOJI } from "../../data/defaults";
import { lighten, lightenBorder } from "../../lib/colorUtils";
import { CategoryGrid } from "../Sidebar/CategoryGrid";
import { SidebarFooter } from "../Sidebar/SidebarFooter";

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
  className?: string;
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
  className,
}: BottomSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight > el.clientHeight + el.scrollTop + 16);
  }

  // Re-check whenever the sheet opens or content changes
  useEffect(() => {
    if (expanded) {
      // Wait one frame for layout to settle
      const id = requestAnimationFrame(checkScroll);
      return () => cancelAnimationFrame(id);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to false when collapsed (no cascading render)
      setCanScrollDown(false);
    }
  // Sets have new identity on every toggle (new Set(prev)), so this fires on each selection change — intended.
  }, [expanded, selectedCategories, selectedSubcategories]);

  const sheetStyle: React.CSSProperties = {
    transform: expanded ? "translateY(0)" : "translateY(calc(100% - 120px))",
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
            </div>

            {/* Result count */}
            <div className="px-4 pt-1 text-sm text-gray-400 text-right">
              {filteredCount} מקומות
            </div>
          </div>
        )}
      </div>
    </>
  );
}
