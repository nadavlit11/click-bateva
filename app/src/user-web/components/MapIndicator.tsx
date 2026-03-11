import type { MapKey } from "../../hooks/useFirestoreData";
import { MAP_LABELS } from "../../lib/constants";

interface MapIndicatorProps {
  mapKey: MapKey;
  canSeeAgents: boolean;
  onMapKeyChange: (key: MapKey) => void;
}

export function MapIndicator({ mapKey, canSeeAgents, onMapKeyChange }: MapIndicatorProps) {
  const keys: MapKey[] = canSeeAgents
    ? ["agents", "groups", "families"]
    : ["groups", "families"];

  return (
    <div className="absolute bottom-[68px] start-14 z-10 md:hidden">
      <div className="inline-flex bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-1 text-sm font-semibold gap-1">
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => onMapKeyChange(key)}
            className={`px-5 py-2.5 rounded-xl transition-all ${
              mapKey === key
                ? "bg-green-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {MAP_LABELS[key]}
          </button>
        ))}
      </div>
    </div>
  );
}
