import type { MapKey } from "../../hooks/useFirestoreData";
import { MAP_LABELS } from "../../lib/constants";

interface MapIndicatorProps {
  mapKey: MapKey;
  isAgent: boolean;
  onMapKeyChange: (key: MapKey) => void;
}

export function MapIndicator({ mapKey, isAgent, onMapKeyChange }: MapIndicatorProps) {
  const keys: MapKey[] = isAgent
    ? ["groups", "agents", "families"]
    : ["groups", "families"];

  return (
    <div className="absolute bottom-[68px] start-14 z-10 md:hidden">
      <div className="inline-flex bg-white/90 backdrop-blur-sm rounded-full shadow-md p-0.5 text-xs font-medium">
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => onMapKeyChange(key)}
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
