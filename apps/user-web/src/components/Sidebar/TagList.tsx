import type { Tag } from "../../types";

interface TagListProps {
  tags: Tag[];
  selectedTags: Set<string>;
  onToggle: (id: string) => void;
}

const GROUP_ORDER = ["location", "kashrut", "price", "audience", null] as const;

const GROUP_LABELS: Record<string, string> = {
  location: "אזור",
  kashrut:  "כשרות",
  price:    "מחיר",
  audience: "קהל יעד",
};

export function TagList({ tags, selectedTags, onToggle }: TagListProps) {
  const grouped = GROUP_ORDER
    .map(group => ({
      key: group ?? "general",
      label: group ? GROUP_LABELS[group] : "תגיות",
      tags: tags.filter(t => t.group === group),
    }))
    .filter(g => g.tags.length > 0);

  if (grouped.length === 0) return null;

  return (
    <div className="px-4 pb-4 space-y-4">
      {grouped.map(({ key, label, tags: groupTags }) => (
        <div key={key}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            {label}
          </h3>
          <div className="flex flex-wrap gap-2">
            {groupTags.map(tag => {
              const isSelected = selectedTags.has(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggle(tag.id)}
                  className={`py-1.5 px-3 rounded-full text-sm border transition-all ${
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
      ))}
    </div>
  );
}
