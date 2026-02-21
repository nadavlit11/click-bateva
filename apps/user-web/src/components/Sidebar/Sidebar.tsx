import type { Category, Tag } from "../../types";
import { AppHeader } from "./AppHeader";
import { SearchBar } from "./SearchBar";
import { CategoryGrid } from "./CategoryGrid";
import { TagList } from "./TagList";
import { SidebarFooter } from "./SidebarFooter";

interface SidebarProps {
  categories: Category[];
  tags: Tag[];
  selectedCategories: Set<string>;
  selectedTags: Set<string>;
  searchQuery: string;
  filteredCount: number;
  onCategoryToggle: (id: string) => void;
  onTagToggle: (id: string) => void;
  onSearchChange: (q: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function Sidebar({
  categories,
  tags,
  selectedCategories,
  selectedTags,
  searchQuery,
  filteredCount,
  onCategoryToggle,
  onTagToggle,
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
        <CategoryGrid
          categories={categories}
          selectedCategories={selectedCategories}
          onToggle={onCategoryToggle}
        />
        <TagList tags={tags} selectedTags={selectedTags} onToggle={onTagToggle} />
      </div>
      <SidebarFooter count={filteredCount} onClearAll={onClearAll} />
    </aside>
  );
}
