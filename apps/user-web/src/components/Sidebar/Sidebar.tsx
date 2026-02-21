import type { Category, Tag, Subcategory } from "../../types";
import { AppHeader } from "./AppHeader";
import { SearchBar } from "./SearchBar";
import { CategoryGrid } from "./CategoryGrid";
import { TagList } from "./TagList";
import { SubcategoryFilter } from "./SubcategoryFilter";
import { SidebarFooter } from "./SidebarFooter";

interface SidebarProps {
  categories: Category[];
  tags: Tag[];
  subcategories: Subcategory[];
  selectedCategories: Set<string>;
  selectedTags: Set<string>;
  selectedSubcategories: Set<string>;
  searchQuery: string;
  filteredCount: number;
  onCategoryToggle: (id: string) => void;
  onTagToggle: (id: string) => void;
  onSubcategoryToggle: (id: string) => void;
  onSearchChange: (q: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function Sidebar({
  categories,
  tags,
  subcategories,
  selectedCategories,
  selectedTags,
  selectedSubcategories,
  searchQuery,
  filteredCount,
  onCategoryToggle,
  onTagToggle,
  onSubcategoryToggle,
  onSearchChange,
  onClearAll,
  className,
}: SidebarProps) {
  return (
    <aside
      className={`w-80 h-full bg-white flex flex-col z-10 overflow-hidden shrink-0 ${className ?? ""}`}
      style={{ boxShadow: "4px 0 20px rgba(0,0,0,0.08)" }}
    >
      <AppHeader />
      <div className="flex-1 overflow-y-auto">
        <SearchBar value={searchQuery} onChange={onSearchChange} />
        <TagList tags={tags} selectedTags={selectedTags} onToggle={onTagToggle} />
        <CategoryGrid
          categories={categories}
          selectedCategories={selectedCategories}
          onToggle={onCategoryToggle}
        />
        <SubcategoryFilter
          categories={categories}
          subcategories={subcategories}
          selectedCategories={selectedCategories}
          selectedSubcategories={selectedSubcategories}
          onToggle={onSubcategoryToggle}
        />
      </div>
      <SidebarFooter count={filteredCount} onClearAll={onClearAll} />
    </aside>
  );
}
