import type { Category, Subcategory } from "../../types";
import { AppHeader } from "./AppHeader";
import { CategoryGrid } from "./CategoryGrid";
import { SidebarFooter } from "./SidebarFooter";

interface SidebarProps {
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategories: Set<string>;
  filteredCount: number;
  onCategoryToggle: (id: string) => void;
  onSubcategoryFilter: (categoryId: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  className?: string;
}

export function Sidebar({
  categories,
  subcategories,
  selectedCategories,
  filteredCount,
  onCategoryToggle,
  onSubcategoryFilter,
  onClearAll,
  onClose,
  isLoggedIn,
  onLoginClick,
  onLogout,
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
          subcategories={subcategories}
          selectedCategories={selectedCategories}
          onToggle={onCategoryToggle}
          onSubcategoryFilter={onSubcategoryFilter}
        />
      </div>
      <SidebarFooter count={filteredCount} onClearAll={onClearAll} />
      <div className="px-4 py-3 border-t border-gray-100">
        {isLoggedIn ? (
          <button
            onClick={onLogout}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            התנתקות
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            className="w-full text-sm text-green-600 hover:text-green-800 font-medium py-1.5 rounded-lg hover:bg-green-50 transition-colors"
          >
            כניסת סוכנים
          </button>
        )}
      </div>
    </aside>
  );
}
