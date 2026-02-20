import type { Tag } from "../../types";

interface TagListProps {
  tags: Tag[];
  selectedTags: Set<string>;
  onToggle: (id: string) => void;
}

export function TagList({ tags, selectedTags, onToggle }: TagListProps) {
  return (
    <div className="px-4 pb-4 flex-1 overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">תגיות</h2>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTags.has(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => onToggle(tag.id)}
              className={`py-2 px-4 rounded-full text-sm border transition-all ${
                isSelected
                  ? "bg-green-500 text-white border-green-500"
                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-green-50"
              }`}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
