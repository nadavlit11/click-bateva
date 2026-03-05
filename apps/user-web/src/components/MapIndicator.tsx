import type { MapKey } from "../hooks/useFirestoreData";

interface MapIndicatorProps {
  mapKey: MapKey;
  isAgent: boolean;
  onMapKeyChange?: (key: MapKey) => void;
}

const MAP_LABELS: Record<MapKey, string> = {
  groups: "קבוצות",
  agents: "סוכנים",
};

export function MapIndicator({ mapKey, isAgent, onMapKeyChange }: MapIndicatorProps) {
  if (!isAgent) {
    return (
      <div className="absolute bottom-[130px] md:bottom-4 start-4 z-10">
        <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md text-xs font-medium text-gray-600">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          מפת {MAP_LABELS[mapKey]}
        </span>
      </div>
    );
  }

  return (
    <div className="absolute md:bottom-4 bottom-[130px] start-4 z-10">
      <div className="inline-flex bg-white/90 backdrop-blur-sm rounded-full shadow-md p-0.5 text-xs font-medium">
        {(["groups", "agents"] as const).map((key) => (
          <button
            key={key}
            onClick={() => onMapKeyChange?.(key)}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              mapKey === key
                ? "bg-green-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {MAP_LABELS[key]}
          </button>
        ))}
      </div>
    </div>
  );
}
