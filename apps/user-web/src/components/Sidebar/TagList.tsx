import { useState } from "react";
import type { Tag } from "../../types";

interface TagListProps {
  tags: Tag[];
  selectedTags: Set<string>;
  onToggle: (id: string) => void;
}

export function TagList({ tags, selectedTags, onToggle }: TagListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Only show location tags
  const locationTags = tags.filter(t => t.group === "location");
  if (locationTags.length === 0) return null;

  const parents = locationTags.filter(t => !t.parentId);
  const childrenOf = (parentId: string) => locationTags.filter(t => t.parentId === parentId);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="px-4 pb-4 space-y-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">אזור</h3>
      {parents.map(parent => {
        const children = childrenOf(parent.id);
        const isExpanded = expanded.has(parent.id);
        const isSelected = selectedTags.has(parent.id);

        return (
          <div key={parent.id}>
            <div className="flex items-center gap-1">
              {children.length > 0 && (
                <button
                  onClick={() => toggleExpand(parent.id)}
                  className="text-gray-400 hover:text-gray-600 text-sm w-5 shrink-0 text-center"
                  aria-label={isExpanded ? "כווץ" : "הרחב"}
                >
                  {isExpanded ? "▾" : "▸"}
                </button>
              )}
              <button
                onClick={() => onToggle(parent.id)}
                className={`py-1.5 px-3 rounded-full text-sm border transition-all ${
                  isSelected
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-green-50"
                } ${children.length === 0 ? "mr-5" : ""}`}
              >
                {parent.name}
              </button>
            </div>
            {isExpanded && children.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1.5 mr-6">
                {children.map(child => {
                  const isChildSelected = selectedTags.has(child.id);
                  return (
                    <button
                      key={child.id}
                      onClick={() => onToggle(child.id)}
                      className={`py-1 px-2.5 rounded-full text-xs border transition-all ${
                        isChildSelected
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
      })}
    </div>
  );
}
