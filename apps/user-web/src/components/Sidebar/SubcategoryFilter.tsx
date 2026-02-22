import { useState } from "react";
import type { Category, Subcategory } from "../../types";

interface SubcategoryFilterProps {
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategories: Set<string>;
  selectedSubcategories: Set<string>;
  onToggle: (id: string) => void;
}

export function SubcategoryFilter({
  categories,
  subcategories,
  selectedCategories,
  selectedSubcategories,
  onToggle,
}: SubcategoryFilterProps) {
  // Tracks user overrides: when 1 cat selected → default open (override = collapse); when multiple → default closed (override = expand)
  const [override, setOverride] = useState<Set<string>>(new Set());

  const activeCats = categories.filter(
    c => selectedCategories.has(c.id) && subcategories.some(s => s.categoryId === c.id)
  );

  if (activeCats.length === 0) {
    return (
      <div className="px-4 pb-3">
        <p className="text-xs text-gray-400 text-right">בחר קטגוריה לסינון מפורט</p>
      </div>
    );
  }

  const defaultOpen = activeCats.length === 1;

  function toggleExpanded(catId: string) {
    setOverride(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  }

  return (
    <div className="px-4 pb-4 space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        סינון מפורט
      </h3>
      {activeCats.map(cat => {
        const catSubs = subcategories.filter(s => s.categoryId === cat.id);
        const isExpanded = defaultOpen ? !override.has(cat.id) : override.has(cat.id);

        // Collect unique groups in stable order (grouped null last)
        const groupOrder: Array<string | null> = [];
        const seen = new Set<string | null>();
        for (const s of catSubs) {
          const g = s.group ?? null;
          if (!seen.has(g)) { seen.add(g); groupOrder.push(g); }
        }
        if (seen.has(null) && groupOrder[groupOrder.length - 1] !== null) {
          groupOrder.splice(groupOrder.indexOf(null), 1);
          groupOrder.push(null);
        }

        return (
          <div key={cat.id}>
            <button
              onClick={() => toggleExpanded(cat.id)}
              className="flex items-center gap-1 text-sm font-semibold text-gray-700 mb-2 w-full text-right"
            >
              <span className="text-gray-400 text-xs">{isExpanded ? "▾" : "◂"}</span>
              {cat.name}
            </button>
            {isExpanded && (
              <div className="space-y-2 mr-3">
                {groupOrder.map(group => {
                  const groupSubs = catSubs.filter(s => (s.group ?? null) === group);
                  return (
                    <div key={group ?? "__null__"}>
                      {group && (
                        <p className="text-xs text-gray-400 mb-1">
                          {group}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {groupSubs.map(sub => {
                          const isSelected = selectedSubcategories.has(sub.id);
                          return (
                            <button
                              key={sub.id}
                              onClick={() => onToggle(sub.id)}
                              className={`py-1.5 px-3 rounded-full text-sm border transition-all ${
                                isSelected
                                  ? "bg-green-500 text-white border-green-500"
                                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-green-50"
                              }`}
                            >
                              {sub.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
