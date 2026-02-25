import type { Category } from "../../types";
import { AppHeader } from "./AppHeader";
import { CategoryGrid } from "./CategoryGrid";
import { SidebarFooter } from "./SidebarFooter";

interface SidebarProps {
  categories: Category[];
  selectedCategories: Set<string>;
  filteredCount: number;
  onCategoryToggle: (id: string) => void;
  onSubcategoryFilter: (categoryId: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  className?: string;
}

export function Sidebar({
  categories,
  selectedCategories,
  filteredCount,
  onCategoryToggle,
  onSubcategoryFilter,
  onClearAll,
  onClose,
  className,
}: SidebarProps) {
  return (
    <aside
      className={`w-80 h-full bg-white flex flex-col z-10 overflow-hidden shrink-0 ${className ?? ""}`}
      style={{ boxShadow: "4px 0 20px rgba(0,0,0,0.08)" }}
    >
      <div className="relative">
        <AppHeader />
        <button
          onClick={onClose}
          className="absolute top-4 end-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          title="סגור תפריט"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <CategoryGrid
          categories={categories}
          selectedCategories={selectedCategories}
          onToggle={onCategoryToggle}
          onSubcategoryFilter={onSubcategoryFilter}
        />
      </div>
      <SidebarFooter count={filteredCount} onClearAll={onClearAll} />
    </aside>
  );
}
