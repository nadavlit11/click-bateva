import { useState } from "react";
import type { Tag } from "../../types";

interface TagListProps {
  tags: Tag[];
  selectedTags: Set<string>;
  onToggle: (id: string) => void;
}

export function TagList({ tags, selectedTags, onToggle }: TagListProps) {
  const [focusedParentId, setFocusedParentId] = useState("");

  const locationTags = tags.filter(t => t.group === "location");
  if (locationTags.length === 0) return null;

  const parents = locationTags.filter(t => !t.parentId);
  const childrenOf = (id: string) => locationTags.filter(t => t.parentId === id);
  const focusedChildren = focusedParentId ? childrenOf(focusedParentId) : [];

  function handleRegionChange(newParentId: string) {
    // Deselect previous parent + its children
    if (focusedParentId) {
      if (selectedTags.has(focusedParentId)) onToggle(focusedParentId);
      childrenOf(focusedParentId).forEach(c => {
        if (selectedTags.has(c.id)) onToggle(c.id);
      });
    }
    // Select new parent
    if (newParentId && !selectedTags.has(newParentId)) onToggle(newParentId);
    setFocusedParentId(newParentId);
  }

  return (
    <div className="px-4 pb-4 space-y-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">אזור</h3>

      <select
        value={focusedParentId}
        onChange={e => handleRegionChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-green-500 cursor-pointer"
        dir="rtl"
      >
        <option value="">כל האזורים</option>
        {parents.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {focusedChildren.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {focusedChildren.map(child => {
            const isSelected = selectedTags.has(child.id);
            return (
              <button
                key={child.id}
                onClick={() => onToggle(child.id)}
                className={`py-1 px-2.5 rounded-full text-xs border transition-all ${
                  isSelected
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-green-50"
                }`}
              >
                {child.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
