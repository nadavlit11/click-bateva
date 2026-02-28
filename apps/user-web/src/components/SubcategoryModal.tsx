import { useEffect } from "react";
import type { Category, Subcategory } from "../types";

interface SubcategoryModalProps {
  categoryId: string;
  categories: Category[];
  subcategories: Subcategory[];
  selectedSubcategories: Set<string>;
  onToggle: (id: string) => void;
  onClose: () => void;
}

export function SubcategoryModal({
  categoryId,
  categories,
  subcategories,
  selectedSubcategories,
  onToggle,
  onClose,
}: SubcategoryModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const category = categories.find(c => c.id === categoryId);
  if (!category) return null;

  const catSubs = subcategories.filter(s => s.categoryId === categoryId);
  if (catSubs.length === 0) return null;

  // Collect unique groups in stable order (null group last)
  const groupOrder: Array<string | null> = [];
  const seen = new Set<string | null>();
  for (const s of catSubs) {
    const g = s.group ?? null;
    if (!seen.has(g)) {
      seen.add(g);
      groupOrder.push(g);
    }
  }
  if (seen.has(null) && groupOrder[groupOrder.length - 1] !== null) {
    groupOrder.splice(groupOrder.indexOf(null), 1);
    groupOrder.push(null);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">{category.name}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto space-y-4">
            {groupOrder.map(group => {
              const groupSubs = catSubs.filter(s => (s.group ?? null) === group);
              return (
                <div key={group ?? "__null__"}>
                  {group && (
                    <p className="text-xs text-gray-400 mb-2 font-semibold">
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
                          className={`py-1.5 px-3 rounded-full text-sm border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-green-500 text-white border-green-500"
                              : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-green-50"
                          }`}
                        >
                          {sub.iconUrl && (
                            <img
                              src={sub.iconUrl}
                              alt=""
                              style={{ width: 14, height: 14, objectFit: "contain", flexShrink: 0 }}
                            />
                          )}
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
